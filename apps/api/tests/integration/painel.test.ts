import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EVENTOS } from '../../src/realtime/eventos';
import type { StatusAtualizadoEvento } from '../../src/realtime/publicador';
import {
  criarAppDeTeste,
  criarBairro,
  criarDenunciaNoBanco,
  entrarComoOperador,
  limparBanco,
  prisma,
  registrarCidadao,
} from '../helpers/banco';
import {
  aguardar,
  doTipo,
  gravarEventos,
  iniciarServidorDeTeste,
  pausa,
  type Payload,
} from '../helpers/tempo-real';

const statusAtualizado = vi.fn(async (_evento: StatusAtualizadoEvento) => undefined);
const app = criarAppDeTeste({}, { publicador: { denunciaCriada: vi.fn(), statusAtualizado } });

let bairro: Awaited<ReturnType<typeof criarBairro>>;

beforeEach(async () => {
  await limparBanco();
  bairro = await criarBairro();
  statusAtualizado.mockClear();
});
afterAll(() => prisma.$disconnect());

const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
const emMinutos = (minutos: number) => new Date(Date.now() + minutos * 60_000);

async function abrirDenuncia(token: string, extra: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/v1/denuncias')
    .set(comToken(token))
    .send({
      tipo: 'SEM_ENERGIA',
      bairroId: bairro.id,
      logradouro: 'Av. VP-3, Folha 28',
      ...extra,
    });
  if (res.status !== 201) throw new Error(`Falha ao abrir denúncia: ${JSON.stringify(res.body)}`);
  return res.body as { id: string; protocolo: string };
}

const listar = (token: string, consulta = '') =>
  request(app).get(`/api/v1/painel/denuncias${consulta}`).set(comToken(token));
const detalhe = (token: string, id: string) =>
  request(app).get(`/api/v1/painel/denuncias/${id}`).set(comToken(token));
const mudar = (token: string, id: string, corpo: Record<string, unknown>) =>
  request(app).patch(`/api/v1/painel/denuncias/${id}/status`).set(comToken(token)).send(corpo);

describe('acesso ao painel (RN-001, RF-026)', () => {
  it('sem token: 401 em todas as rotas', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    expect((await request(app).get('/api/v1/painel/denuncias')).status).toBe(401);
    expect((await request(app).get(`/api/v1/painel/denuncias/${id}`)).status).toBe(401);
    expect(
      (await request(app).patch(`/api/v1/painel/denuncias/${id}/status`).send({})).status,
    ).toBe(401);
  });

  it('cidadão: 403 em todas as rotas, sem vazar nada', async () => {
    const maria = await registrarCidadao(app);
    const criada = await abrirDenuncia(maria.token);

    for (const res of [
      await listar(maria.token),
      await detalhe(maria.token, criada.id),
      await mudar(maria.token, criada.id, { status: 'EM_ATENDIMENTO' }),
    ]) {
      expect(res.status).toBe(403);
      expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
    }
    expect((await prisma.denuncia.findUniqueOrThrow({ where: { id: criada.id } })).status).toBe(
      'RECEBIDA',
    );
  });
});

describe('GET /api/v1/painel/denuncias (RF-028, RF-029, RF-035)', () => {
  it('lista vazia quando não há denúncias', async () => {
    const operador = await entrarComoOperador(app);
    const res = await listar(operador.token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itens: [], pagina: 1, total: 0 });
  });

  it('cada item traz o resumo para a tabela e o mapa, sem dados do autor', async () => {
    const operador = await entrarComoOperador(app);
    const maria = await registrarCidadao(app, { nome: 'Maria Silva', telefone: '(94) 90000-0000' });
    const criada = await abrirDenuncia(maria.token, {
      latitude: -5.3712,
      longitude: -49.1231,
      necessidadeEspecial: true,
      consentimentoNecessidade: true,
    });

    const res = await listar(operador.token);

    expect(res.body.itens).toEqual([
      {
        id: criada.id,
        protocolo: criada.protocolo,
        prioritaria: true,
        tipo: 'SEM_ENERGIA',
        status: 'RECEBIDA',
        bairro: { id: bairro.id, nome: 'Nova Marabá', folha: 'Folha 28' },
        logradouro: 'Av. VP-3, Folha 28',
        latitude: -5.3712,
        longitude: -49.1231,
        previsaoReparo: null,
        criadoEm: expect.any(String),
      },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/Maria Silva|90000-0000|oxigênio|autor/);
  });

  it('ordena as prioritárias primeiro e, em cada grupo, a mais antiga primeiro (RN-015)', async () => {
    const operador = await entrarComoOperador(app);
    const em = (minuto: number) => new Date(Date.UTC(2026, 0, 1, 0, minuto));
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      logradouro: 'A comum antiga',
      criadoEm: em(0),
    });
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      logradouro: 'B comum nova',
      criadoEm: em(10),
    });
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      logradouro: 'C prioritária nova',
      necessidadeEspecial: true,
      criadoEm: em(20),
    });
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      logradouro: 'D prioritária antiga',
      necessidadeEspecial: true,
      criadoEm: em(5),
    });

    const res = await listar(operador.token);

    expect(res.body.itens.map((i: Payload) => i.logradouro)).toEqual([
      'D prioritária antiga',
      'C prioritária nova',
      'A comum antiga',
      'B comum nova',
    ]);
  });

  describe('filtros', () => {
    let outroBairro: Awaited<ReturnType<typeof criarBairro>>;
    let token: string;

    beforeEach(async () => {
      outroBairro = await criarBairro({ nome: 'Cidade Nova', folha: null });
      token = (await entrarComoOperador(app)).token;
      const nova = (logradouro: string, dados: Parameters<typeof criarDenunciaNoBanco>[0]) =>
        criarDenunciaNoBanco({ ...dados, logradouro });
      await nova('1 sem energia recebida', { bairroId: bairro.id });
      await nova('2 oscilação recebida', {
        bairroId: bairro.id,
        tipo: 'OSCILACAO',
        necessidadeEspecial: false, // "Não" explícito: conta como comum, igual à sem resposta
      });
      await nova('3 sem energia em atendimento prioritária', {
        bairroId: outroBairro.id,
        status: 'EM_ATENDIMENTO',
        necessidadeEspecial: true,
      });
      await nova('4 sem energia resolvida', { bairroId: outroBairro.id, status: 'RESOLVIDA' });
      // Era prioritária, mas foi cancelada: a resposta foi apagada (RN-026).
      await nova('5 oscilação cancelada', {
        bairroId: bairro.id,
        tipo: 'OSCILACAO',
        status: 'CANCELADA',
        necessidadeEspecial: true,
      });
    });

    const ruas = async (consulta: string) => {
      const res = await listar(token, consulta);
      expect(res.status).toBe(200);
      return (res.body.itens as Payload[]).map((i) => String(i.logradouro).charAt(0)).sort();
    };

    it('sem filtro, traz todas', async () => {
      expect(await ruas('')).toEqual(['1', '2', '3', '4', '5']);
    });

    it('por status (um)', async () => {
      expect(await ruas('?status=RECEBIDA')).toEqual(['1', '2']);
      expect(await ruas('?status=RESOLVIDA')).toEqual(['4']);
    });

    it('por vários status, separados por vírgula ou repetidos', async () => {
      expect(await ruas('?status=RECEBIDA,EM_ATENDIMENTO')).toEqual(['1', '2', '3']);
      expect(await ruas('?status=RECEBIDA&status=CANCELADA')).toEqual(['1', '2', '5']);
    });

    it('por tipo', async () => {
      expect(await ruas('?tipo=OSCILACAO')).toEqual(['2', '5']);
    });

    it('por bairro', async () => {
      expect(await ruas(`?bairroId=${outroBairro.id}`)).toEqual(['3', '4']);
    });

    it('só as prioritárias, ou só as comuns', async () => {
      expect(await ruas('?prioritarias=true')).toEqual(['3']);
      // Comuns = "Não" (2) ou sem resposta (1, 4) ou resposta apagada ao encerrar (5).
      expect(await ruas('?prioritarias=false')).toEqual(['1', '2', '4', '5']);
    });

    it('combinando os filtros (status + tipo + bairro)', async () => {
      expect(
        await ruas(`?status=RECEBIDA,EM_ATENDIMENTO&tipo=SEM_ENERGIA&bairroId=${bairro.id}`),
      ).toEqual(['1']);
      expect(await ruas(`?tipo=OSCILACAO&bairroId=${outroBairro.id}`)).toEqual([]);
    });

    it('parâmetros em branco são ignorados', async () => {
      expect(await ruas('?status=&tipo=&bairroId=&prioritarias=')).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
      ]);
    });

    it('o total respeita os filtros, não só a página', async () => {
      const res = await listar(token, '?status=RECEBIDA,EM_ATENDIMENTO&limite=1');

      expect(res.body.itens).toHaveLength(1);
      expect(res.body.total).toBe(3);
    });
  });

  it('pagina os resultados mantendo a ordem', async () => {
    const operador = await entrarComoOperador(app);
    for (let i = 0; i < 5; i++) {
      await criarDenunciaNoBanco({
        bairroId: bairro.id,
        logradouro: `Rua ${i}`,
        criadoEm: new Date(Date.UTC(2026, 0, 1, 0, i)),
      });
    }

    const p1 = await listar(operador.token, '?limite=2&page=1');
    const p3 = await listar(operador.token, '?limite=2&page=3');

    expect(p1.body.itens.map((i: Payload) => i.logradouro)).toEqual(['Rua 0', 'Rua 1']);
    expect(p3.body.itens.map((i: Payload) => i.logradouro)).toEqual(['Rua 4']);
    expect(p3.body).toMatchObject({ pagina: 3, total: 5 });
  });

  it.each([
    ['status inexistente', '?status=XYZ'],
    ['um status bom e um ruim', '?status=RECEBIDA,XYZ'],
    ['tipo inexistente', '?tipo=APAGAO'],
    ['bairro que não é número', '?bairroId=abc'],
    ['bairro zero', '?bairroId=0'],
    ['prioritárias que não é true/false', '?prioritarias=talvez'],
    ['limite acima de 100', '?limite=101'],
    ['limite zero', '?limite=0'],
    ['página zero', '?page=0'],
  ])('recusa %s com 400', async (_nome, consulta) => {
    const operador = await entrarComoOperador(app);
    const res = await listar(operador.token, consulta);

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
  });
});

describe('GET /api/v1/painel/denuncias/:id (RF-030, RN-014)', () => {
  it('mostra tudo: autor, telefone, local, necessidade e o histórico com quem alterou', async () => {
    const operador = await entrarComoOperador(app);
    const maria = await registrarCidadao(app, { nome: 'Maria Silva', telefone: '(94) 90000-0000' });
    const criada = await abrirDenuncia(maria.token, {
      cep: '68500-000',
      pontoReferencia: 'Perto da rotatória',
      descricao: 'Estalo forte no poste',
      latitude: -5.3712,
      longitude: -49.1231,
      faixaPessoas: 'DE_4_A_8',
      necessidadeEspecial: true,
      consentimentoNecessidade: true,
    });
    await mudar(operador.token, criada.id, { status: 'EM_ATENDIMENTO' });

    const res = await detalhe(operador.token, criada.id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: criada.id,
      protocolo: criada.protocolo,
      prioritaria: true,
      tipo: 'SEM_ENERGIA',
      status: 'EM_ATENDIMENTO',
      autor: { id: maria.id, nome: 'Maria Silva', telefone: '(94) 90000-0000' },
      logradouro: 'Av. VP-3, Folha 28',
      cep: '68500-000',
      pontoReferencia: 'Perto da rotatória',
      bairro: { id: bairro.id, nome: 'Nova Marabá', folha: 'Folha 28' },
      descricao: 'Estalo forte no poste',
      latitude: -5.3712,
      longitude: -49.1231,
      faixaPessoas: 'DE_4_A_8',
      necessidadeEspecial: true,
      consentimentoNecessidadeEm: expect.any(String),
      previsaoReparo: null,
      justificativa: null,
      fotos: [],
      finalizadaEm: null,
    });
    expect(res.body.historico).toEqual([
      expect.objectContaining({
        statusAnterior: null,
        statusNovo: 'RECEBIDA',
        papel: 'CIDADAO',
        por: expect.any(String),
      }),
      expect.objectContaining({
        statusAnterior: 'RECEBIDA',
        statusNovo: 'EM_ATENDIMENTO',
        papel: 'OPERADOR',
        por: 'Operador de Teste',
      }),
    ]);
  });

  it('denúncia sem autor (conta excluída): autor nulo', async () => {
    const operador = await entrarComoOperador(app);
    const anonima = await criarDenunciaNoBanco({ bairroId: bairro.id, autorId: null });

    const res = await detalhe(operador.token, anonima.id);

    expect(res.status).toBe(200);
    expect(res.body.autor).toBeNull();
  });

  it.each([
    ['id que não existe', '00000000-0000-4000-8000-000000000000'],
    ['id que não é UUID', 'abc'],
  ])('%s: 404', async (_nome, id) => {
    const operador = await entrarComoOperador(app);
    const res = await detalhe(operador.token, id);

    expect(res.status).toBe(404);
    expect(res.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});

describe('PATCH /api/v1/painel/denuncias/:id/status (RF-031, RF-032, RF-033, RF-036)', () => {
  let operador: Awaited<ReturnType<typeof entrarComoOperador>>;
  let maria: Awaited<ReturnType<typeof registrarCidadao>>;
  let id: string;

  beforeEach(async () => {
    operador = await entrarComoOperador(app);
    maria = await registrarCidadao(app);
    id = (await abrirDenuncia(maria.token)).id;
  });

  const noBanco = () =>
    prisma.denuncia.findUniqueOrThrow({ where: { id }, include: { historico: true } });

  describe('transições válidas', () => {
    it('RECEBIDA -> EM_ATENDIMENTO: devolve o detalhe e grava o histórico (RN-011)', async () => {
      const res = await mudar(operador.token, id, { status: 'EM_ATENDIMENTO' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('EM_ATENDIMENTO');
      expect(res.body.historico).toHaveLength(2);
      const gravada = await noBanco();
      expect(gravada.status).toBe('EM_ATENDIMENTO');
      expect(gravada.finalizadaEm).toBeNull();
      const ultimo = gravada.historico.find((h) => h.statusNovo === 'EM_ATENDIMENTO')!;
      expect(ultimo).toMatchObject({
        statusAnterior: 'RECEBIDA',
        alteradoPorId: operador.id,
        papelAutor: 'OPERADOR',
        justificativa: null,
      });
    });

    it('EM_ATENDIMENTO -> RESOLVIDA: marca a data de finalização', async () => {
      await mudar(operador.token, id, { status: 'EM_ATENDIMENTO' });
      const res = await mudar(operador.token, id, { status: 'RESOLVIDA' });

      expect(res.status).toBe(200);
      expect(res.body.finalizadaEm).toEqual(expect.any(String));
      expect((await noBanco()).finalizadaEm).toBeInstanceOf(Date);
    });

    it('RECEBIDA -> IMPROCEDENTE com justificativa: guarda a justificativa na denúncia e no histórico', async () => {
      const res = await mudar(operador.token, id, {
        status: 'IMPROCEDENTE',
        justificativa: '  Local sem interrupção confirmada pela equipe.  ',
      });

      expect(res.status).toBe(200);
      const gravada = await noBanco();
      expect(gravada).toMatchObject({
        status: 'IMPROCEDENTE',
        justificativa: 'Local sem interrupção confirmada pela equipe.',
      });
      expect(gravada.finalizadaEm).toBeInstanceOf(Date);
      expect(gravada.historico.at(-1)!.justificativa).toBe(
        'Local sem interrupção confirmada pela equipe.',
      );
    });

    it('EM_ATENDIMENTO -> IMPROCEDENTE também é permitido', async () => {
      await mudar(operador.token, id, { status: 'EM_ATENDIMENTO' });
      const res = await mudar(operador.token, id, {
        status: 'IMPROCEDENTE',
        justificativa: 'A equipe não encontrou falha na rede.',
      });

      expect(res.status).toBe(200);
    });

    it('a justificativa só vale para IMPROCEDENTE: nos outros status é descartada', async () => {
      await mudar(operador.token, id, {
        status: 'EM_ATENDIMENTO',
        justificativa: 'texto que não deveria ficar',
      });

      const gravada = await noBanco();
      expect(gravada.justificativa).toBeNull();
      expect(gravada.historico.every((h) => h.justificativa === null)).toBe(true);
    });

    it('descarta campos que o operador não pode mudar por aqui', async () => {
      const outro = await registrarCidadao(app);
      await mudar(operador.token, id, {
        status: 'EM_ATENDIMENTO',
        autorId: outro.id,
        protocolo: 'TL-1999-000001',
        necessidadeEspecial: true,
      });

      const gravada = await noBanco();
      expect(gravada.autorId).toBe(maria.id);
      expect(gravada.protocolo).not.toBe('TL-1999-000001');
      expect(gravada.necessidadeEspecial).toBeNull();
    });
  });

  describe('previsão de reparo (RN-009, S-39)', () => {
    it('é guardada junto com a mudança de status e devolvida', async () => {
      const previsao = emMinutos(80);
      const res = await mudar(operador.token, id, {
        status: 'EM_ATENDIMENTO',
        previsaoReparo: previsao.toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body.previsaoReparo).toBe(previsao.toISOString());
      expect((await noBanco()).previsaoReparo?.toISOString()).toBe(previsao.toISOString());
    });

    it('aceita data com fuso (offset)', async () => {
      const res = await mudar(operador.token, id, {
        status: 'EM_ATENDIMENTO',
        previsaoReparo: '2099-01-01T10:00:00-03:00',
      });

      expect(res.status).toBe(200);
      expect(res.body.previsaoReparo).toBe('2099-01-01T13:00:00.000Z');
    });

    it('data no passado: 422 PREVISAO_NO_PASSADO e nada muda', async () => {
      const res = await mudar(operador.token, id, {
        status: 'EM_ATENDIMENTO',
        previsaoReparo: emMinutos(-5).toISOString(),
      });

      expect(res.status).toBe(422);
      expect(res.body.erro.codigo).toBe('PREVISAO_NO_PASSADO');
      const gravada = await noBanco();
      expect(gravada.status).toBe('RECEBIDA');
      expect(gravada.historico).toHaveLength(1);
    });

    it.each(['amanhã', '2099-13-45', '10/12/2099'])(
      'texto que não é data (%s): 400',
      async (texto) => {
        const res = await mudar(operador.token, id, {
          status: 'EM_ATENDIMENTO',
          previsaoReparo: texto,
        });

        expect(res.status).toBe(400);
        expect(res.body.erro.detalhes.map((d: Payload) => d.campo)).toContain('previsaoReparo');
      },
    );

    it('não vale para um status final: 400', async () => {
      await mudar(operador.token, id, { status: 'EM_ATENDIMENTO' });
      const res = await mudar(operador.token, id, {
        status: 'RESOLVIDA',
        previsaoReparo: emMinutos(30).toISOString(),
      });

      expect(res.status).toBe(400);
      expect(res.body.erro.detalhes[0]).toMatchObject({ campo: 'previsaoReparo' });
      expect((await noBanco()).status).toBe('EM_ATENDIMENTO');
    });
  });

  describe('justificativa de improcedência (RN-010)', () => {
    it.each([
      ['ausente', {}],
      ['vazia', { justificativa: '' }],
      ['só espaços', { justificativa: '          ' }],
      ['com 9 caracteres', { justificativa: 'abcdefghi' }],
      ['com 501 caracteres', { justificativa: 'a'.repeat(501) }],
    ])('recusa justificativa %s com 422 e não altera nada', async (_nome, extra) => {
      const res = await mudar(operador.token, id, { status: 'IMPROCEDENTE', ...extra });

      expect(res.status).toBe(422);
      expect(res.body.erro.codigo).toBe('JUSTIFICATIVA_OBRIGATORIA');
      const gravada = await noBanco();
      expect(gravada.status).toBe('RECEBIDA');
      expect(gravada.historico).toHaveLength(1);
    });
  });

  describe('transições inválidas (RN-004)', () => {
    it.each([
      ['RECEBIDA -> RESOLVIDA (só em lote)', 'RECEBIDA', 'RESOLVIDA'],
      ['EM_ATENDIMENTO -> RECEBIDA', 'EM_ATENDIMENTO', 'RECEBIDA'],
      ['RECEBIDA -> RECEBIDA (mesmo status)', 'RECEBIDA', 'RECEBIDA'],
      ['RESOLVIDA -> EM_ATENDIMENTO (estado final)', 'RESOLVIDA', 'EM_ATENDIMENTO'],
      ['IMPROCEDENTE -> RESOLVIDA (estado final)', 'IMPROCEDENTE', 'RESOLVIDA'],
      ['CANCELADA -> EM_ATENDIMENTO (estado final)', 'CANCELADA', 'EM_ATENDIMENTO'],
    ] as const)('%s: 422 TRANSICAO_INVALIDA', async (_nome, de, para) => {
      await prisma.denuncia.update({
        where: { id },
        data: {
          status: de,
          ...(de === 'IMPROCEDENTE' ? { justificativa: 'Sem falha na rede.' } : {}),
        },
      });

      const res = await mudar(operador.token, id, {
        status: para,
        justificativa: 'Justificativa com mais de dez caracteres.',
      });

      expect(res.status).toBe(422);
      expect(res.body.erro.codigo).toBe('TRANSICAO_INVALIDA');
      expect((await noBanco()).status).toBe(de);
    });

    it('o operador não cancela pelo autor: 403', async () => {
      const res = await mudar(operador.token, id, { status: 'CANCELADA' });

      expect(res.status).toBe(403);
      expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
      expect((await noBanco()).status).toBe('RECEBIDA');
    });

    it('se o autor cancelou no meio tempo, o operador recebe 422 (conflito, S-29)', async () => {
      await prisma.denuncia.update({ where: { id }, data: { status: 'CANCELADA' } });

      const res = await mudar(operador.token, id, { status: 'EM_ATENDIMENTO' });

      expect(res.status).toBe(422);
      expect(res.body.erro.codigo).toBe('TRANSICAO_INVALIDA');
    });
  });

  describe('validação e acesso', () => {
    it.each([
      ['sem status', {}],
      ['status inexistente', { status: 'APAGADA' }],
      ['status vazio', { status: '' }],
    ])('recusa %s com 400', async (_nome, corpo) => {
      const res = await mudar(operador.token, id, corpo);

      expect(res.status).toBe(400);
      expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
      expect(res.body.erro.detalhes[0]).toMatchObject({ campo: 'status' });
    });

    it.each([
      ['inexistente', '00000000-0000-4000-8000-000000000000'],
      ['que não é UUID', 'abc'],
    ])('denúncia %s: 404', async (_nome, outroId) => {
      const res = await mudar(operador.token, outroId, { status: 'EM_ATENDIMENTO' });

      expect(res.status).toBe(404);
    });
  });

  describe('atomicidade e concorrência (RNF-010)', () => {
    it('se gravar o histórico falhar, o status NÃO muda (tudo ou nada)', async () => {
      const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION falha_simulada() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'falha simulada ao gravar o histórico'; END $$ LANGUAGE plpgsql`);
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER falha_simulada_historico BEFORE INSERT ON "HistoricoStatus"
        FOR EACH ROW WHEN (NEW."statusNovo" = 'EM_ATENDIMENTO') EXECUTE FUNCTION falha_simulada()`);

      try {
        const res = await mudar(operador.token, id, { status: 'EM_ATENDIMENTO' });

        expect(res.status).toBe(500);
        const gravada = await noBanco();
        expect(gravada.status).toBe('RECEBIDA'); // a mudança de status foi desfeita
        expect(gravada.historico).toHaveLength(1);
        expect(statusAtualizado).not.toHaveBeenCalled();
      } finally {
        await prisma.$executeRawUnsafe(
          'DROP TRIGGER IF EXISTS falha_simulada_historico ON "HistoricoStatus"',
        );
        await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS falha_simulada()');
        erroNoConsole.mockRestore();
      }
    });

    it('seis requisições iguais ao mesmo tempo: só uma vence', async () => {
      const improcedente = () =>
        mudar(operador.token, id, {
          status: 'IMPROCEDENTE',
          justificativa: 'Equipe não encontrou falha na rede.',
        });

      const respostas = await Promise.all(Array.from({ length: 6 }, improcedente));

      expect(respostas.filter((r) => r.status === 200)).toHaveLength(1);
      expect(respostas.filter((r) => r.status === 422)).toHaveLength(5);
      const gravada = await noBanco();
      expect(gravada.status).toBe('IMPROCEDENTE');
      expect(gravada.historico).toHaveLength(2); // criação + a única mudança que valeu
      expect(statusAtualizado).toHaveBeenCalledTimes(1);
    });

    it('destinos diferentes ao mesmo tempo: o histórico fica coerente (cada estado é deixado uma vez)', async () => {
      const emAtendimento = () => mudar(operador.token, id, { status: 'EM_ATENDIMENTO' });
      const improcedente = () =>
        mudar(operador.token, id, {
          status: 'IMPROCEDENTE',
          justificativa: 'Equipe não encontrou falha na rede.',
        });

      const respostas = await Promise.all([
        emAtendimento(),
        improcedente(),
        emAtendimento(),
        improcedente(),
        emAtendimento(),
        improcedente(),
      ]);

      const sucessos = respostas.filter((r) => r.status === 200).length;
      expect(sucessos).toBeGreaterThanOrEqual(1);
      expect(respostas.every((r) => r.status === 200 || r.status === 422)).toBe(true);

      const gravada = await noBanco();
      expect(gravada.historico).toHaveLength(1 + sucessos);
      expect(statusAtualizado).toHaveBeenCalledTimes(sucessos);
      // A máquina de estados não tem ciclos: cada estado só pode ser deixado uma vez. Duas entradas
      // saindo do mesmo estado seriam duas mudanças "concorrentes" que passaram uma por cima da outra.
      const estadosDeixados = gravada.historico.map((h) => h.statusAnterior).filter(Boolean);
      expect(new Set(estadosDeixados).size).toBe(estadosDeixados.length);
      // O status final nunca é um estado que já foi deixado.
      expect(estadosDeixados).not.toContain(gravada.status);
    });

    it('o mesmo clique repetido (duplo clique): uma mudança só', async () => {
      const [a, b] = await Promise.all([
        mudar(operador.token, id, { status: 'EM_ATENDIMENTO' }),
        mudar(operador.token, id, { status: 'EM_ATENDIMENTO' }),
      ]);

      expect([a.status, b.status].sort()).toEqual([200, 422]);
      expect((await noBanco()).historico).toHaveLength(2);
    });
  });

  describe('evento em tempo real depois do commit (RF-024, RN-019)', () => {
    it('publica `statusAtualizado` com o snapshot, o status anterior e "Equatorial Pará"', async () => {
      const previsao = emMinutos(60);
      await mudar(operador.token, id, {
        status: 'EM_ATENDIMENTO',
        previsaoReparo: previsao.toISOString(),
      });

      expect(statusAtualizado).toHaveBeenCalledTimes(1);
      const evento = statusAtualizado.mock.calls[0]![0];
      expect(evento).toMatchObject({
        statusAnterior: 'RECEBIDA',
        por: 'Equatorial Pará',
        denuncia: {
          id,
          status: 'EM_ATENDIMENTO',
          autorId: maria.id,
          previsaoReparo: previsao,
          bairro: { id: bairro.id },
        },
      });
      expect(evento.alteradoEm).toBeInstanceOf(Date);
    });

    it('não publica quando a mudança é recusada (400, 403, 404 ou 422)', async () => {
      await mudar(operador.token, id, {}); // 400
      await mudar(operador.token, id, { status: 'CANCELADA' }); // 403
      await mudar(operador.token, id, { status: 'RESOLVIDA' }); // 422
      await mudar(operador.token, '00000000-0000-4000-8000-000000000000', {
        status: 'EM_ATENDIMENTO',
      }); // 404

      expect(statusAtualizado).not.toHaveBeenCalled();
    });

    it('se a publicação falhar, a mudança continua valendo (200)', async () => {
      const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      statusAtualizado.mockRejectedValueOnce(new Error('socket indisponível'));

      const res = await mudar(operador.token, id, { status: 'EM_ATENDIMENTO' });

      expect(res.status).toBe(200);
      expect((await noBanco()).status).toBe('EM_ATENDIMENTO');
      expect(erroNoConsole).toHaveBeenCalled();
      erroNoConsole.mockRestore();
    });
  });
});

describe('ciclo completo da denúncia, pela API (visão do cidadão e do operador)', () => {
  it('recebida -> em atendimento -> resolvida; o cidadão acompanha e depois pode denunciar de novo', async () => {
    const operador = await entrarComoOperador(app);
    const maria = await registrarCidadao(app);
    const { id } = await abrirDenuncia(maria.token);
    const meuDetalhe = () => request(app).get(`/api/v1/denuncias/${id}`).set(comToken(maria.token));
    const previsao = emMinutos(90);

    // A operadora inicia o atendimento e informa a previsão.
    await mudar(operador.token, id, {
      status: 'EM_ATENDIMENTO',
      previsaoReparo: previsao.toISOString(),
    });
    const emAtendimento = await meuDetalhe();
    expect(emAtendimento.body).toMatchObject({
      status: 'EM_ATENDIMENTO',
      previsaoReparo: previsao.toISOString(),
    });
    expect(emAtendimento.body.historico.map((h: Payload) => h.por)).toEqual([
      'Você',
      'Equatorial Pará',
    ]);
    // Com a denúncia em aberto, o cidadão ainda não pode abrir outra.
    expect(
      (
        await request(app)
          .post('/api/v1/denuncias')
          .set(comToken(maria.token))
          .send({ tipo: 'OSCILACAO', bairroId: bairro.id, logradouro: 'Outra rua' })
      ).status,
    ).toBe(409);

    // A operadora resolve.
    await mudar(operador.token, id, { status: 'RESOLVIDA' });
    const resolvida = await meuDetalhe();
    expect(resolvida.body.status).toBe('RESOLVIDA');
    expect(resolvida.body.historico).toHaveLength(3);
    // O nome do operador nunca aparece para o cidadão.
    expect(JSON.stringify(resolvida.body)).not.toContain('Operador de Teste');

    // Liberou: o cidadão pode registrar uma nova.
    const nova = await request(app)
      .post('/api/v1/denuncias')
      .set(comToken(maria.token))
      .send({ tipo: 'OSCILACAO', bairroId: bairro.id, logradouro: 'Outra rua' });
    expect(nova.status).toBe(201);

    // E o painel enxerga as duas, a aberta primeiro na ordem de antiguidade.
    const lista = await listar(operador.token, '?status=RECEBIDA,EM_ATENDIMENTO');
    expect(lista.body.total).toBe(1);
  });
});

describe('painel + tempo real, com o servidor completo (RNF-002)', () => {
  let servidor: Awaited<ReturnType<typeof iniciarServidorDeTeste>>;

  beforeAll(async () => {
    servidor = await iniciarServidorDeTeste();
  });
  afterEach(() => servidor.desconectarClientes());
  afterAll(() => servidor.fechar());

  it('o autor e o painel recebem a mudança em até 2 s; outro cidadão só a versão pública', async () => {
    const operador = await entrarComoOperador(servidor.app);
    const maria = await registrarCidadao(servidor.app);
    const joao = await registrarCidadao(servidor.app);
    const painel = gravarEventos(await servidor.conectar(operador.token));
    const appMaria = gravarEventos(await servidor.conectar(maria.token));
    const appJoao = gravarEventos(await servidor.conectar(joao.token));
    const criada = await request(servidor.url)
      .post('/api/v1/denuncias')
      .set(comToken(maria.token))
      .send({ tipo: 'SEM_ENERGIA', bairroId: bairro.id, logradouro: 'Av. VP-3, Folha 28' });
    await aguardar(() => doTipo(appJoao, EVENTOS.bairroStatusAtualizado).length === 1);
    for (const lista of [painel, appMaria, appJoao]) lista.length = 0;

    const inicio = Date.now();
    const res = await request(servidor.url)
      .patch(`/api/v1/painel/denuncias/${criada.body.id}/status`)
      .set(comToken(operador.token))
      .send({ status: 'EM_ATENDIMENTO' });
    expect(res.status).toBe(200);
    await aguardar(() => doTipo(appMaria, EVENTOS.statusAtualizado).length > 0);
    const latencia = Date.now() - inicio;
    await aguardar(() => doTipo(painel, EVENTOS.statusAtualizado).length > 0);
    await aguardar(() => doTipo(appJoao, EVENTOS.bairroStatusAtualizado).length > 0);
    await pausa(150);

    expect(latencia).toBeLessThan(2000);
    for (const eventos of [appMaria, painel]) {
      expect(doTipo(eventos, EVENTOS.statusAtualizado)).toEqual([
        {
          id: criada.body.id,
          protocolo: criada.body.protocolo,
          statusAnterior: 'RECEBIDA',
          status: 'EM_ATENDIMENTO',
          previsaoReparo: null,
          justificativa: null,
          alteradoEm: expect.any(String),
          por: 'Equatorial Pará',
        },
      ]);
    }
    expect(doTipo(appJoao, EVENTOS.statusAtualizado)).toHaveLength(0);
    expect(doTipo(appJoao, EVENTOS.ocorrenciaAtualizada)[0]).toMatchObject({
      id: criada.body.id,
      status: 'EM_ATENDIMENTO',
    });
    expect(doTipo(appJoao, EVENTOS.bairroStatusAtualizado)[0]).toMatchObject({
      status: 'SEM_LUZ',
      emAberto: 1,
    });
  });
});

describe('necessidade especial: prioridade e retenção (RN-015, RN-026)', () => {
  const sim = { necessidadeEspecial: true, consentimentoNecessidade: true };
  const noBanco = (id: string) => prisma.denuncia.findUniqueOrThrow({ where: { id } });

  it('a ordem põe o "Sim" primeiro e os sem resposta (nulos) no fim do grupo comum, por data', async () => {
    const operador = await entrarComoOperador(app);
    const em = (min: number) => new Date(Date.now() - min * 60_000);
    // Sem `nulls: 'last'`, o PostgreSQL poria os nulos ANTES do "Sim" na ordem decrescente.
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      logradouro: 'nula antiga',
      criadoEm: em(50),
    });
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      logradouro: 'não recente',
      necessidadeEspecial: false,
      criadoEm: em(10),
    });
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      logradouro: 'sim recente',
      necessidadeEspecial: true,
      criadoEm: em(5),
    });
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      logradouro: 'nula recente',
      criadoEm: em(1),
    });

    const res = await listar(operador.token);
    const ordem = (res.body.itens as Payload[]).map((i) => i.logradouro);

    expect(ordem[0]).toBe('sim recente');
    expect(ordem).toEqual(['sim recente', 'não recente', 'nula antiga', 'nula recente']);
    expect((res.body.itens as Payload[]).map((i) => i.prioritaria)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it('o detalhe traz a resposta e a data do consentimento, sem texto livre', async () => {
    const operador = await entrarComoOperador(app);
    const maria = await registrarCidadao(app);
    const criada = await abrirDenuncia(maria.token, sim);

    const res = await detalhe(operador.token, criada.id);

    expect(res.body.necessidadeEspecial).toBe(true);
    expect(new Date(res.body.consentimentoNecessidadeEm).getTime()).not.toBeNaN();
    expect(res.body).not.toHaveProperty('detalheNecessidade');
  });

  it.each([
    ['RESOLVIDA', [{ status: 'EM_ATENDIMENTO' }, { status: 'RESOLVIDA' }]],
    [
      'IMPROCEDENTE',
      [{ status: 'IMPROCEDENTE', justificativa: 'Equipe não encontrou interrupção.' }],
    ],
  ] as const)(
    'ao ficar %s, a resposta e o consentimento são apagados na mesma gravação',
    async (_status, passos) => {
      const operador = await entrarComoOperador(app);
      const maria = await registrarCidadao(app);
      const criada = await abrirDenuncia(maria.token, sim);

      for (const corpo of passos) {
        expect((await mudar(operador.token, criada.id, corpo)).status).toBe(200);
      }

      const d = await noBanco(criada.id);
      expect(d.necessidadeEspecial).toBeNull();
      expect(d.consentimentoNecessidadeEm).toBeNull();
      const res = await detalhe(operador.token, criada.id);
      expect(res.body).toMatchObject({
        prioritaria: false,
        necessidadeEspecial: null,
        consentimentoNecessidadeEm: null,
      });
    },
  );

  it('em atendimento, a resposta continua (só o encerramento apaga)', async () => {
    const operador = await entrarComoOperador(app);
    const maria = await registrarCidadao(app);
    const criada = await abrirDenuncia(maria.token, sim);

    await mudar(operador.token, criada.id, { status: 'EM_ATENDIMENTO' });

    const d = await noBanco(criada.id);
    expect(d.necessidadeEspecial).toBe(true);
    expect(d.consentimentoNecessidadeEm).toBeInstanceOf(Date);
  });

  it('o evento da mudança de status já sai sem prioridade depois de encerrar', async () => {
    const operador = await entrarComoOperador(app);
    const maria = await registrarCidadao(app);
    const criada = await abrirDenuncia(maria.token, sim);
    await mudar(operador.token, criada.id, { status: 'EM_ATENDIMENTO' });
    statusAtualizado.mockClear();

    await mudar(operador.token, criada.id, { status: 'RESOLVIDA' });

    expect(statusAtualizado.mock.calls[0]![0].denuncia.prioritaria).toBe(false);
  });

  it('o banco recusa guardar a resposta numa denúncia encerrada (CHECK de RN-026)', async () => {
    const maria = await registrarCidadao(app);
    const criada = await abrirDenuncia(maria.token, sim);

    await expect(
      prisma.denuncia.update({ where: { id: criada.id }, data: { status: 'CANCELADA' } }),
    ).rejects.toThrow();
  });
});

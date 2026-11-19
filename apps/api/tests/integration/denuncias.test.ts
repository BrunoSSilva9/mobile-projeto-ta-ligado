import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DenunciaCriadaEvento } from '../../src/realtime/publicador';
import {
  criarAppDeTeste,
  criarBairro,
  entrarComoOperador,
  limparBanco,
  prisma,
  registrarCidadao,
} from '../helpers/banco';

const app = criarAppDeTeste();
const ANO = new Date().getFullYear();

let bairro: Awaited<ReturnType<typeof criarBairro>>;

beforeEach(async () => {
  await limparBanco();
  bairro = await criarBairro();
});
afterAll(() => prisma.$disconnect());

const corpoBase = () => ({
  tipo: 'SEM_ENERGIA',
  bairroId: bairro.id,
  logradouro: 'Av. VP-3, Folha 28',
});

function criar(token: string, extra: Record<string, unknown> = {}, alvo = app) {
  return request(alvo)
    .post('/api/v1/denuncias')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...corpoBase(), ...extra });
}

/** Leva uma denúncia a um estado final direto no banco (a API de status é do painel, Passo 5). */
async function finalizar(
  id: string,
  status: 'RESOLVIDA' | 'CANCELADA' | 'IMPROCEDENTE' = 'RESOLVIDA',
) {
  await prisma.denuncia.update({
    where: { id },
    data: {
      status,
      ...(status === 'IMPROCEDENTE' ? { justificativa: 'Sem interrupção confirmada.' } : {}),
    },
  });
}

describe('POST /api/v1/denuncias (RF-007, RF-011, RF-012, RF-036)', () => {
  it('registra a denúncia como RECEBIDA, com protocolo TL-AAAA-NNNNNN (RN-023)', async () => {
    const { token } = await registrarCidadao(app);
    const res = await criar(token);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      protocolo: `TL-${ANO}-000001`,
      status: 'RECEBIDA',
      tipo: 'SEM_ENERGIA',
      bairro: { id: bairro.id, nome: 'Nova Marabá' },
    });
    expect(res.body.id).toEqual(expect.any(String));
    expect(new Date(res.body.criadoEm).getTime()).not.toBeNaN();
  });

  it('grava o autor e o primeiro registro do histórico na mesma operação (RN-011)', async () => {
    const { token, id } = await registrarCidadao(app);
    const res = await criar(token);

    const denuncia = await prisma.denuncia.findUniqueOrThrow({
      where: { id: res.body.id },
      include: { historico: true },
    });
    expect(denuncia.autorId).toBe(id);
    expect(denuncia.status).toBe('RECEBIDA');
    expect(denuncia.historico).toHaveLength(1);
    expect(denuncia.historico[0]).toMatchObject({
      statusAnterior: null,
      statusNovo: 'RECEBIDA',
      alteradoPorId: id,
      papelAutor: 'CIDADAO',
    });
  });

  it('guarda todos os campos informados', async () => {
    const { token } = await registrarCidadao(app);
    const res = await criar(token, {
      tipo: 'OSCILACAO',
      cep: '68500-000',
      pontoReferencia: 'Perto da rotatória',
      descricao: 'Estalo forte no poste',
      latitude: -5.3712,
      longitude: -49.1231,
      faixaPessoas: 'DE_4_A_8',
      necessidadeEspecial: true,
      detalheNecessidade: 'Idosa de 82 anos com inalação',
    });
    expect(res.status).toBe(201);

    const d = await prisma.denuncia.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(d).toMatchObject({
      tipo: 'OSCILACAO',
      logradouro: 'Av. VP-3, Folha 28',
      cep: '68500-000',
      pontoReferencia: 'Perto da rotatória',
      descricao: 'Estalo forte no poste',
      faixaPessoas: 'DE_4_A_8',
      necessidadeEspecial: true,
      detalheNecessidade: 'Idosa de 82 anos com inalação',
    });
    expect(d.latitude?.toNumber()).toBeCloseTo(-5.3712, 4);
    expect(d.longitude?.toNumber()).toBeCloseTo(-49.1231, 4);
  });

  it('funciona sem GPS: coordenadas vazias (RN-012)', async () => {
    const { token } = await registrarCidadao(app);
    const res = await criar(token);

    expect(res.status).toBe(201);
    const d = await prisma.denuncia.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(d.latitude).toBeNull();
    expect(d.longitude).toBeNull();
  });

  it('aceita `null` e texto vazio nos campos opcionais', async () => {
    const { token } = await registrarCidadao(app);
    const res = await criar(token, {
      cep: '',
      pontoReferencia: null,
      descricao: '   ',
      latitude: null,
      longitude: null,
      faixaPessoas: null,
      necessidadeEspecial: null,
    });

    expect(res.status).toBe(201);
    const d = await prisma.denuncia.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(d).toMatchObject({
      cep: null,
      pontoReferencia: null,
      descricao: null,
      faixaPessoas: null,
      necessidadeEspecial: false,
    });
  });

  it.each(['68500-000', '68500000'])('aceita o CEP %s', async (cep) => {
    const { token } = await registrarCidadao(app);
    expect((await criar(token, { cep })).status).toBe(201);
  });

  it('descarta campos que só o servidor define (status, protocolo, autor, prioridade)', async () => {
    const { token, id } = await registrarCidadao(app);
    const outro = await registrarCidadao(app);
    const res = await criar(token, {
      status: 'RESOLVIDA',
      protocolo: 'TL-1999-000099',
      autorId: outro.id,
      prioritaria: true,
      previsaoReparo: '2030-01-01T00:00:00Z',
      justificativa: 'forjada',
    });

    expect(res.status).toBe(201);
    const d = await prisma.denuncia.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(d).toMatchObject({
      status: 'RECEBIDA',
      protocolo: `TL-${ANO}-000001`,
      autorId: id,
      necessidadeEspecial: false,
      previsaoReparo: null,
      justificativa: null,
    });
  });

  it('não guarda o detalhe da necessidade quando não há necessidade especial', async () => {
    const { token } = await registrarCidadao(app);
    const res = await criar(token, { necessidadeEspecial: false, detalheNecessidade: 'ignorado' });

    expect(res.status).toBe(201);
    const d = await prisma.denuncia.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(d.necessidadeEspecial).toBe(false);
    expect(d.detalheNecessidade).toBeNull();
  });

  describe('autenticação e papel', () => {
    it('sem token: 401', async () => {
      const res = await request(app).post('/api/v1/denuncias').send(corpoBase());
      expect(res.status).toBe(401);
    });

    it('operador não registra denúncia: 403', async () => {
      const operador = await entrarComoOperador(app);
      const res = await criar(operador.token);

      expect(res.status).toBe(403);
      expect(res.body.erro.codigo).toBe('SEM_PERMISSAO');
      expect(await prisma.denuncia.count()).toBe(0);
    });
  });

  describe('uma denúncia em aberto por cidadão (RN-006, RF-011)', () => {
    it.each(['RECEBIDA', 'EM_ATENDIMENTO'] as const)(
      'recusa uma nova com 409 enquanto a anterior está %s e informa qual é',
      async (status) => {
        const { token } = await registrarCidadao(app);
        const primeira = await criar(token);
        if (status === 'EM_ATENDIMENTO') {
          await prisma.denuncia.update({ where: { id: primeira.body.id }, data: { status } });
        }

        const segunda = await criar(token, { logradouro: 'Outra rua qualquer' });

        expect(segunda.status).toBe(409);
        expect(segunda.body.erro.codigo).toBe('DENUNCIA_EM_ABERTO');
        expect(segunda.body.erro.dados).toEqual({ denunciaEmAbertoId: primeira.body.id });
        expect(await prisma.denuncia.count()).toBe(1);
      },
    );

    it.each(['RESOLVIDA', 'CANCELADA', 'IMPROCEDENTE'] as const)(
      'libera uma nova denúncia quando a anterior ficou %s',
      async (final) => {
        const { token } = await registrarCidadao(app);
        const primeira = await criar(token);
        await finalizar(primeira.body.id, final);

        const segunda = await criar(token);
        expect(segunda.status).toBe(201);
      },
    );

    it('o limite é por cidadão: outro cidadão registra a dele normalmente', async () => {
      const maria = await registrarCidadao(app);
      const joao = await registrarCidadao(app);

      expect((await criar(maria.token)).status).toBe(201);
      expect((await criar(joao.token)).status).toBe(201);
    });

    it('duas requisições simultâneas do mesmo cidadão: só uma é criada (corrida)', async () => {
      const { token } = await registrarCidadao(app);

      const [a, b] = await Promise.all([criar(token), criar(token)]);

      expect([a.status, b.status].sort()).toEqual([201, 409]);
      expect(await prisma.denuncia.count()).toBe(1);
      const vencedora = a.status === 201 ? a : b;
      const perdedora = a.status === 201 ? b : a;
      expect(perdedora.body.erro.codigo).toBe('DENUNCIA_EM_ABERTO');
      expect(perdedora.body.erro.dados.denunciaEmAbertoId).toBe(vencedora.body.id);
    });

    it('a tentativa que falha por corrida não consome número de protocolo (sem buracos)', async () => {
      const { token } = await registrarCidadao(app);
      const [a, b] = await Promise.all([criar(token), criar(token)]);
      const vencedora = a.status === 201 ? a : b;
      expect(vencedora.body.protocolo).toBe(`TL-${ANO}-000001`);

      await finalizar(vencedora.body.id);
      const proxima = await criar(token);
      expect(proxima.body.protocolo).toBe(`TL-${ANO}-000002`);
    });
  });

  describe('protocolo (RN-023, S-34)', () => {
    it('é sequencial e único mesmo com muitos cidadãos registrando ao mesmo tempo', async () => {
      const cidadaos = await Promise.all(Array.from({ length: 6 }, () => registrarCidadao(app)));

      const respostas = await Promise.all(cidadaos.map((c) => criar(c.token)));

      expect(respostas.every((r) => r.status === 201)).toBe(true);
      const protocolos = respostas.map((r) => r.body.protocolo as string).sort();
      expect(protocolos).toEqual(
        Array.from({ length: 6 }, (_, i) => `TL-${ANO}-${String(i + 1).padStart(6, '0')}`),
      );
    });

    it('a sequência recomeça a cada ano', async () => {
      const em = (ano: number) =>
        criarAppDeTeste({}, { relogio: () => new Date(`${ano}-06-15T12:00:00Z`) });
      const app2026 = em(2026);
      const app2027 = em(2027);
      const a = await registrarCidadao(app2026);
      const b = await registrarCidadao(app2026);
      const c = await registrarCidadao(app2027);

      expect((await criar(a.token, {}, app2026)).body.protocolo).toBe('TL-2026-000001');
      expect((await criar(b.token, {}, app2026)).body.protocolo).toBe('TL-2026-000002');
      expect((await criar(c.token, {}, app2027)).body.protocolo).toBe('TL-2027-000001');
    });
  });

  describe('validação (400 VALIDACAO_ERRO)', () => {
    it.each([
      ['sem tipo', { tipo: undefined }, 'tipo'],
      ['tipo inválido', { tipo: 'APAGAO' }, 'tipo'],
      ['sem bairro', { bairroId: undefined }, 'bairroId'],
      ['bairro como texto', { bairroId: 'abc' }, 'bairroId'],
      ['bairro zero', { bairroId: 0 }, 'bairroId'],
      ['bairro inexistente', { bairroId: 999_999 }, 'bairroId'],
      ['sem logradouro', { logradouro: undefined }, 'logradouro'],
      ['logradouro curto', { logradouro: 'ab' }, 'logradouro'],
      ['logradouro com mais de 200 caracteres', { logradouro: 'a'.repeat(201) }, 'logradouro'],
      ['descrição com mais de 500 caracteres', { descricao: 'a'.repeat(501) }, 'descricao'],
      [
        'ponto de referência com mais de 200',
        { pontoReferencia: 'a'.repeat(201) },
        'pontoReferencia',
      ],
      ['CEP inválido', { cep: '123' }, 'cep'],
      ['latitude sem longitude', { latitude: -5.3 }, 'latitude'],
      ['longitude sem latitude', { longitude: -49.1 }, 'latitude'],
      ['latitude fora do intervalo', { latitude: 91, longitude: -49.1 }, 'latitude'],
      ['longitude fora do intervalo', { latitude: -5.3, longitude: -181 }, 'longitude'],
      ['faixa de pessoas inválida', { faixaPessoas: 'MUITAS' }, 'faixaPessoas'],
      ['necessidade especial como texto', { necessidadeEspecial: 'sim' }, 'necessidadeEspecial'],
      ['necessidade especial sem detalhe', { necessidadeEspecial: true }, 'detalheNecessidade'],
    ])('recusa %s', async (_nome, alteracao, campo) => {
      const { token } = await registrarCidadao(app);
      const res = await criar(token, alteracao);

      expect(res.status).toBe(400);
      expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
      expect(res.body.erro.detalhes.map((d: { campo: string }) => d.campo)).toContain(campo);
    });

    it('uma requisição inválida não cria denúncia nem consome protocolo', async () => {
      const { token } = await registrarCidadao(app);
      await criar(token, { bairroId: 999_999 });
      await criar(token, { tipo: 'X' });

      expect(await prisma.denuncia.count()).toBe(0);
      expect(await prisma.protocoloSequencia.count()).toBe(0);
      expect((await criar(token)).body.protocolo).toBe(`TL-${ANO}-000001`);
    });

    it('lista todos os campos com erro de uma vez, em português', async () => {
      const { token } = await registrarCidadao(app);
      const res = await request(app)
        .post('/api/v1/denuncias')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      const porCampo = Object.fromEntries(
        res.body.erro.detalhes.map((d: { campo: string; mensagem: string }) => [
          d.campo,
          d.mensagem,
        ]),
      );
      expect(porCampo.tipo).toBe('Escolha o tipo: sem energia ou oscilação.');
      expect(porCampo.bairroId).toBe('Escolha o bairro.');
      expect(porCampo.logradouro).toBe('Informe o logradouro.');
    });
  });

  describe('evento em tempo real depois do commit (ADR-0002)', () => {
    function appComEspiao(falhar = false) {
      const denunciaCriada = vi.fn(async (_evento: DenunciaCriadaEvento) => {
        if (falhar) throw new Error('socket indisponível');
      });
      return { denunciaCriada, app: criarAppDeTeste({}, { publicador: { denunciaCriada } }) };
    }

    it('publica `denuncia:criada` com os dados do painel, só depois de gravar', async () => {
      const { denunciaCriada, app: appEspiao } = appComEspiao();
      denunciaCriada.mockImplementationOnce(async (evento) => {
        // No momento do evento a denúncia já está gravada e visível para outras conexões.
        expect(await prisma.denuncia.count({ where: { id: evento.id } })).toBe(1);
      });
      const { token, id } = await registrarCidadao(appEspiao, {
        nome: 'Maria Silva',
        telefone: '(94) 90000-0000',
      });

      const res = await criar(
        token,
        {
          latitude: -5.3712,
          longitude: -49.1231,
          necessidadeEspecial: true,
          detalheNecessidade: 'Aparelho de oxigênio',
        },
        appEspiao,
      );

      expect(res.status).toBe(201);
      expect(denunciaCriada).toHaveBeenCalledTimes(1);
      expect(denunciaCriada.mock.calls[0]![0]).toMatchObject({
        id: res.body.id,
        protocolo: res.body.protocolo,
        tipo: 'SEM_ENERGIA',
        status: 'RECEBIDA',
        prioritaria: true,
        bairro: { id: bairro.id, nome: 'Nova Marabá' },
        logradouro: 'Av. VP-3, Folha 28',
        latitude: -5.3712,
        longitude: -49.1231,
        autor: { id, nome: 'Maria Silva', telefone: '(94) 90000-0000' },
      });
    });

    it('não publica quando a requisição é recusada (validação ou limite)', async () => {
      const { denunciaCriada, app: appEspiao } = appComEspiao();
      const { token } = await registrarCidadao(appEspiao);

      await criar(token, { tipo: 'X' }, appEspiao);
      await criar(token, {}, appEspiao);
      await criar(token, {}, appEspiao); // 409

      expect(denunciaCriada).toHaveBeenCalledTimes(1);
    });

    it('se a publicação falhar, a denúncia continua registrada (201)', async () => {
      const { app: appEspiao } = appComEspiao(true);
      const { token } = await registrarCidadao(appEspiao);
      const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const res = await criar(token, {}, appEspiao);

      expect(res.status).toBe(201);
      expect(await prisma.denuncia.count()).toBe(1);
      expect(erroNoConsole).toHaveBeenCalled();
      erroNoConsole.mockRestore();
    });
  });
});

describe('GET /api/v1/denuncias/minhas (RF-013)', () => {
  let sequencia = 0;

  /** Cria denúncias direto no banco (contorna o limite de uma em aberto), da mais antiga à mais nova. */
  async function semear(
    autorId: string,
    quantidade: number,
    status: 'RESOLVIDA' | 'CANCELADA' = 'RESOLVIDA',
  ) {
    const ids: string[] = [];
    for (let i = 0; i < quantidade; i++) {
      sequencia += 1;
      const d = await prisma.denuncia.create({
        data: {
          protocolo: `TL-2020-${String(sequencia).padStart(6, '0')}`,
          autorId,
          bairroId: bairro.id,
          tipo: 'SEM_ENERGIA',
          status,
          logradouro: `Rua ${sequencia}`,
          criadoEm: new Date(Date.UTC(2026, 0, 1, 0, sequencia)),
        },
      });
      ids.push(d.id);
    }
    return ids;
  }

  const listar = (token: string, consulta = '') =>
    request(app).get(`/api/v1/denuncias/minhas${consulta}`).set('Authorization', `Bearer ${token}`);

  it('lista só as minhas, da mais recente para a mais antiga', async () => {
    const maria = await registrarCidadao(app);
    const joao = await registrarCidadao(app);
    const idsDaMaria = await semear(maria.id, 3);
    await semear(joao.id, 2);

    const res = await listar(maria.token);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.pagina).toBe(1);
    expect(res.body.itens.map((i: { id: string }) => i.id)).toEqual([...idsDaMaria].reverse());
  });

  it('cada item traz o resumo, sem dados pessoais', async () => {
    const maria = await registrarCidadao(app);
    const criada = await criar(maria.token);

    const res = await listar(maria.token);

    expect(res.body.itens[0]).toEqual({
      id: criada.body.id,
      protocolo: criada.body.protocolo,
      tipo: 'SEM_ENERGIA',
      status: 'RECEBIDA',
      bairro: 'Nova Marabá',
      folha: 'Folha 28',
      criadoEm: criada.body.criadoEm,
      previsaoReparo: null,
    });
  });

  it('mostra a previsão de reparo quando a operadora informou', async () => {
    const maria = await registrarCidadao(app);
    const criada = await criar(maria.token);
    await prisma.denuncia.update({
      where: { id: criada.body.id },
      data: { previsaoReparo: new Date('2030-05-01T16:20:00Z') },
    });

    const res = await listar(maria.token);
    expect(res.body.itens[0].previsaoReparo).toBe('2030-05-01T16:20:00.000Z');
  });

  it('pagina os resultados', async () => {
    const maria = await registrarCidadao(app);
    const ids = await semear(maria.id, 5); // do mais antigo [0] ao mais novo [4]

    const p1 = await listar(maria.token, '?limite=2&page=1');
    const p2 = await listar(maria.token, '?limite=2&page=2');
    const p3 = await listar(maria.token, '?limite=2&page=3');

    expect(p1.body.itens.map((i: { id: string }) => i.id)).toEqual([ids[4], ids[3]]);
    expect(p2.body.itens.map((i: { id: string }) => i.id)).toEqual([ids[2], ids[1]]);
    expect(p3.body.itens.map((i: { id: string }) => i.id)).toEqual([ids[0]]);
    expect(p3.body).toMatchObject({ total: 5, pagina: 3 });
  });

  it('filtra por status', async () => {
    const maria = await registrarCidadao(app);
    await semear(maria.id, 2, 'RESOLVIDA');
    await semear(maria.id, 1, 'CANCELADA');

    const res = await listar(maria.token, '?status=CANCELADA');

    expect(res.body.total).toBe(1);
    expect(res.body.itens[0].status).toBe('CANCELADA');
  });

  it('sem denúncias: lista vazia', async () => {
    const maria = await registrarCidadao(app);
    const res = await listar(maria.token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itens: [], pagina: 1, total: 0 });
  });

  it.each([
    ['limite acima de 50', '?limite=51'],
    ['limite zero', '?limite=0'],
    ['página zero', '?page=0'],
    ['status inexistente', '?status=XYZ'],
  ])('recusa %s com 400', async (_nome, consulta) => {
    const maria = await registrarCidadao(app);
    const res = await listar(maria.token, consulta);

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
  });

  it('sem token: 401; operador: 403', async () => {
    expect((await request(app).get('/api/v1/denuncias/minhas')).status).toBe(401);
    const operador = await entrarComoOperador(app);
    expect((await listar(operador.token)).status).toBe(403);
  });
});

describe('GET /api/v1/denuncias/:id (RF-014, RF-036)', () => {
  const abrir = (token: string, id: string) =>
    request(app).get(`/api/v1/denuncias/${id}`).set('Authorization', `Bearer ${token}`);

  it('mostra o detalhe completo ao autor, com o histórico', async () => {
    const maria = await registrarCidadao(app);
    const criada = await criar(maria.token, {
      cep: '68500-000',
      pontoReferencia: 'Perto da rotatória',
      descricao: 'Estalo forte no poste',
      latitude: -5.3712,
      longitude: -49.1231,
      faixaPessoas: 'DE_4_A_8',
    });

    const res = await abrir(maria.token, criada.body.id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: criada.body.id,
      protocolo: criada.body.protocolo,
      tipo: 'SEM_ENERGIA',
      status: 'RECEBIDA',
      logradouro: 'Av. VP-3, Folha 28',
      cep: '68500-000',
      pontoReferencia: 'Perto da rotatória',
      bairro: { id: bairro.id, nome: 'Nova Marabá', folha: 'Folha 28' },
      descricao: 'Estalo forte no poste',
      latitude: -5.3712,
      longitude: -49.1231,
      faixaPessoas: 'DE_4_A_8',
      necessidadeEspecial: false,
      detalheNecessidade: null,
      previsaoReparo: null,
      justificativa: null,
      fotos: [],
    });
    expect(typeof res.body.latitude).toBe('number');
    expect(res.body.historico).toEqual([
      {
        statusAnterior: null,
        statusNovo: 'RECEBIDA',
        por: 'Você',
        justificativa: null,
        criadoEm: criada.body.criadoEm,
      },
    ]);
  });

  it('o histórico mostra "Equatorial Pará" para as mudanças da operadora, em ordem', async () => {
    const maria = await registrarCidadao(app);
    const operador = await entrarComoOperador(app);
    const criada = await criar(maria.token);
    const id = criada.body.id as string;

    await prisma.denuncia.update({
      where: { id },
      data: { status: 'EM_ATENDIMENTO', previsaoReparo: new Date('2030-05-01T16:20:00Z') },
    });
    await prisma.historicoStatus.create({
      data: {
        denunciaId: id,
        statusAnterior: 'RECEBIDA',
        statusNovo: 'EM_ATENDIMENTO',
        alteradoPorId: operador.id,
        papelAutor: 'OPERADOR',
        criadoEm: new Date(Date.now() + 60_000),
      },
    });

    const res = await abrir(maria.token, id);

    expect(res.body.status).toBe('EM_ATENDIMENTO');
    expect(res.body.previsaoReparo).toBe('2030-05-01T16:20:00.000Z');
    expect(res.body.historico.map((h: { por: string }) => h.por)).toEqual([
      'Você',
      'Equatorial Pará',
    ]);
    expect(res.body.historico[1]).toMatchObject({
      statusAnterior: 'RECEBIDA',
      statusNovo: 'EM_ATENDIMENTO',
    });
    // O nome do operador não vai para o cidadão.
    expect(JSON.stringify(res.body)).not.toContain('Operador de Teste');
  });

  it('mostra a justificativa quando a operadora marcou como improcedente', async () => {
    const maria = await registrarCidadao(app);
    const criada = await criar(maria.token);
    await finalizar(criada.body.id, 'IMPROCEDENTE');

    const res = await abrir(maria.token, criada.body.id);
    expect(res.body).toMatchObject({
      status: 'IMPROCEDENTE',
      justificativa: 'Sem interrupção confirmada.',
    });
  });

  it('outro cidadão recebe 404, igual a uma denúncia que não existe (RN-014)', async () => {
    const maria = await registrarCidadao(app);
    const joao = await registrarCidadao(app);
    const criada = await criar(maria.token);

    const alheia = await abrir(joao.token, criada.body.id);
    const inexistente = await abrir(joao.token, '00000000-0000-4000-8000-000000000000');

    expect(alheia.status).toBe(404);
    expect(inexistente.status).toBe(404);
    expect(alheia.body).toEqual(inexistente.body);
    expect(alheia.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  it('um id que não é UUID também dá 404 (não vira erro 500)', async () => {
    const maria = await registrarCidadao(app);
    const res = await abrir(maria.token, 'abc');

    expect(res.status).toBe(404);
  });

  it('denúncia anonimizada (sem autor) não é de ninguém', async () => {
    const maria = await registrarCidadao(app);
    const criada = await criar(maria.token);
    await prisma.denuncia.update({ where: { id: criada.body.id }, data: { autorId: null } });

    expect((await abrir(maria.token, criada.body.id)).status).toBe(404);
  });

  it('sem token: 401; operador: 403 (ele usa as rotas do painel)', async () => {
    const maria = await registrarCidadao(app);
    const criada = await criar(maria.token);

    expect((await request(app).get(`/api/v1/denuncias/${criada.body.id}`)).status).toBe(401);
    const operador = await entrarComoOperador(app);
    expect((await abrir(operador.token, criada.body.id)).status).toBe(403);
  });
});

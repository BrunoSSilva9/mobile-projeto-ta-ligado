import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  criarAppDeTeste,
  criarBairro,
  criarDenunciaNoBanco,
  entrarComoOperador,
  limparBanco,
  prisma,
  registrarCidadao,
} from '../helpers/banco';

const AGORA = new Date('2026-11-19T15:00:00.000Z');
const horasAtras = (h: number) => new Date(AGORA.getTime() - h * 3_600_000);
const horasAdiante = (h: number) => new Date(AGORA.getTime() + h * 3_600_000);

const app = criarAppDeTeste({}, { relogio: () => AGORA });

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

const get = (token: string, caminho: string) =>
  request(app).get(`/api/v1${caminho}`).set('Authorization', `Bearer ${token}`);

type Item = { id: string; tipo: string; status: string; bairro: string; criadoEm: string };

describe('GET /api/v1/bairros/status (RF-019, RF-023, RN-007, RN-009)', () => {
  it('bairro sem denúncias em aberto é NORMAL, com todos os bairros na lista', async () => {
    const a = await criarBairro({
      nome: 'Cidade Nova',
      folha: null,
      latitude: -5.359,
      longitude: -49.105,
    });
    await criarBairro({ nome: 'Nova Marabá', folha: 'Folha 28' });
    const { token } = await registrarCidadao(app);
    await criarDenunciaNoBanco({ bairroId: a.id, status: 'RESOLVIDA' });

    const res = await get(token, '/bairros/status');

    expect(res.status).toBe(200);
    expect(res.body.atualizadoEm).toBe(AGORA.toISOString());
    expect(res.body.bairros).toHaveLength(2);
    expect(res.body.bairros[0]).toEqual({
      bairroId: a.id,
      nome: 'Cidade Nova',
      folha: null,
      latitude: -5.359,
      longitude: -49.105,
      status: 'NORMAL',
      emAberto: 0,
      previsaoReparo: null,
    });
    expect(res.body.bairros.every((b: { status: string }) => b.status === 'NORMAL')).toBe(true);
  });

  it('só oscilações em aberto: OSCILACAO', async () => {
    const b = await criarBairro();
    await criarDenunciaNoBanco({ bairroId: b.id, tipo: 'OSCILACAO' });
    await criarDenunciaNoBanco({ bairroId: b.id, tipo: 'OSCILACAO', status: 'EM_ATENDIMENTO' });
    const { token } = await registrarCidadao(app);

    const [bairro] = (await get(token, '/bairros/status')).body.bairros;

    expect(bairro).toMatchObject({ status: 'OSCILACAO', emAberto: 2 });
  });

  it('uma denúncia sem energia manda: SEM_LUZ tem precedência sobre oscilação', async () => {
    const b = await criarBairro();
    await criarDenunciaNoBanco({ bairroId: b.id, tipo: 'OSCILACAO' });
    await criarDenunciaNoBanco({ bairroId: b.id, tipo: 'SEM_ENERGIA' });
    const { token } = await registrarCidadao(app);

    const [bairro] = (await get(token, '/bairros/status')).body.bairros;

    expect(bairro).toMatchObject({ status: 'SEM_LUZ', emAberto: 2 });
  });

  it('denúncias encerradas (resolvida, improcedente, cancelada) não contam', async () => {
    const b = await criarBairro();
    for (const status of ['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'] as const) {
      await criarDenunciaNoBanco({ bairroId: b.id, status });
    }
    const { token } = await registrarCidadao(app);

    const [bairro] = (await get(token, '/bairros/status')).body.bairros;

    expect(bairro).toMatchObject({ status: 'NORMAL', emAberto: 0 });
  });

  it('cada bairro tem o seu status (um não contamina o outro)', async () => {
    const a = await criarBairro({ nome: 'A', folha: null });
    const b = await criarBairro({ nome: 'B', folha: null });
    await criarBairro({ nome: 'C', folha: null });
    await criarDenunciaNoBanco({ bairroId: a.id, tipo: 'SEM_ENERGIA' });
    await criarDenunciaNoBanco({ bairroId: b.id, tipo: 'OSCILACAO' });
    const { token } = await registrarCidadao(app);

    const status = (await get(token, '/bairros/status')).body.bairros.map(
      (x: { nome: string; status: string }) => `${x.nome}:${x.status}`,
    );

    expect(status).toEqual(['A:SEM_LUZ', 'B:OSCILACAO', 'C:NORMAL']);
  });

  it('previsão: a menor entre as futuras; as vencidas são ignoradas (RN-009)', async () => {
    const b = await criarBairro();
    await criarDenunciaNoBanco({ bairroId: b.id, previsaoReparo: horasAdiante(5) });
    await criarDenunciaNoBanco({ bairroId: b.id, previsaoReparo: horasAdiante(2) });
    await criarDenunciaNoBanco({ bairroId: b.id, previsaoReparo: horasAtras(1) });
    const { token } = await registrarCidadao(app);

    const [bairro] = (await get(token, '/bairros/status')).body.bairros;

    expect(bairro.previsaoReparo).toBe(horasAdiante(2).toISOString());
  });

  it('só previsões vencidas: sem previsão', async () => {
    const b = await criarBairro();
    await criarDenunciaNoBanco({ bairroId: b.id, previsaoReparo: horasAtras(3) });
    const { token } = await registrarCidadao(app);

    expect((await get(token, '/bairros/status')).body.bairros[0].previsaoReparo).toBeNull();
  });

  it('a previsão de uma denúncia encerrada não aparece', async () => {
    const b = await criarBairro();
    await criarDenunciaNoBanco({
      bairroId: b.id,
      status: 'RESOLVIDA',
      previsaoReparo: horasAdiante(2),
    });
    const { token } = await registrarCidadao(app);

    expect((await get(token, '/bairros/status')).body.bairros[0].previsaoReparo).toBeNull();
  });

  it('não expõe nenhum dado de denúncia ou de pessoa', async () => {
    const b = await criarBairro();
    const { id } = await registrarCidadao(app, {
      nome: 'Fulana Sigilosa',
      telefone: '(94) 98888-7777',
    });
    await criarDenunciaNoBanco({ bairroId: b.id, autorId: id, necessidadeEspecial: true });
    const { token } = await registrarCidadao(app);

    const texto = JSON.stringify((await get(token, '/bairros/status')).body);

    for (const proibido of ['Fulana', '98888', 'TL-20', 'protocolo', 'autor', 'necessidade']) {
      expect(texto).not.toContain(proibido);
    }
  });

  it('sem token: 401; operador: 403', async () => {
    expect((await request(app).get('/api/v1/bairros/status')).status).toBe(401);
    const operador = await entrarComoOperador(app);
    expect((await get(operador.token, '/bairros/status')).status).toBe(403);
  });
});

describe('GET /api/v1/ocorrencias (RF-019 a RF-021, RN-014)', () => {
  /** Cenário: 2 sem luz, 1 oscilação, 2 restabelecidas (uma há 23 h, outra há 25 h) e encerradas que não aparecem. */
  async function montarCenario() {
    const nova = await criarBairro({ nome: 'Nova Marabá', folha: 'Folha 28' });
    const cidade = await criarBairro({ nome: 'Cidade Nova', folha: null });
    const sao = await criarBairro({ nome: 'São Félix', folha: null });
    const semLuz1 = await criarDenunciaNoBanco({
      bairroId: nova.id,
      tipo: 'SEM_ENERGIA',
      criadoEm: horasAtras(5),
    });
    const semLuz2 = await criarDenunciaNoBanco({
      bairroId: cidade.id,
      tipo: 'SEM_ENERGIA',
      status: 'EM_ATENDIMENTO',
      criadoEm: horasAtras(3),
    });
    const osc = await criarDenunciaNoBanco({
      bairroId: sao.id,
      tipo: 'OSCILACAO',
      criadoEm: horasAtras(1),
    });
    const recente = await criarDenunciaNoBanco({
      bairroId: nova.id,
      status: 'RESOLVIDA',
      criadoEm: horasAtras(30),
      finalizadaEm: horasAtras(23),
    });
    const antiga = await criarDenunciaNoBanco({
      bairroId: nova.id,
      status: 'RESOLVIDA',
      criadoEm: horasAtras(40),
      finalizadaEm: horasAtras(25),
    });
    await criarDenunciaNoBanco({ bairroId: nova.id, status: 'IMPROCEDENTE' });
    await criarDenunciaNoBanco({ bairroId: nova.id, status: 'CANCELADA' });
    return { nova, cidade, sao, semLuz1, semLuz2, osc, recente, antiga };
  }

  it('sem filtro: lista sem luz, oscilação e restabelecidos recentes, da mais nova para a mais antiga', async () => {
    const c = await montarCenario();
    const { token } = await registrarCidadao(app);

    const res = await get(token, '/ocorrencias');

    expect(res.status).toBe(200);
    expect(res.body.itens.map((i: Item) => i.id)).toEqual([
      c.osc.id,
      c.semLuz2.id,
      c.semLuz1.id,
      c.recente.id,
    ]);
    expect(res.body.total).toBe(4);
    expect(res.body.pagina).toBe(1);
    expect(res.body.atualizadoEm).toBe(AGORA.toISOString());
  });

  it('os chips: totais por tipo, e "todos" é a soma dos três', async () => {
    await montarCenario();
    const { token } = await registrarCidadao(app);

    const { totais } = (await get(token, '/ocorrencias')).body;

    expect(totais).toEqual({ todos: 4, semLuz: 2, oscilacao: 1, restabelecidos: 1 });
    expect(totais.semLuz + totais.oscilacao + totais.restabelecidos).toBe(totais.todos);
  });

  it.each([
    ['SEM_LUZ', 2, ['SEM_ENERGIA']],
    ['OSCILACAO', 1, ['OSCILACAO']],
    ['RESTABELECIDO', 1, ['SEM_ENERGIA']],
  ])('chip %s: lista só as ocorrências dele (total %i)', async (status, total, tipos) => {
    await montarCenario();
    const { token } = await registrarCidadao(app);

    const res = await get(token, `/ocorrencias?status=${status}`);

    expect(res.body.total).toBe(total);
    expect(res.body.itens).toHaveLength(total);
    expect(res.body.itens.every((i: Item) => tipos.includes(i.tipo))).toBe(true);
    // Escolher um chip não muda a contagem dos outros.
    expect(res.body.totais).toEqual({ todos: 4, semLuz: 2, oscilacao: 1, restabelecidos: 1 });
  });

  it('"Restabelecidos" são as resolvidas nas últimas 24 h (S-21): 23 h entra, 25 h não', async () => {
    const c = await montarCenario();
    const { token } = await registrarCidadao(app);

    const ids = (await get(token, '/ocorrencias?status=RESTABELECIDO')).body.itens.map(
      (i: Item) => i.id,
    );

    expect(ids).toEqual([c.recente.id]);
    expect(ids).not.toContain(c.antiga.id);
  });

  it('limite exato de 24 h: resolvida há exatamente 24 h ainda conta; um segundo a mais, não', async () => {
    const b = await criarBairro();
    const naBorda = await criarDenunciaNoBanco({
      bairroId: b.id,
      status: 'RESOLVIDA',
      finalizadaEm: horasAtras(24),
    });
    await criarDenunciaNoBanco({
      bairroId: b.id,
      status: 'RESOLVIDA',
      finalizadaEm: new Date(horasAtras(24).getTime() - 1000),
    });
    const { token } = await registrarCidadao(app);

    const res = await get(token, '/ocorrencias?status=RESTABELECIDO');

    expect(res.body.itens.map((i: Item) => i.id)).toEqual([naBorda.id]);
  });

  it('improcedentes e canceladas nunca aparecem, nem nos totais', async () => {
    const b = await criarBairro();
    await criarDenunciaNoBanco({ bairroId: b.id, status: 'IMPROCEDENTE' });
    await criarDenunciaNoBanco({ bairroId: b.id, status: 'CANCELADA' });
    const { token } = await registrarCidadao(app);

    const res = await get(token, '/ocorrencias');

    expect(res.body.itens).toEqual([]);
    expect(res.body.totais).toEqual({ todos: 0, semLuz: 0, oscilacao: 0, restabelecidos: 0 });
  });

  it('filtra por bairro, e os chips acompanham o bairro', async () => {
    const c = await montarCenario();
    const { token } = await registrarCidadao(app);

    const res = await get(token, `/ocorrencias?bairroId=${c.nova.id}`);

    expect(res.body.itens.map((i: Item) => i.id).sort()).toEqual(
      [c.semLuz1.id, c.recente.id].sort(),
    );
    expect(res.body.totais).toEqual({ todos: 2, semLuz: 1, oscilacao: 0, restabelecidos: 1 });
  });

  describe('busca por bairro ou folha (RF-020)', () => {
    it('ignora acentos e caixa', async () => {
      const c = await montarCenario();
      const { token } = await registrarCidadao(app);

      const res = await get(token, `/ocorrencias?q=${encodeURIComponent('SAO FELIX')}`);

      expect(res.body.itens.map((i: Item) => i.id)).toEqual([c.osc.id]);
    });

    it('acha pela folha', async () => {
      const c = await montarCenario();
      const { token } = await registrarCidadao(app);

      const res = await get(token, `/ocorrencias?q=${encodeURIComponent('folha 28')}`);

      expect(res.body.itens.map((i: Item) => i.id).sort()).toEqual(
        [c.semLuz1.id, c.recente.id].sort(),
      );
    });

    it('acha por parte do nome', async () => {
      const c = await montarCenario();
      const { token } = await registrarCidadao(app);

      const res = await get(token, '/ocorrencias?q=nova');

      // "Nova Marabá" e "Cidade Nova"
      expect(res.body.total).toBe(3);
      expect(res.body.itens.some((i: Item) => i.id === c.osc.id)).toBe(false);
    });

    it('sem resultado: lista vazia e totais zerados', async () => {
      await montarCenario();
      const { token } = await registrarCidadao(app);

      const res = await get(token, '/ocorrencias?q=xyz');

      expect(res.body.itens).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.totais.todos).toBe(0);
    });

    it('combina com o bairro escolhido (interseção)', async () => {
      const c = await montarCenario();
      const { token } = await registrarCidadao(app);

      const mesmo = await get(token, `/ocorrencias?q=nova&bairroId=${c.cidade.id}`);
      const outro = await get(token, `/ocorrencias?q=sao&bairroId=${c.cidade.id}`);

      expect(mesmo.body.itens.map((i: Item) => i.id)).toEqual([c.semLuz2.id]);
      expect(outro.body.itens).toEqual([]);
    });

    it('busca em branco equivale a sem busca', async () => {
      await montarCenario();
      const { token } = await registrarCidadao(app);

      expect((await get(token, '/ocorrencias?q=%20%20')).body.total).toBe(4);
    });
  });

  describe('paginação', () => {
    it('divide em páginas e mantém o total', async () => {
      const b = await criarBairro();
      for (let i = 0; i < 5; i++) {
        await criarDenunciaNoBanco({ bairroId: b.id, criadoEm: horasAtras(i + 1) });
      }
      const { token } = await registrarCidadao(app);

      const p1 = (await get(token, '/ocorrencias?limite=2&page=1')).body;
      const p3 = (await get(token, '/ocorrencias?limite=2&page=3')).body;

      expect(p1.itens).toHaveLength(2);
      expect(p1.total).toBe(5);
      expect(p3.itens).toHaveLength(1);
      expect(p3.pagina).toBe(3);
      expect(new Date(p1.itens[0].criadoEm).getTime()).toBeGreaterThan(
        new Date(p1.itens[1].criadoEm).getTime(),
      );
    });

    it('página além do fim vem vazia', async () => {
      await montarCenario();
      const { token } = await registrarCidadao(app);

      expect((await get(token, '/ocorrencias?page=9')).body.itens).toEqual([]);
    });
  });

  describe('anonimização (RN-014)', () => {
    async function ocorrenciaSigilosa() {
      const b = await criarBairro({ nome: 'Cidade Nova', folha: null });
      const { id } = await registrarCidadao(app, {
        nome: 'Fulana Sigilosa',
        telefone: '(94) 98888-7777',
        email: 'fulana@sigilo.com',
      });
      const d = await criarDenunciaNoBanco({
        bairroId: b.id,
        autorId: id,
        necessidadeEspecial: true,
        latitude: -5.371234,
        longitude: -49.123456,
        descricao: 'Estalo forte no poste',
      });
      await prisma.denuncia.update({
        where: { id: d.id },
        data: {
          pontoReferencia: 'Casa azul ao lado do mercado',
          cep: '68500-000',
          faixaPessoas: 'DE_4_A_8',
        },
      });
      return d;
    }

    it('só traz os campos públicos, e nunca autor, telefone, protocolo, fotos, pessoas ou necessidade especial', async () => {
      const d = await ocorrenciaSigilosa();
      const { token } = await registrarCidadao(app);

      const res = await get(token, '/ocorrencias');

      expect(Object.keys(res.body.itens[0]).sort()).toEqual(
        [
          'bairro',
          'criadoEm',
          'descricao',
          'folha',
          'id',
          'latitude',
          'logradouro',
          'longitude',
          'status',
          'tipo',
        ].sort(),
      );
      const texto = JSON.stringify(res.body);
      for (const proibido of [
        'Fulana',
        'fulana@sigilo',
        '98888',
        d.protocolo,
        'protocolo',
        'autor',
        'telefone',
        'fotos',
        'faixaPessoas',
        'DE_4_A_8',
        'necessidade',
        'detalhe',
        'Casa azul',
        'pontoReferencia',
        '68500-000',
        'cep',
      ]) {
        expect(texto).not.toContain(proibido);
      }
    });

    it('as coordenadas saem arredondadas (~110 m), nunca as exatas', async () => {
      await ocorrenciaSigilosa();
      const { token } = await registrarCidadao(app);

      const [item] = (await get(token, '/ocorrencias')).body.itens;

      expect(item.latitude).toBe(-5.371);
      expect(item.longitude).toBe(-49.123);
      expect(JSON.stringify(item)).not.toContain('5.371234');
      expect(JSON.stringify(item)).not.toContain('49.123456');
    });

    it('sem coordenadas (GPS negado), vão nulas', async () => {
      const b = await criarBairro();
      await criarDenunciaNoBanco({ bairroId: b.id });
      const { token } = await registrarCidadao(app);

      const [item] = (await get(token, '/ocorrencias')).body.itens;

      expect(item.latitude).toBeNull();
      expect(item.longitude).toBeNull();
    });

    it('o próprio autor também vê a versão pública (sem o protocolo)', async () => {
      const b = await criarBairro();
      const autor = await registrarCidadao(app);
      await criarDenunciaNoBanco({ bairroId: b.id, autorId: autor.id });

      const res = await get(autor.token, '/ocorrencias');

      expect(JSON.stringify(res.body)).not.toContain('protocolo');
    });
  });

  describe('validação e acesso', () => {
    it.each([
      ['status desconhecido', '?status=APAGAO'],
      ['bairro que não é número', '?bairroId=abc'],
      ['bairro negativo', '?bairroId=-1'],
      ['página zero', '?page=0'],
      ['limite acima de 50', '?limite=51'],
      ['limite zero', '?limite=0'],
      ['busca longa demais', `?q=${'a'.repeat(101)}`],
    ])('recusa %s com 400', async (_nome, consulta) => {
      const { token } = await registrarCidadao(app);

      const res = await get(token, `/ocorrencias${consulta}`);

      expect(res.status).toBe(400);
      expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
    });

    it('parâmetros vazios são tratados como ausentes', async () => {
      await montarCenario();
      const { token } = await registrarCidadao(app);

      const res = await get(token, '/ocorrencias?status=&bairroId=&q=');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(4);
    });

    it('sem token: 401; operador: 403 (a lista pública é do cidadão)', async () => {
      expect((await request(app).get('/api/v1/ocorrencias')).status).toBe(401);
      const operador = await entrarComoOperador(app);
      expect((await get(operador.token, '/ocorrencias')).status).toBe(403);
    });
  });

  it('é a mesma forma do evento ocorrencia:atualizada (um item = projeção pública)', async () => {
    const c = await montarCenario();
    const { token } = await registrarCidadao(app);

    const item = (await get(token, `/ocorrencias?bairroId=${c.sao.id}`)).body.itens[0];

    expect(item).toMatchObject({
      id: c.osc.id,
      tipo: 'OSCILACAO',
      status: 'RECEBIDA',
      bairro: 'São Félix',
      folha: null,
    });
  });
});

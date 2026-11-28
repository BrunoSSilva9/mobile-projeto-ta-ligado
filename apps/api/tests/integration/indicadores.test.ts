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

const AGORA = new Date('2026-11-27T12:00:00.000Z');
const app = criarAppDeTeste({}, { relogio: () => AGORA });

const diasAtras = (dias: number) => new Date(AGORA.getTime() - dias * 86_400_000);

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
const obter = (token: string) =>
  request(app).get('/api/v1/painel/indicadores').set(comToken(token));

/** Uma denúncia resolvida, com o registro no histórico na data informada. */
async function resolvidaEm(bairroId: number, quando: Date, criadoEm = quando) {
  const d = await criarDenunciaNoBanco({ bairroId, status: 'RESOLVIDA', criadoEm });
  await prisma.historicoStatus.create({
    data: {
      denunciaId: d.id,
      statusAnterior: 'EM_ATENDIMENTO',
      statusNovo: 'RESOLVIDA',
      papelAutor: 'OPERADOR',
      criadoEm: quando,
    },
  });
  return d;
}

describe('GET /painel/indicadores (RF-018, RN-017, S-52)', () => {
  it('sem dados: tudo zero (e os usuários contam só os cidadãos)', async () => {
    const operador = await entrarComoOperador(app);

    const res = await obter(operador.token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      periodoDias: 30,
      usuariosCadastrados: 0,
      denunciasRegistradas: 0,
      emAtendimento: 0,
      resolvidas: 0,
      taxaResolucao: 0,
    });
  });

  it('conta usuários, registradas e em atendimento nos prazos certos', async () => {
    const operador = await entrarComoOperador(app);
    await registrarCidadao(app);
    await registrarCidadao(app);
    const bairro = await criarBairro();
    await criarDenunciaNoBanco({ bairroId: bairro.id, criadoEm: diasAtras(1) });
    await criarDenunciaNoBanco({ bairroId: bairro.id, criadoEm: diasAtras(29) });
    await criarDenunciaNoBanco({ bairroId: bairro.id, criadoEm: diasAtras(31) }); // fora da janela
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      status: 'EM_ATENDIMENTO',
      criadoEm: diasAtras(60), // em atendimento conta "agora", mesmo antiga
    });

    const res = await obter(operador.token);

    expect(res.body).toMatchObject({
      usuariosCadastrados: 2,
      denunciasRegistradas: 2,
      emAtendimento: 1,
    });
  });

  it('resolvidas: só as que passaram a RESOLVIDA nos últimos 30 dias, e a taxa é resolvidas ÷ registradas', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();
    await resolvidaEm(bairro.id, diasAtras(2)); // registrada e resolvida na janela
    await resolvidaEm(bairro.id, diasAtras(5), diasAtras(10)); // idem
    await resolvidaEm(bairro.id, diasAtras(40), diasAtras(45)); // resolvida fora da janela
    await criarDenunciaNoBanco({ bairroId: bairro.id, criadoEm: diasAtras(3) }); // só registrada
    await criarDenunciaNoBanco({ bairroId: bairro.id, criadoEm: diasAtras(4) }); // só registrada

    const res = await obter(operador.token);

    // registradas na janela: 4 (as duas resolvidas na janela + as duas em aberto)
    expect(res.body).toMatchObject({ resolvidas: 2, denunciasRegistradas: 4, taxaResolucao: 0.5 });
  });

  it('uma mudança só da previsão não conta como resolvida nem como status', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();
    const d = await criarDenunciaNoBanco({ bairroId: bairro.id, criadoEm: diasAtras(1) });
    await prisma.historicoStatus.create({
      data: {
        denunciaId: d.id,
        evento: 'PREVISAO',
        statusAnterior: 'RECEBIDA',
        statusNovo: 'RECEBIDA',
        papelAutor: 'OPERADOR',
        criadoEm: diasAtras(1),
      },
    });

    const res = await obter(operador.token);

    expect(res.body.resolvidas).toBe(0);
  });

  it('a taxa é limitada a 100% (resolvidas na janela de denúncias antigas)', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();
    await resolvidaEm(bairro.id, diasAtras(1), diasAtras(50));
    await resolvidaEm(bairro.id, diasAtras(2), diasAtras(50));

    const res = await obter(operador.token);

    expect(res.body).toMatchObject({ resolvidas: 2, denunciasRegistradas: 0, taxaResolucao: 0 });
  });

  it('o lote em bairro conta nas resolvidas (histórico por denúncia)', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();
    await criarDenunciaNoBanco({ bairroId: bairro.id, criadoEm: diasAtras(1) });
    await criarDenunciaNoBanco({
      bairroId: bairro.id,
      status: 'EM_ATENDIMENTO',
      criadoEm: diasAtras(1),
    });
    await request(app)
      .post(`/api/v1/painel/bairros/${bairro.id}/resolver`)
      .set(comToken(operador.token))
      .send({ confirmacao: true });

    const res = await obter(operador.token);

    expect(res.body).toMatchObject({
      resolvidas: 2,
      denunciasRegistradas: 2,
      emAtendimento: 0,
      taxaResolucao: 1,
    });
  });

  it('cidadão: 403; sem login: 401; a rota antiga /indicadores não existe', async () => {
    const maria = await registrarCidadao(app);

    expect((await obter(maria.token)).status).toBe(403);
    expect((await request(app).get('/api/v1/painel/indicadores')).status).toBe(401);
    expect((await request(app).get('/api/v1/indicadores').set(comToken(maria.token))).status).toBe(
      404,
    );
  });
});

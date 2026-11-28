import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

const statusAtualizado = vi.fn(async (_evento: StatusAtualizadoEvento) => undefined);
const app = criarAppDeTeste({}, { publicador: { denunciaCriada: vi.fn(), statusAtualizado } });

beforeEach(async () => {
  await limparBanco();
  statusAtualizado.mockClear();
});
afterAll(() => prisma.$disconnect());

const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
const resolver = (
  token: string,
  bairroId: number | string,
  corpo: object = { confirmacao: true },
) =>
  request(app).post(`/api/v1/painel/bairros/${bairroId}/resolver`).set(comToken(token)).send(corpo);
const statusDoBanco = async (id: string) =>
  (await prisma.denuncia.findUniqueOrThrow({ where: { id } })).status;

describe('GET /painel/bairros (RF-034)', () => {
  it('agrupa as denúncias em aberto por bairro, com contagens por tipo, status e prioritárias', async () => {
    const operador = await entrarComoOperador(app);
    const a = await criarBairro({ nome: 'Cidade Nova', folha: null });
    const b = await criarBairro({ nome: 'Nova Marabá' });
    await criarDenunciaNoBanco({ bairroId: a.id });
    await criarDenunciaNoBanco({
      bairroId: a.id,
      tipo: 'OSCILACAO',
      status: 'EM_ATENDIMENTO',
      necessidadeEspecial: true,
    });
    await criarDenunciaNoBanco({ bairroId: a.id, status: 'RESOLVIDA' });
    await criarDenunciaNoBanco({ bairroId: b.id, status: 'CANCELADA' });

    const res = await request(app).get('/api/v1/painel/bairros').set(comToken(operador.token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      bairros: [
        {
          bairroId: a.id,
          nome: 'Cidade Nova',
          folha: null,
          emAberto: 2,
          porTipo: { SEM_ENERGIA: 1, OSCILACAO: 1 },
          porStatus: { RECEBIDA: 1, EM_ATENDIMENTO: 1 },
          prioritarias: 1,
        },
      ],
    });
  });

  it('sem denúncias em aberto, lista vazia', async () => {
    const operador = await entrarComoOperador(app);

    const res = await request(app).get('/api/v1/painel/bairros').set(comToken(operador.token));

    expect(res.body).toEqual({ bairros: [] });
  });

  it('cidadão: 403; sem login: 401', async () => {
    const maria = await registrarCidadao(app);

    expect(
      (await request(app).get('/api/v1/painel/bairros').set(comToken(maria.token))).status,
    ).toBe(403);
    expect((await request(app).get('/api/v1/painel/bairros')).status).toBe(401);
  });
});

describe('POST /painel/bairros/:bairroId/resolver (RF-034, RN-016)', () => {
  it('resolve só as em aberto do bairro; as encerradas e as de outro bairro ficam como estão', async () => {
    const operador = await entrarComoOperador(app);
    const alvo = await criarBairro({ nome: 'Alvo' });
    const outro = await criarBairro({ nome: 'Outro' });
    const recebida = await criarDenunciaNoBanco({ bairroId: alvo.id });
    const emAtendimento = await criarDenunciaNoBanco({
      bairroId: alvo.id,
      status: 'EM_ATENDIMENTO',
    });
    const improcedente = await criarDenunciaNoBanco({ bairroId: alvo.id, status: 'IMPROCEDENTE' });
    const cancelada = await criarDenunciaNoBanco({ bairroId: alvo.id, status: 'CANCELADA' });
    const deOutro = await criarDenunciaNoBanco({ bairroId: outro.id });

    const res = await resolver(operador.token, alvo.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ resolvidas: 2 });
    expect(await statusDoBanco(recebida.id)).toBe('RESOLVIDA');
    expect(await statusDoBanco(emAtendimento.id)).toBe('RESOLVIDA');
    expect(await statusDoBanco(improcedente.id)).toBe('IMPROCEDENTE');
    expect(await statusDoBanco(cancelada.id)).toBe('CANCELADA');
    expect(await statusDoBanco(deOutro.id)).toBe('RECEBIDA');
  });

  it('RECEBIDA vai direto para RESOLVIDA só no lote (a rota normal continua recusando)', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();
    const d = await criarDenunciaNoBanco({ bairroId: bairro.id });

    const normal = await request(app)
      .patch(`/api/v1/painel/denuncias/${d.id}/status`)
      .set(comToken(operador.token))
      .send({ status: 'RESOLVIDA' });
    expect(normal.status).toBe(422);
    expect(await statusDoBanco(d.id)).toBe('RECEBIDA');

    await resolver(operador.token, bairro.id);

    expect(await statusDoBanco(d.id)).toBe('RESOLVIDA');
  });

  it('grava um registro no histórico por denúncia (RN-011), com o operador e a data de fim', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();
    const a = await criarDenunciaNoBanco({ bairroId: bairro.id });
    const b = await criarDenunciaNoBanco({ bairroId: bairro.id, status: 'EM_ATENDIMENTO' });

    await resolver(operador.token, bairro.id);

    for (const [d, anterior] of [
      [a, 'RECEBIDA'],
      [b, 'EM_ATENDIMENTO'],
    ] as const) {
      const historico = await prisma.historicoStatus.findMany({ where: { denunciaId: d.id } });
      expect(historico).toHaveLength(1);
      expect(historico[0]).toMatchObject({
        evento: 'STATUS',
        statusAnterior: anterior,
        statusNovo: 'RESOLVIDA',
        papelAutor: 'OPERADOR',
        alteradoPorId: operador.id,
      });
      const salva = await prisma.denuncia.findUniqueOrThrow({ where: { id: d.id } });
      expect(salva.finalizadaEm).not.toBeNull();
    }
  });

  it('apaga a necessidade especial e o consentimento ao resolver (RN-026)', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();
    const d = await criarDenunciaNoBanco({ bairroId: bairro.id, necessidadeEspecial: true });

    await resolver(operador.token, bairro.id);

    expect(await prisma.denuncia.findUniqueOrThrow({ where: { id: d.id } })).toMatchObject({
      status: 'RESOLVIDA',
      necessidadeEspecial: null,
      consentimentoNecessidadeEm: null,
    });
  });

  it('emite um evento denuncia:status-atualizado por denúncia resolvida, depois do commit', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();
    await criarDenunciaNoBanco({ bairroId: bairro.id });
    await criarDenunciaNoBanco({ bairroId: bairro.id, status: 'EM_ATENDIMENTO' });
    await criarDenunciaNoBanco({ bairroId: bairro.id, status: 'RESOLVIDA' });

    await resolver(operador.token, bairro.id);

    expect(statusAtualizado).toHaveBeenCalledTimes(2);
    for (const [evento] of statusAtualizado.mock.calls) {
      expect(evento.denuncia.status).toBe('RESOLVIDA');
      expect(evento.por).toBe('Equatorial Pará');
    }
    expect(statusAtualizado.mock.calls.map(([e]) => e.statusAnterior).sort()).toEqual([
      'EM_ATENDIMENTO',
      'RECEBIDA',
    ]);
  });

  it('bairro sem denúncias em aberto: 200 com resolvidas 0 e nenhum evento', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();

    const res = await resolver(operador.token, bairro.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ resolvidas: 0 });
    expect(statusAtualizado).not.toHaveBeenCalled();
  });

  it('sem a confirmação (ausente, false ou outro valor): 400 e nada muda', async () => {
    const operador = await entrarComoOperador(app);
    const bairro = await criarBairro();
    const d = await criarDenunciaNoBanco({ bairroId: bairro.id });

    for (const corpo of [{}, { confirmacao: false }, { confirmacao: 'true' }, { confirmacao: 1 }]) {
      const res = await resolver(operador.token, bairro.id, corpo);
      expect(res.status).toBe(400);
      expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
    }
    expect(await statusDoBanco(d.id)).toBe('RECEBIDA');
    expect(statusAtualizado).not.toHaveBeenCalled();
  });

  it('bairro inexistente: 404; id que não é número: 400', async () => {
    const operador = await entrarComoOperador(app);

    expect((await resolver(operador.token, 999999)).status).toBe(404);
    expect((await resolver(operador.token, 'abc')).status).toBe(400);
  });

  it('cidadão: 403 e nada muda; sem login: 401', async () => {
    const maria = await registrarCidadao(app);
    const bairro = await criarBairro();
    const d = await criarDenunciaNoBanco({ bairroId: bairro.id, autorId: maria.id });

    expect((await resolver(maria.token, bairro.id)).status).toBe(403);
    const semLogin = await request(app)
      .post(`/api/v1/painel/bairros/${bairro.id}/resolver`)
      .send({ confirmacao: true });
    expect(semLogin.status).toBe(401);
    expect(await statusDoBanco(d.id)).toBe('RECEBIDA');
  });

  it('depois do lote, o cidadão pode abrir uma nova denúncia (a resolvida não conta como em aberto)', async () => {
    const operador = await entrarComoOperador(app);
    const maria = await registrarCidadao(app);
    const bairro = await criarBairro();
    await criarDenunciaNoBanco({ bairroId: bairro.id, autorId: maria.id });
    await resolver(operador.token, bairro.id);

    const nova = await request(app)
      .post('/api/v1/denuncias')
      .set(comToken(maria.token))
      .send({ tipo: 'SEM_ENERGIA', bairroId: bairro.id, logradouro: 'Av. VP-3' });

    expect(nova.status).toBe(201);
  });
});

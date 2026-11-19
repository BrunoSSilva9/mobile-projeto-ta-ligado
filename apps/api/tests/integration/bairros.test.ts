import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  criarAppDeTeste,
  criarBairro,
  entrarComoOperador,
  limparBanco,
  prisma,
  registrarCidadao,
} from '../helpers/banco';

const app = criarAppDeTeste();

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

describe('GET /api/v1/bairros (RN-021)', () => {
  it('lista a base fixa de bairros e folhas, em ordem, com coordenadas numéricas', async () => {
    await criarBairro({ nome: 'Nova Marabá', folha: 'Folha 32' });
    await criarBairro({ nome: 'Cidade Nova', folha: null, latitude: -5.359, longitude: -49.105 });
    await criarBairro({ nome: 'Nova Marabá', folha: 'Folha 28' });
    const { token } = await registrarCidadao(app);

    const res = await request(app).get('/api/v1/bairros').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(
      res.body.bairros.map((b: { nome: string; folha: string | null }) => `${b.nome}|${b.folha}`),
    ).toEqual(['Cidade Nova|null', 'Nova Marabá|Folha 28', 'Nova Marabá|Folha 32']);
    expect(res.body.bairros[0]).toEqual({
      id: expect.any(Number),
      nome: 'Cidade Nova',
      folha: null,
      latitude: -5.359,
      longitude: -49.105,
    });
  });

  it('o operador também pode consultar', async () => {
    await criarBairro();
    const operador = await entrarComoOperador(app);

    const res = await request(app)
      .get('/api/v1/bairros')
      .set('Authorization', `Bearer ${operador.token}`);
    expect(res.status).toBe(200);
    expect(res.body.bairros).toHaveLength(1);
  });

  it('sem token: 401', async () => {
    expect((await request(app).get('/api/v1/bairros')).status).toBe(401);
  });
});

describe('GET /api/v1/bairros/proximo (RF-016, RN-025)', () => {
  beforeEach(async () => {
    await criarBairro({
      nome: 'Nova Marabá',
      folha: 'Folha 28',
      latitude: -5.34,
      longitude: -49.082,
    });
    await criarBairro({ nome: 'Cidade Nova', folha: null, latitude: -5.359, longitude: -49.105 });
    await criarBairro({ nome: 'São Félix', folha: null, latitude: -5.379, longitude: -49.144 });
  });

  const buscar = (token: string, consulta: string) =>
    request(app).get(`/api/v1/bairros/proximo${consulta}`).set('Authorization', `Bearer ${token}`);

  it('devolve o bairro de centro mais próximo, com a distância', async () => {
    const { token } = await registrarCidadao(app);

    const res = await buscar(token, '?lat=-5.358&lng=-49.104');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: 'Cidade Nova', folha: null });
    expect(res.body.distanciaKm).toBeGreaterThan(0);
    expect(res.body.distanciaKm).toBeLessThan(0.5);
  });

  it('escolhe corretamente entre os bairros', async () => {
    const { token } = await registrarCidadao(app);

    expect((await buscar(token, '?lat=-5.341&lng=-49.083')).body).toMatchObject({
      nome: 'Nova Marabá',
      folha: 'Folha 28',
    });
    expect((await buscar(token, '?lat=-5.38&lng=-49.14')).body.nome).toBe('São Félix');
  });

  it('fora do raio de 15 km: 404, e o usuário escolhe o bairro manualmente', async () => {
    const { token } = await registrarCidadao(app);

    const res = await buscar(token, '?lat=-1.4558&lng=-48.4902'); // Belém
    expect(res.status).toBe(404);
    expect(res.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  it.each([
    ['sem parâmetros', ''],
    ['latitude inválida', '?lat=abc&lng=-49.1'],
    ['latitude fora do intervalo', '?lat=91&lng=-49.1'],
    ['longitude fora do intervalo', '?lat=-5.3&lng=181'],
    ['sem longitude', '?lat=-5.3'],
  ])('recusa %s com 400', async (_nome, consulta) => {
    const { token } = await registrarCidadao(app);
    const res = await buscar(token, consulta);

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
  });

  it('sem token: 401; operador: 403', async () => {
    expect((await request(app).get('/api/v1/bairros/proximo?lat=-5.3&lng=-49.1')).status).toBe(401);
    const operador = await entrarComoOperador(app);
    expect((await buscar(operador.token, '?lat=-5.3&lng=-49.1')).status).toBe(403);
  });
});

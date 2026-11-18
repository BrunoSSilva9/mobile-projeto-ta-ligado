import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';

describe('GET /health', () => {
  it('responde 200 com db "up" quando o banco responde', async () => {
    const app = createApp({ checkDb: async () => true });
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('responde 503 "degraded" quando o banco falha', async () => {
    const app = createApp({
      checkDb: async () => {
        throw new Error('sem conexão');
      },
    });
    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', db: 'down' });
  });

  it('responde 200 com db "unknown" quando não há verificação de banco', async () => {
    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'unknown' });
  });
});

describe('tratamento de erros', () => {
  it('rota inexistente devolve 404 no formato padrão da API', async () => {
    const res = await request(createApp()).get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Rota não encontrada.' },
    });
  });

  it('JSON inválido devolve 400 VALIDACAO_ERRO', async () => {
    const res = await request(createApp())
      .post('/qualquer')
      .set('Content-Type', 'application/json')
      .send('{invalido');

    expect(res.status).toBe(400);
    expect(res.body.erro.codigo).toBe('VALIDACAO_ERRO');
  });
});

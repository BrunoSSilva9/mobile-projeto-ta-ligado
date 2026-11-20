import express from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { criarAutenticacao } from '../../src/shared/auth';
import { AppError, corpoDeErro } from '../../src/shared/errors';
import { criarAppDeTeste, criarOperador, limparBanco, prisma, SEGREDO_JWT } from '../helpers/banco';

/** App mínimo, só para provar o `exigirPapel` (RBAC, RN-001) em rotas protegidas por papel. */
function appComRotasPorPapel() {
  const { autenticar, exigirPapel } = criarAutenticacao(prisma, SEGREDO_JWT);
  const app = express();
  app.get('/so-operador', autenticar, exigirPapel('OPERADOR'), (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/so-cidadao', autenticar, exigirPapel('CIDADAO'), (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/qualquer-papel', autenticar, exigirPapel('CIDADAO', 'OPERADOR'), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        res.status(err.status).json(corpoDeErro(err));
        return;
      }
      res.status(500).json({});
    },
  );
  return app;
}

const apiCompleta = criarAppDeTeste();
const app = appComRotasPorPapel();

async function tokenDeCidadao() {
  const res = await request(apiCompleta).post('/api/v1/auth/register').send({
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    senha: 'minhasenha1',
    aceiteTermos: true,
    versaoTermos: '2026-11',
  });
  return res.body.token as string;
}

async function tokenDeOperador() {
  const operador = await criarOperador();
  const res = await request(apiCompleta)
    .post('/api/v1/auth/login')
    .send({ email: operador.email, senha: operador.senha });
  return res.body.token as string;
}

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

describe('exigirPapel (RBAC)', () => {
  it('sem token: 401 em qualquer rota protegida', async () => {
    for (const rota of ['/so-operador', '/so-cidadao', '/qualquer-papel']) {
      const res = await request(app).get(rota);
      expect(res.status).toBe(401);
    }
  });

  it('cidadão: 403 na rota de operador, 200 na de cidadão', async () => {
    const token = await tokenDeCidadao();

    const operador = await request(app).get('/so-operador').set('Authorization', `Bearer ${token}`);
    expect(operador.status).toBe(403);
    expect(operador.body.erro.codigo).toBe('SEM_PERMISSAO');

    const cidadao = await request(app).get('/so-cidadao').set('Authorization', `Bearer ${token}`);
    expect(cidadao.status).toBe(200);
  });

  it('operador: 200 na rota de operador, 403 na de cidadão', async () => {
    const token = await tokenDeOperador();

    const operador = await request(app).get('/so-operador').set('Authorization', `Bearer ${token}`);
    expect(operador.status).toBe(200);

    const cidadao = await request(app).get('/so-cidadao').set('Authorization', `Bearer ${token}`);
    expect(cidadao.status).toBe(403);
  });

  it('rota liberada para os dois papéis aceita ambos', async () => {
    for (const token of [await tokenDeCidadao(), await tokenDeOperador()]) {
      const res = await request(app).get('/qualquer-papel').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    }
  });
});

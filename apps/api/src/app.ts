import type { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express, { type ErrorRequestHandler, type Express } from 'express';
import helmet from 'helmet';

import type { Publicador } from './realtime/publicador';
import { criarRotas } from './routes';
import { AppError, corpoDeErro, erros } from './shared/errors';
import type { LimitesDeTaxa } from './shared/rate-limit';

export type AppDeps = {
  /** Origens permitidas no CORS (painel web). */
  corsOrigins?: string[];
  /** Verifica a conexão com o banco. Injetado para facilitar testes. */
  checkDb?: () => Promise<boolean>;
  /** Banco e segredo do JWT. Sem eles, só o `/health` fica disponível. */
  prisma?: PrismaClient;
  segredoJwt?: string;
  limites?: Partial<LimitesDeTaxa>;
  bcryptCost?: number;
  /** Emissor de eventos em tempo real (Passo 4). */
  publicador?: Publicador;
  /** Relógio injetável (testes). */
  relogio?: () => Date;
};

/** Cria o app Express (sem abrir porta). */
export function createApp({
  corsOrigins = [],
  checkDb,
  prisma,
  segredoJwt,
  limites,
  bcryptCost,
  publicador,
  relogio,
}: AppDeps = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : false }));
  app.use(express.json({ limit: '1mb' }));

  // Saúde da API (critério de pronto da Fase 0).
  app.get('/health', async (_req, res) => {
    let db: 'up' | 'down' | 'unknown' = 'unknown';
    if (checkDb) {
      try {
        db = (await checkDb()) ? 'up' : 'down';
      } catch {
        db = 'down';
      }
    }
    const status = db === 'down' ? 'degraded' : 'ok';
    res.status(db === 'down' ? 503 : 200).json({
      status,
      db,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  if (prisma && segredoJwt) {
    app.use(
      '/api/v1',
      criarRotas({ prisma, segredoJwt, limites, bcryptCost, publicador, relogio }),
    );
  }

  app.use((_req, _res, next) => next(erros.naoEncontrado('Rota não encontrada.')));

  const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json(corpoDeErro(err));
      return;
    }
    // JSON inválido no corpo da requisição
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ erro: { codigo: 'VALIDACAO_ERRO', mensagem: 'JSON inválido.' } });
      return;
    }
    console.error(err);
    res.status(500).json({ erro: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno.' } });
  };
  app.use(tratarErros);

  return app;
}

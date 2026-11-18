import cors from 'cors';
import express, { type ErrorRequestHandler, type Express } from 'express';
import helmet from 'helmet';

import { AppError, corpoDeErro, erros } from './shared/errors';

export type AppDeps = {
  /** Origens permitidas no CORS (painel web). */
  corsOrigins?: string[];
  /** Verifica a conexão com o banco. Injetado para facilitar testes. */
  checkDb?: () => Promise<boolean>;
};

/** Cria o app Express (sem abrir porta). Rotas de negócio entram na Fase 1. */
export function createApp({ corsOrigins = [], checkDb }: AppDeps = {}): Express {
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

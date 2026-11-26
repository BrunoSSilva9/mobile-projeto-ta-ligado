import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { erros } from './errors';

export type LimitesDeTaxa = {
  /** Requisições por janela, por IP (limite geral). */
  geral: number;
  /** Tentativas de login com falha por janela, por IP e e-mail. */
  login: number;
  janelaMs: number;
};

/** Valores da decisão S-18: 100 requisições/min por IP e 5 tentativas de login/min por IP e e-mail. */
export const LIMITES_PADRAO: LimitesDeTaxa = { geral: 100, login: 5, janelaMs: 60_000 };

export function limitadorGeral(limites: LimitesDeTaxa): RequestHandler {
  return rateLimit({
    windowMs: limites.janelaMs,
    limit: limites.geral,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(erros.muitasRequisicoes()),
  });
}

/**
 * Limita as tentativas de login (RNF-014). Só conta as que falham, para não punir quem acerta.
 * A chave combina o IP e o e-mail informado.
 */
export function limitadorLogin(limites: LimitesDeTaxa): RequestHandler {
  return rateLimit({
    windowMs: limites.janelaMs,
    limit: limites.login,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      return `${ipKeyGenerator(req.ip ?? '')}|${email}`;
    },
    handler: (_req, _res, next) => next(erros.muitasRequisicoes()),
  });
}

/**
 * Limita as tentativas de **exclusão de conta** com senha errada (S-59), com o mesmo critério do
 * login: só conta as que falham e usa os mesmos limites (5 por minuto). A chave combina o IP e a
 * conta, então vem **depois** da autenticação.
 */
export function limitadorExclusaoDeConta(limites: LimitesDeTaxa): RequestHandler {
  return rateLimit({
    windowMs: limites.janelaMs,
    limit: limites.login,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}|excluir|${req.usuario?.id ?? ''}`,
    handler: (_req, _res, next) => next(erros.muitasRequisicoes()),
  });
}

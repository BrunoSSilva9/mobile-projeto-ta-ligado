import type { RequestHandler } from 'express';
import { z, type ZodType } from 'zod';

import { erros } from './errors';

// Mensagens de validação do Zod em português (RNF-005).
z.config(z.locales.pt());

/**
 * Valida (e normaliza) o corpo da requisição com um schema Zod.
 * Em caso de erro responde 400 `VALIDACAO_ERRO` com os detalhes por campo (docs/10-api.md).
 */
export function validarCorpo<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const resultado = schema.safeParse(req.body ?? {});
    if (!resultado.success) {
      const detalhes = resultado.error.issues.map((problema) => ({
        campo: problema.path.map(String).join('.') || undefined,
        mensagem: problema.message,
      }));
      next(erros.validacao(detalhes));
      return;
    }
    req.body = resultado.data;
    next();
  };
}

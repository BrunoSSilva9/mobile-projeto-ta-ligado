import type { RequestHandler } from 'express';
import { z, type ZodType } from 'zod';

import { erros } from './errors';

// Mensagens de validação do Zod em português (RNF-005).
z.config(z.locales.pt());

/** Texto vazio ou `null` viram "ausente": campos opcionais que o cliente manda em branco. */
export const vazioOuNuloViraAusente = (valor: unknown) => {
  if (valor === null) return undefined;
  if (typeof valor === 'string' && valor.trim() === '') return undefined;
  return valor;
};

/**
 * Valida um valor com um schema Zod e devolve o resultado normalizado.
 * Em caso de erro lança 400 `VALIDACAO_ERRO` com os detalhes por campo (docs/10-api.md).
 */
export function analisar<T>(schema: ZodType<T>, valor: unknown): T {
  const resultado = schema.safeParse(valor);
  if (!resultado.success) {
    throw erros.validacao(
      resultado.error.issues.map((problema) => ({
        campo: problema.path.map(String).join('.') || undefined,
        mensagem: problema.message,
      })),
    );
  }
  return resultado.data;
}

/** Middleware que valida (e normaliza) o corpo da requisição. */
export function validarCorpo<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    try {
      req.body = analisar(schema, req.body ?? {});
      next();
    } catch (erro) {
      next(erro);
    }
  };
}

import jwt from 'jsonwebtoken';

import type { Papel } from '../../domain';

/** Validade do token por papel (decisão S-35): cidadão 7 dias; operador 8 horas. */
export const VALIDADE_TOKEN_SEGUNDOS: Record<Papel, number> = {
  CIDADAO: 7 * 24 * 60 * 60,
  OPERADOR: 8 * 60 * 60,
};

export type ConteudoDoToken = {
  sub: string;
  papel: Papel;
};

export function gerarToken(usuarioId: string, papel: Papel, segredo: string): string {
  return jwt.sign({ papel }, segredo, {
    algorithm: 'HS256',
    subject: usuarioId,
    expiresIn: VALIDADE_TOKEN_SEGUNDOS[papel],
  });
}

/** Valida assinatura e validade. Devolve `null` para qualquer token inválido ou expirado. */
export function verificarToken(token: string, segredo: string): ConteudoDoToken | null {
  try {
    const conteudo = jwt.verify(token, segredo, { algorithms: ['HS256'] });
    if (typeof conteudo === 'string' || typeof conteudo.sub !== 'string') return null;
    if (conteudo.papel !== 'CIDADAO' && conteudo.papel !== 'OPERADOR') return null;
    return { sub: conteudo.sub, papel: conteudo.papel };
  } catch {
    return null;
  }
}

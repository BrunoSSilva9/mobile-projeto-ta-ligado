import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { gerarToken, VALIDADE_TOKEN_SEGUNDOS, verificarToken } from '../../src/modules/auth/token';

const SEGREDO = 'segredo-de-teste-com-mais-de-16-caracteres';

describe('token JWT (ADR-0004, S-35)', () => {
  it('a validade é de 7 dias para o cidadão e 8 horas para o operador', () => {
    expect(VALIDADE_TOKEN_SEGUNDOS.CIDADAO).toBe(604_800);
    expect(VALIDADE_TOKEN_SEGUNDOS.OPERADOR).toBe(28_800);
  });

  it('gera um token que volta com o id e o papel', () => {
    const token = gerarToken('usuario-1', 'OPERADOR', SEGREDO);
    expect(verificarToken(token, SEGREDO)).toEqual({ sub: 'usuario-1', papel: 'OPERADOR' });
  });

  it('usa HS256', () => {
    const token = gerarToken('u', 'CIDADAO', SEGREDO);
    expect(jwt.decode(token, { complete: true })?.header.alg).toBe('HS256');
  });

  it('recusa assinatura de outro segredo', () => {
    const token = gerarToken('u', 'CIDADAO', 'outro-segredo-diferente-123');
    expect(verificarToken(token, SEGREDO)).toBeNull();
  });

  it('recusa token expirado', () => {
    const token = jwt.sign({ papel: 'CIDADAO' }, SEGREDO, { subject: 'u', expiresIn: -5 });
    expect(verificarToken(token, SEGREDO)).toBeNull();
  });

  it('recusa algoritmo diferente de HS256', () => {
    const token = jwt.sign({ papel: 'CIDADAO' }, SEGREDO, { subject: 'u', algorithm: 'HS512' });
    expect(verificarToken(token, SEGREDO)).toBeNull();
  });

  it('recusa token sem sub ou com papel desconhecido', () => {
    expect(verificarToken(jwt.sign({ papel: 'CIDADAO' }, SEGREDO), SEGREDO)).toBeNull();
    expect(
      verificarToken(jwt.sign({ papel: 'ADMIN' }, SEGREDO, { subject: 'u' }), SEGREDO),
    ).toBeNull();
    expect(verificarToken(jwt.sign({}, SEGREDO, { subject: 'u' }), SEGREDO)).toBeNull();
  });

  it('recusa lixo', () => {
    expect(verificarToken('', SEGREDO)).toBeNull();
    expect(verificarToken('abc.def.ghi', SEGREDO)).toBeNull();
  });
});

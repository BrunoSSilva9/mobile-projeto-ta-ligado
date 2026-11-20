import { describe, expect, it } from 'vitest';

import { normalizarTexto } from '../../src/shared/texto';

describe('normalizarTexto', () => {
  it.each([
    ['Marabá', 'maraba'],
    ['  São Félix  ', 'sao felix'],
    ['FOLHA 28', 'folha 28'],
    ['Ação', 'acao'],
    ['', ''],
  ])('%j → %j', (entrada, esperado) => {
    expect(normalizarTexto(entrada)).toBe(esperado);
  });

  it('funciona com acentos já decompostos', () => {
    expect(normalizarTexto('Marábá')).toBe('maraba');
  });
});

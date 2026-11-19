import { describe, expect, it } from 'vitest';

import { taxaResolucao } from '../../src/domain';

describe('taxaResolucao (RN-017)', () => {
  it('calcula resolvidas ÷ registradas com 2 casas', () => {
    expect(taxaResolucao(591, 698)).toBe(0.85);
    expect(taxaResolucao(1, 3)).toBe(0.33);
    expect(taxaResolucao(1, 2)).toBe(0.5);
  });

  it('limita a taxa a 100% (resolvidas podem incluir denúncias de períodos anteriores)', () => {
    expect(taxaResolucao(120, 100)).toBe(1);
  });

  it('sem denúncias registradas, a taxa é 0', () => {
    expect(taxaResolucao(0, 0)).toBe(0);
    expect(taxaResolucao(5, 0)).toBe(0);
  });

  it('sem resolvidas, a taxa é 0', () => {
    expect(taxaResolucao(0, 10)).toBe(0);
  });

  it('valores negativos não geram taxa', () => {
    expect(taxaResolucao(-3, 10)).toBe(0);
    expect(taxaResolucao(3, -10)).toBe(0);
  });
});

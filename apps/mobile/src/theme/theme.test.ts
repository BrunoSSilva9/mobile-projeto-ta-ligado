import { colors, contrastRatio, hitSlopFor, size } from '@/theme';

describe('tokens de cor (decisão D-01)', () => {
  it('texto branco sobre o fundo de botão `action` passa em AA (>= 4,5:1)', () => {
    expect(contrastRatio(colors.white, colors.action)).toBeGreaterThanOrEqual(4.5);
  });

  it('o verde `primary` do Figma NÃO serve para texto branco (< 4,5:1), só para elementos sem texto', () => {
    expect(contrastRatio(colors.white, colors.primary)).toBeLessThan(4.5);
    expect(contrastRatio(colors.white, colors.primary)).toBeGreaterThanOrEqual(3);
  });

  it('texto âmbar `flickerText` sobre branco passa em AA', () => {
    expect(contrastRatio(colors.status.flickerText, colors.white)).toBeGreaterThanOrEqual(4.5);
  });

  it('o âmbar original do Figma não passa como texto', () => {
    expect(contrastRatio(colors.status.flicker, colors.white)).toBeLessThan(4.5);
  });

  it('textos principais passam em AA sobre o fundo da página', () => {
    expect(contrastRatio(colors.textPrimary, colors.bgPage)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.textSecondary, colors.bgPage)).toBeGreaterThanOrEqual(4.5);
  });

  it('o "?" lima do logo passa sobre o verde escuro', () => {
    expect(contrastRatio(colors.lime, colors.brand900)).toBeGreaterThanOrEqual(4.5);
  });

  it('o status "sem luz" com texto branco passa em AA', () => {
    expect(contrastRatio(colors.white, colors.status.noPower)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('alvos de toque (decisão D-02)', () => {
  it('o alvo mínimo é 48 dp', () => {
    expect(size.touchMin).toBe(48);
  });

  it('hitSlopFor completa elementos menores até 48 dp', () => {
    const visual = 32;
    const slop = hitSlopFor(visual);
    expect(visual + slop.top + slop.bottom).toBeGreaterThanOrEqual(48);
    expect(visual + slop.left + slop.right).toBeGreaterThanOrEqual(48);
  });

  it('hitSlopFor não adiciona nada a elementos que já têm 48 dp ou mais', () => {
    expect(hitSlopFor(56)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});

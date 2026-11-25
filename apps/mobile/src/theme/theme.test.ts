import {
  colors,
  contrastRatio,
  fontFamily,
  hitSlopFor,
  radius,
  shadow,
  size,
  space,
  type,
} from '@/theme';

/** Texto precisa de 4,5:1 (WCAG 1.4.3); ícones e bordas de componentes, de 3:1 (WCAG 1.4.11). */
const TEXTO = 4.5;
const ICONE_OU_BORDA = 3;

const { situacao, andamento } = colors;

describe('contraste do texto (>= 4,5:1)', () => {
  const pares: [string, string, string][] = [
    ['branco sobre `action` (botão)', colors.onAction, colors.action],
    ['`action` sobre `actionSoft`', colors.action, colors.actionSoft],
    ['`actionPressed` sobre `actionSoft`', colors.actionPressed, colors.actionSoft],
    ['`actionPressed` sobre a pílula da aba ativa', colors.actionPressed, colors.actionTabPill],
    ['`action` (link) sobre branco', colors.action, colors.surface],
    ['`action` (link) sobre o fundo da tela', colors.action, colors.bgPage],
    ['`textPrimary` sobre o fundo da tela', colors.textPrimary, colors.bgPage],
    ['`textPrimary` sobre branco', colors.textPrimary, colors.surface],
    ['`textSecondary` sobre branco', colors.textSecondary, colors.surface],
    ['`textSecondary` sobre o fundo da tela', colors.textSecondary, colors.bgPage],
    ['texto do botão desativado', colors.disabledText, colors.disabledBg],
    ['branco sobre o azul-noite da marca', colors.onAction, colors.brandNavy],
    ['erro (`danger`) sobre branco', colors.danger, colors.surface],
    ['erro (`danger`) sobre o fundo da tela', colors.danger, colors.bgPage],
  ];
  it.each(pares)('%s', (_nome, frente, fundo) => {
    expect(contrastRatio(frente, fundo)).toBeGreaterThanOrEqual(TEXTO);
  });
});

describe('situação da energia: selo, ícone e marcador', () => {
  const chaves = Object.keys(situacao) as (keyof typeof situacao)[];

  it.each(chaves)('%s: texto e ícone do selo sobre o fundo do selo (>= 4,5:1)', (chave) => {
    const s = situacao[chave];
    expect(contrastRatio(s.texto, s.fundo)).toBeGreaterThanOrEqual(TEXTO);
  });

  it.each(chaves)('%s: texto sobre branco e sobre o fundo da tela (>= 4,5:1)', (chave) => {
    const s = situacao[chave];
    expect(contrastRatio(s.texto, colors.surface)).toBeGreaterThanOrEqual(TEXTO);
    expect(contrastRatio(s.texto, colors.bgPage)).toBeGreaterThanOrEqual(TEXTO);
  });

  it.each(chaves)('%s: ícone sobre o marcador (>= 3:1)', (chave) => {
    const s = situacao[chave];
    expect(contrastRatio(s.iconeNoMarcador, s.marcador)).toBeGreaterThanOrEqual(ICONE_OU_BORDA);
  });

  it('cada situação tem um ícone diferente (a cor nunca aparece sozinha, WCAG 1.4.1)', () => {
    const icones = chaves.map((c) => situacao[c].icone);
    expect(new Set(icones).size).toBe(chaves.length);
    expect(icones).toEqual(['flash-off', 'pulse', 'checkmark-circle']);
  });

  it('as três situações têm cores de texto diferentes entre si', () => {
    const textos = chaves.map((c) => situacao[c].texto);
    expect(new Set(textos).size).toBe(chaves.length);
  });

  describe('contorno externo do marcador no mapa (decisão R-14)', () => {
    /** Fundos típicos de mapa (Google/Apple): terreno, ruas, parque e água; mais a borda branca. */
    const FUNDOS_DE_MAPA: [string, string][] = [
      ['terreno', '#F2EFE9'],
      ['ruas', '#E5E3DF'],
      ['parque', '#C8E6C9'],
      ['água', '#AADAFF'],
      ['borda branca', '#FFFFFF'],
    ];

    it.each(chaves.flatMap((c) => FUNDOS_DE_MAPA.map(([nome, hex]) => [c, nome, hex] as const)))(
      '%s: contorno na cor do texto da situação contra %s (>= 3:1)',
      (chave, _nome, fundo) => {
        expect(contrastRatio(situacao[chave].texto, fundo)).toBeGreaterThanOrEqual(ICONE_OU_BORDA);
      },
    );

    it('Oscilando: o marcador laranja sozinho NÃO chega a 3:1 na borda branca (por isso o contorno)', () => {
      expect(contrastRatio(situacao.oscilando.marcador, colors.surface)).toBeLessThan(
        ICONE_OU_BORDA,
      );
      expect(contrastRatio(situacao.oscilando.texto, colors.surface)).toBeGreaterThanOrEqual(
        ICONE_OU_BORDA,
      );
    });
  });
});

describe('andamento da denúncia', () => {
  const chaves = Object.keys(andamento) as (keyof typeof andamento)[];

  it.each(chaves)('%s: texto sobre o fundo do selo (>= 4,5:1)', (chave) => {
    expect(contrastRatio(andamento[chave].texto, andamento[chave].fundo)).toBeGreaterThanOrEqual(
      TEXTO,
    );
  });

  it('Recebida, Em atendimento e Resolvida têm ícones diferentes', () => {
    expect(andamento.RECEBIDA.icone).toBe('time-outline');
    expect(andamento.EM_ATENDIMENTO.icone).toBe('construct-outline');
    expect(andamento.RESOLVIDA.icone).toBe('checkmark');
    expect(andamento.IMPROCEDENTE.icone).not.toBe(andamento.CANCELADA.icone);
  });
});

describe('bordas e marca (>= 3:1)', () => {
  it('borda de campos e chips (`borderField`) sobre branco e sobre o fundo da tela', () => {
    expect(contrastRatio(colors.borderField, colors.surface)).toBeGreaterThanOrEqual(
      ICONE_OU_BORDA,
    );
    expect(contrastRatio(colors.borderField, colors.bgPage)).toBeGreaterThanOrEqual(ICONE_OU_BORDA);
  });

  it('borda de erro (`danger`) sobre branco', () => {
    expect(contrastRatio(colors.danger, colors.surface)).toBeGreaterThanOrEqual(ICONE_OU_BORDA);
  });

  it('o raio lima do logo sobre o azul-noite', () => {
    expect(contrastRatio(colors.lime, colors.brandNavy)).toBeGreaterThanOrEqual(ICONE_OU_BORDA);
  });

  it('as bordas decorativas (`borderSubtle`, `borderDivider`) não carregam informação: não exigem contraste', () => {
    // Só documenta a regra: divisórias e bordas de cartão são decorativas; campos usam `borderField`.
    expect(contrastRatio(colors.borderSubtle, colors.surface)).toBeLessThan(ICONE_OU_BORDA);
  });
});

describe('tipografia (Atkinson Hyperlegible)', () => {
  const tokens = Object.entries(type);

  it('usa só a Atkinson Hyperlegible, em Regular e Bold', () => {
    expect(fontFamily.regular).toBe('AtkinsonHyperlegible_400Regular');
    expect(fontFamily.bold).toBe('AtkinsonHyperlegible_700Bold');
    for (const [, token] of tokens) {
      expect(Object.values(fontFamily)).toContain(token.fontFamily);
    }
  });

  it.each(tokens)('%s: nenhum tamanho abaixo de 14 e linha maior que o corpo', (_nome, token) => {
    expect(token.fontSize).toBeGreaterThanOrEqual(14);
    expect(token.lineHeight).toBeGreaterThan(token.fontSize);
  });

  it.each(tokens)('%s: sem letterSpacing negativo', (_nome, token) => {
    expect((token as { letterSpacing?: number }).letterSpacing ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('a escala nova tem os tamanhos do design system', () => {
    expect([type.title1.fontSize, type.title1.lineHeight]).toEqual([28, 34]);
    expect([type.title2.fontSize, type.title2.lineHeight]).toEqual([22, 28]);
    expect([type.title3.fontSize, type.title3.lineHeight]).toEqual([20, 26]);
    expect([type.button.fontSize, type.button.lineHeight]).toEqual([18, 24]);
    expect([type.body.fontSize, type.body.lineHeight]).toEqual([18, 28]);
    expect([type.bodySmall.fontSize, type.bodySmall.lineHeight]).toEqual([16, 24]);
    expect([type.label.fontSize, type.label.lineHeight]).toEqual([16, 22]);
    expect([type.caption.fontSize, type.caption.lineHeight]).toEqual([14, 20]);
  });

  it('títulos, botão e rótulo são Bold; corpo e legenda são Regular', () => {
    for (const bold of [type.title1, type.title2, type.title3, type.button, type.label]) {
      expect(bold.fontFamily).toBe(fontFamily.bold);
    }
    for (const regular of [type.body, type.bodySmall, type.caption]) {
      expect(regular.fontFamily).toBe(fontFamily.regular);
    }
  });
});

describe('espaço, cantos e sombra', () => {
  it('escala de espaço: 4, 8, 12, 16, 24, 32, 48', () => {
    expect([space.xs, space.s, space.m, space.l, space.xl, space.xxl, space.xxxl]).toEqual([
      4, 8, 12, 16, 24, 32, 48,
    ]);
  });

  it('cantos: campo 8, botão 12, cartão 16 e selo em pílula', () => {
    expect([radius.campo, radius.botao, radius.cartao]).toEqual([8, 12, 16]);
    expect(radius.pilula).toBeGreaterThanOrEqual(999);
  });

  it('só os botões que flutuam sobre o mapa têm sombra de verdade', () => {
    expect(shadow.flutuante.elevation).toBeGreaterThan(0);
  });
});

describe('alvos de toque (decisão D-02)', () => {
  it('o alvo mínimo é 48 dp, com 8 dp de espaço entre alvos', () => {
    expect(size.touchMin).toBe(48);
    expect(size.espacoEntreAlvos).toBe(8);
  });

  it('botões e campos têm 56 dp de altura', () => {
    expect(size.button).toBe(56);
    expect(size.field).toBe(56);
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

describe('apelidos temporários da migração (somem na etapa R10)', () => {
  it('os nomes antigos já apontam para os valores novos (nada de verde no tema)', () => {
    expect(colors.primary).toBe(colors.action);
    expect(colors.bgCard).toBe(colors.surface);
    expect(colors.white).toBe(colors.surface);
    expect(colors.status.noPowerText).toBe(situacao.semEnergia.texto);
    expect(colors.status.flickerText).toBe(situacao.oscilando.texto);
    expect(colors.status.restoredText).toBe(situacao.normal.texto);
    expect(type.h1).toEqual(type.title2);
    expect(type.subtitle).toEqual(type.label);
  });
});

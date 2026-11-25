/** Espaçamentos, cantos, tamanhos e sombra (design system v2, docs/06-design-system.md). */

/** Escala de espaço: 4, 8, 12, 16, 24, 32, 48. */
export const space = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  /** @deprecated fora da escala nova (migrar para `xs`) */
  half: 2,
} as const;

export const radius = {
  campo: 8,
  botao: 12,
  cartao: 16,
  pilula: 9999,
  /** @deprecated use `campo` */
  item: 8,
  /** @deprecated use `botao` */
  card: 12,
  /** @deprecated use `cartao` */
  cardLarge: 16,
  /** @deprecated use `pilula` */
  pill: 9999,
  /** @deprecated o logo é refeito na etapa R2 */
  logo: 10,
} as const;

export const size = {
  /** Alvo de toque mínimo (decisão D-02). Use hitSlop/padding se o visual for menor. */
  touchMin: 48,
  /** Espaço mínimo entre dois alvos de toque. */
  espacoEntreAlvos: 8,
  /** Altura de botões primário e secundário e de campos de texto. */
  button: 56,
  field: 56,
  header: 64,
  tabBar: 64,
  /** Largura-base do protótipo. */
  baseWidth: 390,
  /** @deprecated o FAB some na etapa R3 */
  fab: 56,
  /** @deprecated use `button` */
  buttonLarge: 56,
} as const;

/** Calcula o hitSlop necessário para um elemento visual atingir o alvo mínimo de toque. */
export function hitSlopFor(visualSize: number, min: number = size.touchMin) {
  const extra = Math.max(0, Math.ceil((min - visualSize) / 2));
  return { top: extra, bottom: extra, left: extra, right: extra };
}

/**
 * Quase não há sombra no app: os cartões são brancos sobre `bgPage`, sem sombra. A sombra fica só
 * em botões que flutuam sobre o mapa (ex.: "Onde estou").
 */
export const shadow = {
  flutuante: {
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  /** @deprecated cartões não têm sombra */
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  /** @deprecated cartões não têm sombra */
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  /** @deprecated o FAB some na etapa R3 */
  fab: {
    shadowColor: '#0B1F3A',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

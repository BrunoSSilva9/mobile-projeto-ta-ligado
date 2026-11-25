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
} as const;

export const radius = {
  campo: 8,
  botao: 12,
  cartao: 16,
  pilula: 9999,
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
} as const;

/** Espaçamentos, raios, tamanhos e sombras (docs/06-design-system.md). */
export const space = {
  half: 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  item: 8,
  logo: 10,
  card: 12,
  cardLarge: 16,
  pill: 9999,
} as const;

export const size = {
  /** Alvo de toque mínimo (decisão D-02). Use hitSlop/padding se o visual for menor. */
  touchMin: 48,
  button: 48,
  buttonLarge: 56,
  fab: 56,
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

export const shadow = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  fab: {
    shadowColor: '#1A382B',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

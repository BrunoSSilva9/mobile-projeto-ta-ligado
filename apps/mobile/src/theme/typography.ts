/**
 * Tipografia: Atkinson Hyperlegible (design system v2, ADR-0006), feita para baixa visão.
 * Os nomes das fontes são os registrados por @expo-google-fonts/atkinson-hyperlegible.
 * Só dois pesos: Regular 400 e Bold 700.
 *
 * Tamanhos em dp/sp: respeitam a escala de fonte do sistema (até 200%, RNF-018).
 * Regras: **mínimo de 14** (`caption`), sem letterSpacing negativo e sem texto todo em maiúsculas.
 */
export const fontFamily = {
  regular: 'AtkinsonHyperlegible_400Regular',
  bold: 'AtkinsonHyperlegible_700Bold',
} as const;

export const type = {
  title1: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34 },
  title2: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28 },
  title3: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 },
  button: { fontFamily: fontFamily.bold, fontSize: 18, lineHeight: 24 },
  /** Texto base. */
  body: { fontFamily: fontFamily.regular, fontSize: 18, lineHeight: 28 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 22 },
  /** Menor texto do app. */
  caption: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },

  // ------------------------------------------------------------------------------------------
  // APELIDOS TEMPORÁRIOS da migração (docs/17, seção 4). Somem na etapa R10.
  // ------------------------------------------------------------------------------------------
  /** @deprecated use `title1` */
  h1Large: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34 },
  /** @deprecated use `title2` */
  h1: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28 },
  /** @deprecated use `title3` */
  title: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 26 },
  /** @deprecated use `label` */
  subtitle: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 22 },
  /** @deprecated o logo é refeito na etapa R2 */
  logo: { fontFamily: fontFamily.bold, fontSize: 20, lineHeight: 24 },
  /** @deprecated o logo é refeito na etapa R2 */
  tagline: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
} as const;

export type TypeToken = keyof typeof type;

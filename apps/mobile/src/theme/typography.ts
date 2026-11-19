/**
 * Tipografia: Plus Jakarta Sans (docs/06-design-system.md).
 * Os nomes das fontes são os registrados por @expo-google-fonts/plus-jakarta-sans.
 * Tamanhos em dp/sp: respeitam a escala de fonte do sistema (até 200%, RNF-018).
 */
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  italic: 'PlusJakartaSans_400Regular_Italic',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fontFamily.extrabold, fontSize: 36, lineHeight: 36, letterSpacing: -0.9 },
  h1Large: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 36, letterSpacing: -0.42 },
  h1: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 27.5, letterSpacing: -0.22 },
  title: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 26 },
  subtitle: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  button: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
  /** Selos e rótulos. O Figma usa 11, mas o mínimo no app é 12 (docs/12). */
  label: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.44 },
  logo: { fontFamily: fontFamily.extrabold, fontSize: 19, lineHeight: 19, letterSpacing: -0.475 },
  tagline: { fontFamily: fontFamily.bold, fontSize: 8.5, lineHeight: 8.5, letterSpacing: 1.36 },
} as const;

export type TypeToken = keyof typeof type;

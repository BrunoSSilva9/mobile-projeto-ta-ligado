/**
 * Tokens de cor do Tá Ligado? (design system v2, docs/06-design-system.md e ADR-0006).
 *
 * Princípios:
 * - **Azul é para tocar.** Vermelho, laranja e verde só mostram a situação da energia.
 * - **A cor de situação nunca aparece sozinha:** sempre com um ícone de formato diferente e um texto
 *   (WCAG 1.4.1).
 * - `brandNavy` e `lime` são **só da marca** (logo, ícone, splash). Lima nunca vai sobre fundo claro.
 *
 * Todos os pares de texto passam em 4,5:1 e os de ícone/borda em 3:1 (`theme.test.ts`).
 */

/** Situação da energia: selo (fundo + texto + ícone) e marcador do mapa (preenchimento + ícone). */
const situacao = {
  semEnergia: {
    texto: '#B42318',
    fundo: '#FEE4E2',
    marcador: '#D92D20',
    iconeNoMarcador: '#FFFFFF',
    icone: 'flash-off',
  },
  oscilando: {
    texto: '#93370D',
    fundo: '#FEF0C7',
    marcador: '#F79009',
    iconeNoMarcador: '#1F2937',
    icone: 'pulse',
  },
  normal: {
    texto: '#067647',
    fundo: '#DCFAE6',
    marcador: '#067647',
    iconeNoMarcador: '#FFFFFF',
    /** O marcador de "Normal" é QUADRADO (formato diferente, não só cor). */
    icone: 'checkmark-circle',
  },
} as const;

/** Andamento da denúncia (selo: fundo + texto + ícone). */
const andamento = {
  RECEBIDA: { texto: '#334155', fundo: '#F1F5F9', icone: 'time-outline' },
  EM_ATENDIMENTO: { texto: '#1E3A8A', fundo: '#EFF4FF', icone: 'construct-outline' },
  RESOLVIDA: { texto: '#067647', fundo: '#DCFAE6', icone: 'checkmark' },
  IMPROCEDENTE: { texto: '#334155', fundo: '#F1F5F9', icone: 'close-circle-outline' },
  CANCELADA: { texto: '#334155', fundo: '#F1F5F9', icone: 'ban-outline' },
} as const;

export const colors = {
  // Ação (azul: tudo o que se toca)
  action: '#1D4ED8',
  actionPressed: '#1E3A8A',
  actionSoft: '#EFF4FF',
  actionTabPill: '#DBE6FE',
  /** Texto e ícone sobre `action` (6,7:1). */
  onAction: '#FFFFFF',

  // Texto
  textPrimary: '#0F172A',
  textSecondary: '#475569',

  // Superfícies e bordas
  bgPage: '#F6F7F9',
  surface: '#FFFFFF',
  /** Borda de campos e de chips não selecionados (4,8:1 sobre branco). */
  borderField: '#64748B',
  borderSubtle: '#CBD5E1',
  borderDivider: '#E2E8F0',
  disabledBg: '#E2E8F0',
  /** Texto legível no botão desativado (nunca transparente). */
  disabledText: '#475569',
  /** Erros de campo (texto, ícone e borda). */
  danger: '#B42318',

  // Marca (só logo, ícone e splash)
  brandNavy: '#0B1F3A',
  lime: '#A3E635',

  situacao,
  andamento,

  // ------------------------------------------------------------------------------------------
  // APELIDOS TEMPORÁRIOS da migração (docs/17, seção 4). Apontam para os valores novos para o
  // app continuar funcionando enquanto as telas são migradas. Somem na etapa R10.
  // ------------------------------------------------------------------------------------------
  /** @deprecated use `action` */
  primary: '#1D4ED8',
  /** @deprecated use `brandNavy` (só marca) ou `surface` */
  brand900: '#0B1F3A',
  /** @deprecated */
  brand700: '#475569',
  /** @deprecated */
  mint: '#A3E635',
  /** @deprecated use `surface` */
  bgCard: '#FFFFFF',
  /** @deprecated use `actionSoft` ou `surface` + `borderField` */
  bgSoft: '#EFF4FF',
  /** @deprecated use `borderSubtle` */
  bgMuted: '#CBD5E1',
  /** @deprecated use `situacao.normal.fundo` */
  surfaceTint: '#DCFAE6',
  /** @deprecated use `actionTabPill` ou `textSecondary` */
  surfaceMint: '#DBE6FE',
  /** @deprecated use `surface` (cartões) ou `onAction` (texto sobre azul) */
  white: '#FFFFFF',
  /** @deprecated */
  textOnDark: '#E2E8F0',
  /** @deprecated use `textSecondary` */
  textMuted: '#475569',
  /** @deprecated use `textSecondary` */
  tagline: '#475569',
  /** @deprecated use `situacao.*` */
  status: {
    noPower: '#D92D20',
    noPowerBg: '#FEE4E2',
    noPowerText: '#B42318',
    flicker: '#F79009',
    flickerBg: '#FEF0C7',
    flickerText: '#93370D',
    restored: '#067647',
    restoredText: '#067647',
  },
  /** @deprecated use `andamento.*` */
  complaintStatus: {
    RECEBIDA: '#334155',
    EM_ATENDIMENTO: '#1E3A8A',
    RESOLVIDA: '#067647',
    IMPROCEDENTE: '#334155',
    CANCELADA: '#334155',
  },
} as const;

export type ColorToken = keyof typeof colors;
export type SituacaoDaEnergia = keyof typeof situacao;
export type StatusDeAndamento = keyof typeof andamento;

/**
 * Tokens de cor do Tá Ligado? (docs/06-design-system.md).
 *
 * Os tokens do código têm PRIORIDADE sobre o Figma (decisão D-01):
 * - botões com texto branco usam `action` (#006E2C), não #34A853;
 * - texto âmbar usa `status.flickerText` (#855300), não #CE8300.
 */
export const colors = {
  // Marca e ação
  brand900: '#16382B',
  brand700: '#466556',
  /** Somente elementos SEM texto (FAB, pontos de status, ícones). Branco sobre ele dá ~3,1:1. */
  primary: '#34A853',
  /** Fundo de botões com texto branco, links e aba ativa (~6,4:1 com branco). */
  action: '#006E2C',
  /** Destaque oficial do "?" do logo sobre fundo escuro. */
  lime: '#A3E635',
  mint: '#89FA9B',

  // Superfícies
  bgPage: '#F1FCF3',
  bgCard: '#EBF7ED',
  bgSoft: '#E5F1E7',
  bgMuted: '#DAE5DC',
  surfaceTint: '#C3E5D2',
  surfaceMint: '#C8EAD7',
  white: '#FFFFFF',

  // Texto
  textPrimary: '#141E18',
  textSecondary: '#3E4A3E',
  textMuted: '#6E7A6D',
  textOnDark: '#E0EBE2',
  tagline: '#64748B',

  // Status do bairro e da ocorrência (RN-007)
  status: {
    noPower: '#BA1A1A',
    noPowerBg: '#FFDAD6',
    noPowerText: '#93000A',
    /** Só pontos, ícones e bordas. Para texto use `flickerText`. */
    flicker: '#CE8300',
    flickerBg: '#FFDDB8',
    flickerText: '#855300',
    restored: '#34A853',
    restoredText: '#006E2C',
  },

  // Status da denúncia (decisão S-26)
  complaintStatus: {
    RECEBIDA: '#466556',
    EM_ATENDIMENTO: '#CE8300',
    RESOLVIDA: '#34A853',
    IMPROCEDENTE: '#6E7A6D',
    CANCELADA: '#6E7A6D',
  },
} as const;

export type ColorToken = keyof typeof colors;

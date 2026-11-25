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
} as const;

export type ColorToken = keyof typeof colors;
export type SituacaoDaEnergia = keyof typeof situacao;
export type StatusDeAndamento = keyof typeof andamento;

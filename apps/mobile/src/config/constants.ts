/**
 * Constantes e textos PLACEHOLDER do app (PEN-02, docs/01-visao-e-escopo.md).
 * Centralizados aqui para troca fácil quando os dados oficiais chegarem.
 * NÃO são números reais.
 */
export const CONTATOS = {
  /** Ouvidoria comunitária (placeholder do Figma, T-03). */
  ouvidoriaTelefone: '(00) 0000-0000',
  /** Disque Concessionária / Ouvidoria Municipal (placeholder do Figma, T-04). */
  concessionariaTelefone: '0000 000 0000',
  /** Horário da Central (placeholder do Figma, T-03). */
  centralHorario: 'Segunda a Sexta, das 8h às 18h',
} as const;

export const APP = {
  nome: 'Tá Ligado?',
  cidade: 'Marabá',
  uf: 'PA',
  /** Rodapé do cadastro (PEN-01: a sigla "ACGM" do Figma foi substituída). */
  rodape: '© 2026 Equipe Tá Ligado?',
} as const;

/** URL da API. No celular use o IP da máquina na rede local (ex.: http://192.168.0.10:3000). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Tira acentos, espaços das pontas e caixa: "  Marabá " e "maraba" ficam iguais (busca, RF-020). */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();
}

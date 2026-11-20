export type ComPrioridade = {
  /** Denúncia com necessidade especial = Sim (RN-015). */
  prioritaria: boolean;
  criadoEm: Date;
};

/**
 * Ordenação padrão do painel (RN-015): prioritárias primeiro e, dentro de cada grupo,
 * da mais antiga para a mais recente. Retorna negativo quando `a` deve vir antes de `b`.
 */
export function compararPrioridade(a: ComPrioridade, b: ComPrioridade): number {
  if (a.prioritaria !== b.prioritaria) return a.prioritaria ? -1 : 1;
  return a.criadoEm.getTime() - b.criadoEm.getTime();
}

/** Devolve uma cópia ordenada, sem alterar a lista original. */
export function ordenarPorPrioridade<T extends ComPrioridade>(itens: readonly T[]): T[] {
  return [...itens].sort(compararPrioridade);
}

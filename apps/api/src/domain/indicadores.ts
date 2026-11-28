/**
 * Taxa de resolução dos últimos 30 dias (RN-017): resolvidas ÷ registradas no período,
 * limitada a 100% e arredondada a 2 casas (0 a 1). Sem denúncias no período, a taxa é 0.
 */
export function taxaResolucao(resolvidas: number, registradas: number): number {
  if (registradas <= 0 || resolvidas <= 0) return 0;
  return Math.round(Math.min(1, resolvidas / registradas) * 100) / 100;
}

/** Tamanho da janela dos indicadores (RN-017). */
export const DIAS_DA_JANELA = 30;

/** Início da janela dos indicadores: `dias` antes de `agora` (RN-017). Não altera `agora`. */
export function inicioDaJanela(agora: Date, dias: number = DIAS_DA_JANELA): Date {
  return new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
}

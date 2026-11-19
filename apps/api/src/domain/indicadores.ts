/**
 * Taxa de resolução dos últimos 30 dias (RN-017): resolvidas ÷ registradas no período,
 * limitada a 100% e arredondada a 2 casas (0 a 1). Sem denúncias no período, a taxa é 0.
 */
export function taxaResolucao(resolvidas: number, registradas: number): number {
  if (registradas <= 0 || resolvidas <= 0) return 0;
  return Math.round(Math.min(1, resolvidas / registradas) * 100) / 100;
}

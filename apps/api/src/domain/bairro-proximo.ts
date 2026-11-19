export type Ponto = {
  latitude: number;
  longitude: number;
};

/** Distância máxima, em km, para considerar que o usuário está em Marabá (RN-025). */
export const RAIO_MAXIMO_KM = 15;

const RAIO_TERRA_KM = 6371;

function emRadianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

/** Distância entre dois pontos pela fórmula de Haversine, em quilômetros. */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const dLat = emRadianos(b.latitude - a.latitude);
  const dLon = emRadianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(emRadianos(a.latitude)) * Math.cos(emRadianos(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Bairro de centro mais próximo do ponto (RN-025, S-05). Devolve `null` se a lista estiver vazia
 * ou se o mais próximo estiver além de `maxKm` (o usuário então escolhe o bairro manualmente).
 */
export function bairroMaisProximo<T extends Ponto>(
  ponto: Ponto,
  bairros: readonly T[],
  maxKm: number = RAIO_MAXIMO_KM,
): T | null {
  let melhor: T | null = null;
  let menorDistancia = Infinity;
  for (const bairro of bairros) {
    const distancia = distanciaKm(ponto, bairro);
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhor = bairro;
    }
  }
  return melhor !== null && menorDistancia <= maxKm ? melhor : null;
}

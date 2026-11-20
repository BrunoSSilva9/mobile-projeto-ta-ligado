import { useEffect, useState } from 'react';

/** Hora atual em ms, atualizada a cada `intervaloMs`, para "há 5 min" não ficar parado. */
export function useAgora(intervaloMs = 30_000): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return agora;
}

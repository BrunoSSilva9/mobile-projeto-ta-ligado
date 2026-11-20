import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { listarOcorrencias, listarStatusDosBairros } from './api';
import { CHAVE_OCORRENCIAS, CHAVE_STATUS_DOS_BAIRROS } from './cache';
import type { FiltroPublico } from './tipos';

export function useStatusDosBairros() {
  return useQuery({ queryKey: CHAVE_STATUS_DOS_BAIRROS, queryFn: listarStatusDosBairros });
}

export function useOcorrencias(filtro: { status: FiltroPublico; q: string }) {
  return useQuery({
    queryKey: [...CHAVE_OCORRENCIAS, filtro.status ?? 'TODOS', filtro.q.trim()],
    queryFn: () => listarOcorrencias(filtro),
    // Ao trocar de chip ou digitar, mantém a lista anterior na tela até a nova chegar (sem piscar).
    placeholderData: keepPreviousData,
  });
}

/** Devolve o valor só depois de `ms` sem mudar: evita uma consulta a cada letra digitada. */
export function useValorComAtraso<T>(valor: T, ms = 350): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return atrasado;
}

/** Hora atual em ms, atualizada a cada `intervaloMs`, para o "Há 5 min" não ficar parado. */
export function useAgora(intervaloMs = 30_000): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return agora;
}

import type { QueryClient } from '@tanstack/react-query';

import type { BairroComStatus, StatusDosBairros } from './tipos';

export const CHAVE_STATUS_DOS_BAIRROS = ['bairros-status'] as const;
export const CHAVE_OCORRENCIAS = ['ocorrencias'] as const;

const texto = (v: unknown): v is string => typeof v === 'string' && v !== '';
const STATUS = ['SEM_LUZ', 'OSCILACAO', 'NORMAL'];

/** Valida o evento `bairro:status-atualizado` (docs/10-api.md). */
export function eventoDoBairroValido(
  bruto: unknown,
): Pick<BairroComStatus, 'bairroId' | 'status' | 'emAberto' | 'previsaoReparo'> | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const e = bruto as Record<string, unknown>;
  if (
    typeof e.bairroId !== 'number' ||
    !texto(e.status) ||
    !STATUS.includes(e.status) ||
    typeof e.emAberto !== 'number'
  ) {
    return null;
  }
  return {
    bairroId: e.bairroId,
    status: e.status as BairroComStatus['status'],
    emAberto: e.emAberto,
    previsaoReparo: typeof e.previsaoReparo === 'string' ? e.previsaoReparo : null,
  };
}

/**
 * `bairro:status-atualizado`: o servidor recalcula e manda o valor atual; o app só substitui
 * (o selo e o círculo do mapa mudam na hora, sem nova consulta). Mantém as coordenadas do bairro.
 */
export function aplicarStatusDoBairro(
  queryClient: QueryClient,
  evento: NonNullable<ReturnType<typeof eventoDoBairroValido>>,
): boolean {
  let achou = false;
  queryClient.setQueryData<StatusDosBairros>(CHAVE_STATUS_DOS_BAIRROS, (atual) => {
    if (!atual?.bairros.some((b) => b.bairroId === evento.bairroId)) return atual;
    achou = true;
    return {
      ...atual,
      bairros: atual.bairros.map((b) =>
        b.bairroId === evento.bairroId
          ? {
              ...b,
              status: evento.status,
              emAberto: evento.emAberto,
              previsaoReparo: evento.previsaoReparo,
            }
          : b,
      ),
    };
  });
  return achou;
}

/**
 * `ocorrencia:atualizada`: uma ocorrência nasceu ou mudou, o que mexe na lista e nos totais dos
 * chips. Em vez de remendar cada combinação de filtro, a lista é buscada de novo.
 */
export function atualizarListaDeOcorrencias(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: CHAVE_OCORRENCIAS });
}

/** Depois de reconectar, o que mudou enquanto estava offline é buscado de novo (RNF-009). */
export function refazerConsultasPublicas(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_STATUS_DOS_BAIRROS }),
    queryClient.invalidateQueries({ queryKey: CHAVE_OCORRENCIAS }),
  ]);
}

import type { QueryClient } from '@tanstack/react-query';

import type { DenunciaDetalhe, EventoDeStatus, MinhasDenuncias } from './api';

export const CHAVE_MINHAS = ['minhas-denuncias'] as const;
export const chaveDoDetalhe = (id: string) => ['denuncia', id] as const;

/** Aplica o evento a um detalhe em cache. Eventos antigos (fora de ordem) são ignorados. */
export function aplicarEventoAoDetalhe(
  detalhe: DenunciaDetalhe,
  evento: EventoDeStatus,
): DenunciaDetalhe {
  if (Date.parse(evento.alteradoEm) < Date.parse(detalhe.atualizadoEm)) return detalhe;

  const mudouDeStatus = evento.statusAnterior !== evento.status;
  const jaTemNoHistorico = detalhe.historico.some(
    (h) =>
      h.statusNovo === evento.status &&
      h.criadoEm === evento.alteradoEm &&
      (h.evento ?? 'STATUS') === (mudouDeStatus ? 'STATUS' : 'PREVISAO'),
  );
  // Mesmo status e previsão diferente = a operadora definiu, trocou ou removeu a previsão (S-60).
  const mudouAPrevisao = !mudouDeStatus && evento.previsaoReparo !== detalhe.previsaoReparo;

  let historico = detalhe.historico;
  if (!jaTemNoHistorico && mudouDeStatus) {
    historico = [
      ...historico,
      {
        statusAnterior: evento.statusAnterior,
        statusNovo: evento.status,
        evento: 'STATUS',
        previsaoReparo: evento.previsaoReparo,
        por: evento.por,
        justificativa: evento.justificativa,
        criadoEm: evento.alteradoEm,
      },
    ];
  } else if (!jaTemNoHistorico && mudouAPrevisao) {
    historico = [
      ...historico,
      {
        statusAnterior: evento.statusAnterior,
        statusNovo: evento.status,
        evento: 'PREVISAO',
        previsaoReparo: evento.previsaoReparo,
        por: evento.por,
        justificativa: null,
        criadoEm: evento.alteradoEm,
      },
    ];
  }

  return {
    ...detalhe,
    status: evento.status,
    previsaoReparo: evento.previsaoReparo,
    justificativa: evento.justificativa,
    atualizadoEm: evento.alteradoEm,
    historico,
  };
}

/**
 * Leva o evento `denuncia:status-atualizado` para o cache do TanStack Query: a tela de detalhe e a
 * lista mudam sozinhas, sem recarregar (RF-024). Devolve `false` quando a denúncia não está em
 * nenhum cache (nada a atualizar, a próxima consulta já traz o dado novo).
 */
export function aplicarEventoDeStatus(queryClient: QueryClient, evento: EventoDeStatus): boolean {
  let atualizou = false;

  queryClient.setQueryData<DenunciaDetalhe>(chaveDoDetalhe(evento.id), (atual) => {
    if (!atual) return atual;
    atualizou = true;
    return aplicarEventoAoDetalhe(atual, evento);
  });

  queryClient.setQueriesData<MinhasDenuncias>({ queryKey: CHAVE_MINHAS }, (atual) => {
    if (!atual?.itens.some((i) => i.id === evento.id)) return atual;
    atualizou = true;
    return {
      ...atual,
      itens: atual.itens.map((i) =>
        i.id === evento.id
          ? { ...i, status: evento.status, previsaoReparo: evento.previsaoReparo }
          : i,
      ),
    };
  });

  return atualizou;
}

/** Depois de reconectar, o que chegou enquanto estava offline é buscado de novo (RNF-009). */
export function refazerConsultasDeDenuncias(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_MINHAS }),
    queryClient.invalidateQueries({ queryKey: ['denuncia'] }),
  ]);
}

/** Eventos recebidos têm formato fixo; qualquer outra coisa é descartada. */
export function eventoDeStatusValido(bruto: unknown): EventoDeStatus | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const e = bruto as Record<string, unknown>;
  const texto = (v: unknown): v is string => typeof v === 'string' && v !== '';
  if (
    !texto(e.id) ||
    !texto(e.status) ||
    !texto(e.statusAnterior) ||
    !texto(e.alteradoEm) ||
    Number.isNaN(Date.parse(e.alteradoEm))
  ) {
    return null;
  }
  return {
    id: e.id,
    protocolo: typeof e.protocolo === 'string' ? e.protocolo : '',
    statusAnterior: e.statusAnterior as EventoDeStatus['statusAnterior'],
    status: e.status as EventoDeStatus['status'],
    previsaoReparo: typeof e.previsaoReparo === 'string' ? e.previsaoReparo : null,
    justificativa: typeof e.justificativa === 'string' ? e.justificativa : null,
    alteradoEm: e.alteradoEm,
    por: typeof e.por === 'string' ? e.por : 'Equatorial Pará',
  };
}

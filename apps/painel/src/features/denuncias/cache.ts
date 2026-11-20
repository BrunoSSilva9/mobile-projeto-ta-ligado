import type { QueryClient } from '@tanstack/react-query';

import { LIMITE_POR_PAGINA, type Filtros } from './consulta';
import type {
  DenunciaDoPainel,
  EventoDeCriacao,
  EventoDeStatus,
  ListaDoPainel,
  StatusDaDenuncia,
} from './tipos';

export const CHAVE_LISTAS = ['painel-denuncias'] as const;
export const CHAVE_DETALHE = ['painel-denuncia'] as const;
export const chaveDoDetalhe = (id: string) => [...CHAVE_DETALHE, id] as const;

const ABERTAS: StatusDaDenuncia[] = ['RECEBIDA', 'EM_ATENDIMENTO'];

/** A denúncia pertence à lista que esses filtros descrevem? */
export function combinaComFiltros(
  d: Pick<DenunciaDoPainel, 'status' | 'tipo' | 'prioritaria'> & { bairro: { id: number } },
  f: Filtros,
): boolean {
  if (f.status === 'ABERTAS' && !ABERTAS.includes(d.status)) return false;
  if (f.status !== 'ABERTAS' && f.status !== 'TODOS' && d.status !== f.status) return false;
  if (f.tipo && d.tipo !== f.tipo) return false;
  if (f.bairroId !== '' && d.bairro.id !== f.bairroId) return false;
  if (f.prioritarias && !d.prioritaria) return false;
  return true;
}

/**
 * Insere uma denúncia nova na lista, na posição da ordem da API (RN-015): prioritárias primeiro e,
 * em cada grupo, a mais antiga primeiro; como a nova é a mais recente, ela entra no fim do seu
 * grupo. Se já existe (evento repetido), não duplica; se a página está cheia, só soma ao total.
 */
export function inserirNaLista(lista: ListaDoPainel, nova: DenunciaDoPainel): ListaDoPainel {
  if (lista.itens.some((i) => i.id === nova.id)) return lista;
  if (lista.itens.length >= LIMITE_POR_PAGINA) return { ...lista, total: lista.total + 1 };

  const prioritarias = lista.itens.filter((i) => i.prioritaria).length;
  const posicao = nova.prioritaria ? prioritarias : lista.itens.length;
  const itens = [...lista.itens];
  itens.splice(posicao, 0, nova);
  return { ...lista, itens, total: lista.total + 1 };
}

export const eventoParaItem = (e: EventoDeCriacao): DenunciaDoPainel => ({
  id: e.id,
  protocolo: e.protocolo,
  prioritaria: e.prioritaria,
  tipo: e.tipo,
  status: e.status,
  bairro: e.bairro,
  logradouro: e.logradouro,
  latitude: e.latitude,
  longitude: e.longitude,
  previsaoReparo: null,
  criadoEm: e.criadoEm,
});

/** `denuncia:criada`: entra em cada lista em cache cujos filtros combinam (só na página 1). */
export function aplicarCriacao(queryClient: QueryClient, evento: EventoDeCriacao) {
  const nova = eventoParaItem(evento);
  for (const [chave, dados] of queryClient.getQueriesData<ListaDoPainel>({
    queryKey: CHAVE_LISTAS,
  })) {
    const [, filtros, pagina] = chave as unknown as [string, Filtros, number];
    if (!dados || pagina !== 1 || !combinaComFiltros(nova, filtros)) continue;
    queryClient.setQueryData<ListaDoPainel>(chave, inserirNaLista(dados, nova));
  }
}

/**
 * `denuncia:status-atualizado`: atualiza o item nas listas; se o novo status não combina mais com
 * os filtros da lista (ex.: resolvida numa lista "Em aberto"), ele sai dela.
 */
export function aplicarMudancaDeStatus(queryClient: QueryClient, evento: EventoDeStatus) {
  for (const [chave, dados] of queryClient.getQueriesData<ListaDoPainel>({
    queryKey: CHAVE_LISTAS,
  })) {
    const filtros = (chave as unknown as [string, Filtros])[1];
    const atual = dados?.itens.find((i) => i.id === evento.id);
    if (!dados || !atual) continue;

    const atualizado = { ...atual, status: evento.status, previsaoReparo: evento.previsaoReparo };
    const continua = combinaComFiltros(atualizado, filtros);
    queryClient.setQueryData<ListaDoPainel>(chave, {
      ...dados,
      itens: continua
        ? dados.itens.map((i) => (i.id === evento.id ? atualizado : i))
        : dados.itens.filter((i) => i.id !== evento.id),
      total: continua ? dados.total : Math.max(0, dados.total - 1),
    });
  }
}

/** Depois de reconectar, o que chegou enquanto estava offline é buscado de novo. */
export function refazerConsultas(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: CHAVE_LISTAS }),
    queryClient.invalidateQueries({ queryKey: CHAVE_DETALHE }),
  ]);
}

const texto = (v: unknown): v is string => typeof v === 'string' && v !== '';

/** Valida o evento `denuncia:criada`; o que não tiver o formato do contrato é descartado. */
export function eventoDeCriacaoValido(bruto: unknown): EventoDeCriacao | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const e = bruto as Record<string, unknown>;
  const bairro = e.bairro as Record<string, unknown> | undefined;
  if (
    !texto(e.id) ||
    !texto(e.protocolo) ||
    !texto(e.tipo) ||
    !texto(e.status) ||
    !texto(e.criadoEm) ||
    !bairro ||
    typeof bairro.id !== 'number' ||
    !texto(bairro.nome)
  ) {
    return null;
  }
  return {
    id: e.id,
    protocolo: e.protocolo,
    prioritaria: e.prioritaria === true,
    tipo: e.tipo as EventoDeCriacao['tipo'],
    status: e.status as EventoDeCriacao['status'],
    bairro: {
      id: bairro.id,
      nome: bairro.nome,
      folha: typeof bairro.folha === 'string' ? bairro.folha : null,
    },
    logradouro: typeof e.logradouro === 'string' ? e.logradouro : '',
    latitude: typeof e.latitude === 'number' ? e.latitude : null,
    longitude: typeof e.longitude === 'number' ? e.longitude : null,
    criadoEm: e.criadoEm,
  };
}

/** Valida o evento `denuncia:status-atualizado`. */
export function eventoDeStatusValido(bruto: unknown): EventoDeStatus | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const e = bruto as Record<string, unknown>;
  if (!texto(e.id) || !texto(e.status)) return null;
  return {
    id: e.id,
    status: e.status as StatusDaDenuncia,
    previsaoReparo: typeof e.previsaoReparo === 'string' ? e.previsaoReparo : null,
  };
}

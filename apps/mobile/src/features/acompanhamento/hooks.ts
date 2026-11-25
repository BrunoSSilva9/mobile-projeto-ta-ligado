import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ErroDeApi } from '@/services/http';
import {
  cancelarDenuncia,
  listarMinhasDenuncias,
  obterDenuncia,
  type DenunciaDetalhe,
  type MinhasDenuncias,
} from './api';
import { CHAVE_MINHAS, chaveDoDetalhe } from './cache';
import { statusEmAberto } from './status';

export function useMinhasDenuncias() {
  return useQuery({ queryKey: CHAVE_MINHAS, queryFn: listarMinhasDenuncias });
}

export function useDenuncia(id: string | undefined) {
  return useQuery({
    queryKey: chaveDoDetalhe(id ?? ''),
    queryFn: () => obterDenuncia(id as string),
    enabled: !!id,
  });
}

/** Quantas denúncias em aberto o usuário tem (a lista traz as mais recentes primeiro). */
export function contarEmAberto(itens: readonly { status: string }[]): number {
  return itens.filter((i) => statusEmAberto(i.status)).length;
}

/**
 * Cancela a denúncia (RF-015). Nunca repete sozinho. No sucesso, o detalhe em cache vira o que a
 * API devolveu e o item da lista muda de status; as listas públicas e o bairro são buscados de
 * novo. Se a API recusar (422: a operadora já começou), o detalhe é buscado de novo para mostrar
 * o status real.
 */
export function useCancelarDenuncia(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelarDenuncia(id),
    onSuccess: (detalhe: DenunciaDetalhe) => {
      queryClient.setQueryData(chaveDoDetalhe(id), detalhe);
      queryClient.setQueriesData<MinhasDenuncias>({ queryKey: CHAVE_MINHAS }, (atual) =>
        atual
          ? {
              ...atual,
              itens: atual.itens.map((i) => (i.id === id ? { ...i, status: detalhe.status } : i)),
            }
          : atual,
      );
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ocorrencias'] }),
        queryClient.invalidateQueries({ queryKey: ['bairros-status'] }),
      ]);
    },
    onError: (erro) => {
      if (erro instanceof ErroDeApi && erro.status === 422) {
        return queryClient.invalidateQueries({ queryKey: chaveDoDetalhe(id) });
      }
    },
  });
}

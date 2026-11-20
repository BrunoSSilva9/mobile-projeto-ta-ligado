import { useQuery } from '@tanstack/react-query';

import { listarMinhasDenuncias, obterDenuncia } from './api';
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

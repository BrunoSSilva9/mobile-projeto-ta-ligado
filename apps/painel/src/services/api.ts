import { QueryClient } from '@tanstack/react-query';

import { criarHttp, ErroDeApi } from './http';
import { useSessao } from '../store/sessao';

/** Endereço da API. Vazio = mesmo endereço do painel (em desenvolvimento o Vite faz o proxy). */
export const API_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Leituras repetem até 2 vezes, mas só em falha de rede ou 5xx; um 4xx não melhora repetindo.
 * Ações do operador (mutations) nunca repetem sozinhas.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (tentativas, erro) => {
        if (tentativas >= 2) return false;
        return !(erro instanceof ErroDeApi) || erro.ehFalhaDeRede || erro.status >= 500;
      },
    },
    mutations: { retry: false },
  },
});

/** Encerra a sessão e apaga o cache (os dados são do operador que saiu). */
export function encerrarSessao() {
  useSessao.getState().sair();
  queryClient.clear();
}

/** Se o servidor recusar a sessão (token expirado), volta ao login sozinho. */
export const http = criarHttp({
  baseUrl: API_URL,
  obterToken: () => useSessao.getState().token,
  aoNaoAutenticado: encerrarSessao,
});

import { criarHttp } from './http';
import { queryClient } from './query-client';
import { API_URL } from '@/config/constants';
import { useSessao } from '@/store/session';

/** Encerra a sessão e apaga tudo o que estava em cache (os dados são do usuário que saiu). */
export async function encerrarSessao(): Promise<void> {
  await useSessao.getState().sair();
  queryClient.clear();
}

/**
 * Cliente HTTP do app, já ligado à sessão: envia o token e, se o servidor recusar a sessão
 * (token expirado ou conta removida), volta para a tela de login sozinho.
 */
export const http = criarHttp({
  baseUrl: API_URL,
  obterToken: () => useSessao.getState().token,
  aoNaoAutenticado: () => {
    void encerrarSessao();
  },
});

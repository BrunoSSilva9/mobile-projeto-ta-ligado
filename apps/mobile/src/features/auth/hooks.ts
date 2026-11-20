import { useMutation } from '@tanstack/react-query';

import { useSessao } from '@/store/session';
import { entrar, registrar } from './api';

/** Cadastro: ao dar certo, a sessão já é guardada e a navegação protegida leva o usuário às abas. */
export function useRegistrar() {
  return useMutation({
    mutationFn: registrar,
    onSuccess: (sessao) => useSessao.getState().entrar(sessao),
  });
}

/** Login: ao dar certo, guarda a sessão. */
export function useEntrar() {
  return useMutation({
    mutationFn: entrar,
    onSuccess: (sessao) => useSessao.getState().entrar(sessao),
  });
}

export { aplicarErroDaApi } from '@/services/erros-de-formulario';

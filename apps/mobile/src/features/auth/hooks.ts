import { useMutation } from '@tanstack/react-query';

import { limparBairroEscolhido } from '@/features/ocorrencias/bairro-escolhido';
import { encerrarSessao } from '@/services/api';
import { useAvisoDeEntrada } from '@/store/aviso-de-entrada';
import { useSessao } from '@/store/session';
import { limparRascunho } from '@/features/denuncia/rascunho';
import { atualizarPerfil, entrar, excluirConta, registrar } from './api';

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

/** Editar o perfil: ao dar certo, o usuário da sessão (e o que está salvo no aparelho) é atualizado. */
export function useAtualizarPerfil() {
  return useMutation({
    mutationFn: atualizarPerfil,
    onSuccess: (usuario) => useSessao.getState().atualizarUsuario(usuario),
  });
}

/**
 * Excluir a conta (S-50, S-59). Nunca repete sozinho. Ao dar certo: apaga o que era desta conta no
 * aparelho (rascunho da denúncia e bairro escolhido), encerra a sessão (token, cache e dados em
 * memória) e deixa o aviso "Sua conta foi excluída." para a tela de login.
 */
export function useExcluirConta() {
  return useMutation({
    mutationFn: excluirConta,
    onSuccess: async () => {
      const usuarioId = useSessao.getState().usuario?.id;
      if (usuarioId) {
        await Promise.all([limparRascunho(usuarioId), limparBairroEscolhido(usuarioId)]);
      }
      useAvisoDeEntrada.getState().definir('Sua conta foi excluída.');
      await encerrarSessao();
    },
  });
}

export { aplicarErroDaApi } from '@/services/erros-de-formulario';

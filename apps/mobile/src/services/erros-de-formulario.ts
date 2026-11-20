import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

import { ErroDeApi } from '@/services/http';

/**
 * Leva um erro da API para o formulário: erros de campo ficam no campo; o resto vira uma mensagem
 * geral, devolvida para a tela mostrar acima do botão.
 */
export function aplicarErroDaApi<T extends FieldValues>(
  erro: unknown,
  setError: UseFormSetError<T>,
  camposDoFormulario: readonly string[],
): string | null {
  if (!(erro instanceof ErroDeApi)) {
    return 'Algo deu errado. Tente novamente.';
  }

  if (erro.codigo === 'EMAIL_JA_CADASTRADO' && camposDoFormulario.includes('email')) {
    setError('email' as FieldPath<T>, { type: 'server', message: erro.message });
    return null;
  }

  if (erro.codigo === 'VALIDACAO_ERRO' && erro.detalhes?.length) {
    let sobrou = false;
    for (const detalhe of erro.detalhes) {
      if (detalhe.campo && camposDoFormulario.includes(detalhe.campo)) {
        setError(detalhe.campo as FieldPath<T>, { type: 'server', message: detalhe.mensagem });
      } else {
        sobrou = true;
      }
    }
    return sobrou ? erro.message : null;
  }

  return erro.message;
}

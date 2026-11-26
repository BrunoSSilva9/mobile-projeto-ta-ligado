import { VERSAO_TERMOS } from '@/config/constants';
import { http } from '@/services/api';
import { ErroDeApi } from '@/services/http';
import type { DadosDeSessao, UsuarioDaSessao } from '@/store/session';
import type { DadosDoCadastro, DadosDoLogin, DadosDoPerfil } from './schemas';

/** Este app é só do cidadão: a conta de operador usa o painel web (RF-003, ADR-0001). */
export function garantirContaDeCidadao(resposta: DadosDeSessao): DadosDeSessao {
  if (resposta.usuario.papel !== 'CIDADAO') {
    throw new ErroDeApi(
      'PAPEL_INCORRETO',
      'Esta conta é de operador. Use o painel da operadora para entrar.',
      403,
    );
  }
  return resposta;
}

/** RF-001, RF-002: cria a conta e já devolve a sessão. */
export async function registrar(dados: DadosDoCadastro): Promise<DadosDeSessao> {
  const resposta = await http.post<DadosDeSessao>('/auth/register', {
    nome: dados.nome,
    email: dados.email,
    senha: dados.senha,
    // Telefone vazio não vai para a API (é opcional).
    ...(dados.telefone.trim() !== '' ? { telefone: dados.telefone.trim() } : {}),
    aceiteTermos: true,
    versaoTermos: VERSAO_TERMOS,
  });
  return garantirContaDeCidadao(resposta);
}

/** RF-003: entra com e-mail e senha. */
export async function entrar(dados: DadosDoLogin): Promise<DadosDeSessao> {
  const resposta = await http.post<DadosDeSessao>('/auth/login', {
    email: dados.email,
    senha: dados.senha,
  });
  return garantirContaDeCidadao(resposta);
}

/** RF-005: edita nome e telefone. Telefone vazio apaga o telefone. Devolve o usuário atualizado. */
export function atualizarPerfil(dados: DadosDoPerfil): Promise<UsuarioDaSessao> {
  return http.patch<UsuarioDaSessao>('/me', { nome: dados.nome, telefone: dados.telefone });
}

/**
 * RF-006, RN-024, S-50, S-59: exclui a conta. A API confere a senha atual: errada, responde `403
 * SENHA_INCORRETA` (e nada é apagado). Certa, responde 204.
 */
export async function excluirConta(senha: string): Promise<void> {
  await http.delete<void>('/me', { senha });
}

import { VERSAO_TERMOS } from '@/config/constants';
import { http } from '@/services/api';
import { ErroDeApi } from '@/services/http';
import type { DadosDeSessao } from '@/store/session';
import type { DadosDoCadastro, DadosDoLogin } from './schemas';

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

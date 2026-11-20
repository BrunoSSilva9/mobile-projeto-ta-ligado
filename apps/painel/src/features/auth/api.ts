import { http } from '../../services/api';
import { ErroDeApi } from '../../services/http';
import type { DadosDeSessao } from '../../store/sessao';

/** O painel é só do operador: a conta de cidadão usa o app (RF-026, ADR-0001). */
export function garantirContaDeOperador(resposta: DadosDeSessao): DadosDeSessao {
  if (resposta.usuario.papel !== 'OPERADOR') {
    throw new ErroDeApi(
      'PAPEL_INCORRETO',
      'Esta conta é de cidadão. Use o aplicativo Tá Ligado? para entrar.',
      403,
    );
  }
  return resposta;
}

/** P-01: login do operador. */
export async function entrarComoOperador(dados: {
  email: string;
  senha: string;
}): Promise<DadosDeSessao> {
  const resposta = await http.post<DadosDeSessao>('/auth/login', dados);
  return garantirContaDeOperador(resposta);
}

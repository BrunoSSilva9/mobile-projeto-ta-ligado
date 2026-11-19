/**
 * Erro de aplicação com código estável e status HTTP.
 * Formato de resposta em docs/10-api.md: { erro: { codigo, mensagem, detalhes? } }.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensagem: string,
    public readonly detalhes?: { campo?: string; mensagem: string }[],
  ) {
    super(mensagem);
    this.name = 'AppError';
  }
}

export const erros = {
  naoEncontrado: (mensagem = 'Recurso não encontrado.') =>
    new AppError(404, 'NAO_ENCONTRADO', mensagem),
  naoAutenticado: (mensagem = 'Faça login para continuar.') =>
    new AppError(401, 'NAO_AUTENTICADO', mensagem),
  semPermissao: (mensagem = 'Você não tem permissão para isso.') =>
    new AppError(403, 'SEM_PERMISSAO', mensagem),
  validacao: (detalhes: { campo?: string; mensagem: string }[]) =>
    new AppError(400, 'VALIDACAO_ERRO', 'Dados inválidos.', detalhes),
  credenciaisInvalidas: () =>
    new AppError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.'),
  emailJaCadastrado: () => new AppError(409, 'EMAIL_JA_CADASTRADO', 'E-mail já cadastrado.'),
  muitasRequisicoes: () =>
    new AppError(
      429,
      'MUITAS_REQUISICOES',
      'Muitas tentativas. Aguarde um instante e tente novamente.',
    ),
};

export type CorpoErro = {
  erro: { codigo: string; mensagem: string; detalhes?: { campo?: string; mensagem: string }[] };
};

export function corpoDeErro(e: AppError): CorpoErro {
  return {
    erro: {
      codigo: e.codigo,
      mensagem: e.message,
      ...(e.detalhes ? { detalhes: e.detalhes } : {}),
    },
  };
}

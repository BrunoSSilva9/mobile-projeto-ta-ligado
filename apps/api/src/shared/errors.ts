export type DetalheDeErro = { campo?: string; mensagem: string };

/**
 * Erro de aplicação com código estável e status HTTP.
 * Formato de resposta em docs/10-api.md: { erro: { codigo, mensagem, detalhes?, dados? } }.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensagem: string,
    public readonly detalhes?: DetalheDeErro[],
    /** Informação extra e estruturada para o cliente (ex.: o id da denúncia em aberto). */
    public readonly dados?: Record<string, unknown>,
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
  validacao: (detalhes: DetalheDeErro[]) =>
    new AppError(400, 'VALIDACAO_ERRO', 'Dados inválidos.', detalhes),
  credenciaisInvalidas: () =>
    new AppError(401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.'),
  emailJaCadastrado: () => new AppError(409, 'EMAIL_JA_CADASTRADO', 'E-mail já cadastrado.'),
  /** RN-006. `denunciaId` permite ao app levar o usuário até a denúncia em aberto. */
  denunciaEmAberto: (denunciaId?: string) =>
    new AppError(
      409,
      'DENUNCIA_EM_ABERTO',
      'Você já tem uma denúncia em aberto.',
      undefined,
      denunciaId ? { denunciaEmAbertoId: denunciaId } : undefined,
    ),
  /** RN-004: mudança de status não permitida (inclui conflito: o status mudou enquanto o operador decidia). */
  transicaoInvalida: (mensagem: string) => new AppError(422, 'TRANSICAO_INVALIDA', mensagem),
  /** RN-010: improcedência sem justificativa válida. */
  justificativaObrigatoria: (mensagem: string) =>
    new AppError(422, 'JUSTIFICATIVA_OBRIGATORIA', mensagem),
  /** RN-009: a previsão de reparo precisa ser futura. */
  previsaoNoPassado: (mensagem: string) => new AppError(422, 'PREVISAO_NO_PASSADO', mensagem),
  /** RN-013: foto com tamanho ou tipo inválido (413 grande demais, 415 não é JPEG). */
  arquivoInvalido: (status: 413 | 415, mensagem: string) =>
    new AppError(status, 'ARQUIVO_INVALIDO', mensagem),
  /** RN-013: mais de 3 fotos. */
  limiteFotos: (mensagem: string) => new AppError(422, 'LIMITE_FOTOS', mensagem),
  muitasRequisicoes: () =>
    new AppError(
      429,
      'MUITAS_REQUISICOES',
      'Muitas tentativas. Aguarde um instante e tente novamente.',
    ),
};

export type CorpoErro = {
  erro: {
    codigo: string;
    mensagem: string;
    detalhes?: DetalheDeErro[];
    dados?: Record<string, unknown>;
  };
};

export function corpoDeErro(e: AppError): CorpoErro {
  return {
    erro: {
      codigo: e.codigo,
      mensagem: e.message,
      ...(e.detalhes ? { detalhes: e.detalhes } : {}),
      ...(e.dados ? { dados: e.dados } : {}),
    },
  };
}

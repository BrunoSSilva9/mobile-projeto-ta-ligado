import { ehStatusFinal, type Papel, type StatusDenuncia } from './tipos';

/** Quem pode executar a transição: o operador da operadora ou o autor da denúncia. */
type Executor = 'OPERADOR' | 'AUTOR';

/**
 * Transições permitidas (RN-004, decisão S-01). Qualquer outra é inválida.
 * A exceção da resolução em lote (RECEBIDA -> RESOLVIDA) está em `validarTransicao` (RN-016).
 */
const TRANSICOES: Readonly<
  Partial<Record<StatusDenuncia, Partial<Record<StatusDenuncia, Executor>>>>
> = {
  RECEBIDA: {
    EM_ATENDIMENTO: 'OPERADOR',
    IMPROCEDENTE: 'OPERADOR',
    CANCELADA: 'AUTOR', // RN-005: só o autor, e só enquanto RECEBIDA
  },
  EM_ATENDIMENTO: {
    RESOLVIDA: 'OPERADOR',
    IMPROCEDENTE: 'OPERADOR',
  },
};

export const JUSTIFICATIVA_MIN = 10;
export const JUSTIFICATIVA_MAX = 500;

export type Ator = {
  papel: Papel;
  /** O ator é o autor da denúncia? */
  ehAutor: boolean;
};

export type PedidoDeTransicao = {
  de: StatusDenuncia;
  para: StatusDenuncia;
  ator: Ator;
  /** Obrigatória (10 a 500 caracteres) quando `para` é IMPROCEDENTE (RN-010). */
  justificativa?: string | null;
  /** Resolução em lote por bairro (RN-016): só o operador, e permite RECEBIDA -> RESOLVIDA. */
  lote?: boolean;
};

export type CodigoErroTransicao =
  'TRANSICAO_INVALIDA' | 'SEM_PERMISSAO' | 'JUSTIFICATIVA_OBRIGATORIA';

export type ResultadoTransicao =
  { ok: true } | { ok: false; codigo: CodigoErroTransicao; mensagem: string };

function falha(codigo: CodigoErroTransicao, mensagem: string): ResultadoTransicao {
  return { ok: false, codigo, mensagem };
}

function executorDa(ator: Ator): Executor | null {
  if (ator.papel === 'OPERADOR') return 'OPERADOR';
  if (ator.papel === 'CIDADAO' && ator.ehAutor) return 'AUTOR';
  return null;
}

/**
 * Valida uma mudança de status (RN-004, RN-005, RN-010, RN-016).
 * Ordem das verificações: transição existe -> ator pode executá-la -> justificativa.
 */
export function validarTransicao(pedido: PedidoDeTransicao): ResultadoTransicao {
  const { de, para, ator, justificativa, lote = false } = pedido;

  if (ehStatusFinal(de) || de === para) {
    return falha('TRANSICAO_INVALIDA', `Não é possível mudar de ${de} para ${para}.`);
  }

  let exigido: Executor | undefined = TRANSICOES[de]?.[para];

  // RN-016: a resolução em lote é a única exceção e permite RECEBIDA -> RESOLVIDA.
  if (lote) {
    if (ator.papel !== 'OPERADOR') {
      return falha('SEM_PERMISSAO', 'Somente o operador pode resolver denúncias em lote.');
    }
    if (de === 'RECEBIDA' && para === 'RESOLVIDA') exigido = 'OPERADOR';
  }

  if (!exigido) {
    return falha('TRANSICAO_INVALIDA', `Não é possível mudar de ${de} para ${para}.`);
  }

  if (executorDa(ator) !== exigido) {
    return falha(
      'SEM_PERMISSAO',
      exigido === 'AUTOR'
        ? 'Somente o autor da denúncia pode cancelá-la.'
        : 'Somente o operador pode fazer essa mudança de status.',
    );
  }

  if (para === 'IMPROCEDENTE') {
    const texto = (justificativa ?? '').trim();
    if (texto.length < JUSTIFICATIVA_MIN || texto.length > JUSTIFICATIVA_MAX) {
      return falha(
        'JUSTIFICATIVA_OBRIGATORIA',
        `Informe a justificativa (de ${JUSTIFICATIVA_MIN} a ${JUSTIFICATIVA_MAX} caracteres).`,
      );
    }
  }

  return { ok: true };
}

/**
 * Status para os quais o ator pode levar a denúncia (usado para montar os botões do painel e do app).
 * Não inclui a exceção do lote.
 */
export function acoesDisponiveis(status: StatusDenuncia, ator: Ator): StatusDenuncia[] {
  const alvos = TRANSICOES[status];
  if (!alvos) return [];
  const executor = executorDa(ator);
  return (Object.entries(alvos) as [StatusDenuncia, Executor][])
    .filter(([, exigido]) => exigido === executor)
    .map(([para]) => para);
}

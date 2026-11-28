import { estaEmAberto, type StatusDenuncia } from './tipos';

export type ResultadoPrevisao =
  { ok: true } | { ok: false; codigo: 'PREVISAO_NO_PASSADO'; mensagem: string };

/**
 * Previsão de reparo (RN-009): precisa ser uma data/hora válida e **futura** no momento do cadastro.
 * Uma data igual ao instante atual também é recusada (não é futura).
 */
export function validarPrevisao(data: Date, agora: Date): ResultadoPrevisao {
  if (Number.isNaN(data.getTime()) || data.getTime() <= agora.getTime()) {
    return {
      ok: false,
      codigo: 'PREVISAO_NO_PASSADO',
      mensagem: 'A previsão de reparo precisa ser uma data e hora futuras.',
    };
  }
  return { ok: true };
}

/**
 * Previsão exibida para o bairro (RN-009, S-03): a **menor previsão futura** entre as denúncias
 * em aberto do bairro. Previsões vazias ou já vencidas são ignoradas; sem nenhuma, devolve `null`.
 */
export function menorPrevisaoFutura(
  previsoes: readonly (Date | null | undefined)[],
  agora: Date,
): Date | null {
  let menor: Date | null = null;
  for (const previsao of previsoes) {
    if (!previsao || previsao.getTime() <= agora.getTime()) continue;
    if (menor === null || previsao.getTime() < menor.getTime()) menor = previsao;
  }
  return menor;
}

export type ResultadoMudancaDePrevisao =
  | { ok: true }
  | { ok: false; codigo: 'TRANSICAO_INVALIDA' | 'PREVISAO_NO_PASSADO'; mensagem: string };

/**
 * Mudança da previsão de reparo pelo operador (RF-033, RN-009, decisão S-60): definir, trocar ou
 * **remover** (`previsao: null`) só vale **enquanto a denúncia está em aberto**; encerrada, nada
 * muda. Uma data nova precisa ser futura. A denúncia encerrada é recusada antes de olhar a data.
 */
export function validarMudancaDePrevisao(entrada: {
  status: StatusDenuncia;
  previsao: Date | null;
  agora: Date;
}): ResultadoMudancaDePrevisao {
  if (!estaEmAberto(entrada.status)) {
    return {
      ok: false,
      codigo: 'TRANSICAO_INVALIDA',
      mensagem: 'A previsão de reparo só pode ser alterada enquanto a denúncia está em aberto.',
    };
  }
  if (entrada.previsao === null) return { ok: true };
  return validarPrevisao(entrada.previsao, entrada.agora);
}

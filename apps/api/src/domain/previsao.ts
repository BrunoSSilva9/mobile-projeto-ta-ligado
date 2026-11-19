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

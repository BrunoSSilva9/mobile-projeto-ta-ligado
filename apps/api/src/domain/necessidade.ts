import { ehStatusFinal, type StatusDenuncia } from './tipos';

/** O que o cidadão respondeu no passo 3 do Denunciar (S-46). */
export type RespostaDeNecessidade = {
  /** "Sim" (`true`), "Não" (`false`) ou sem resposta (`undefined`). */
  necessidadeEspecial?: boolean;
  /** Marcou o consentimento específico (LGPD, art. 11, I)? */
  consentimento?: boolean;
};

export type ResultadoNecessidade =
  | {
      ok: true;
      /** O que gravar: `true`, `false` ou `null` (não informado). */
      necessidadeEspecial: boolean | null;
      /** Gravar a data do consentimento (só no "Sim"). */
      registrarConsentimento: boolean;
    }
  | { ok: false; codigo: 'CONSENTIMENTO_OBRIGATORIO'; mensagem: string };

/**
 * Necessidade especial (RN-015, decisão S-46): a resposta é só Sim/Não, sem texto livre. O "Sim"
 * revela dado de saúde e **só é aceito com o consentimento específico**; o "Não" e a falta de
 * resposta não precisam dele.
 */
export function validarNecessidade(resposta: RespostaDeNecessidade): ResultadoNecessidade {
  if (resposta.necessidadeEspecial === true) {
    if (resposta.consentimento !== true) {
      return {
        ok: false,
        codigo: 'CONSENTIMENTO_OBRIGATORIO',
        mensagem:
          'Para enviar a necessidade especial, autorize o envio dessa informação à Equatorial.',
      };
    }
    return { ok: true, necessidadeEspecial: true, registrarConsentimento: true };
  }
  if (resposta.necessidadeEspecial === false) {
    return { ok: true, necessidadeEspecial: false, registrarConsentimento: false };
  }
  return { ok: true, necessidadeEspecial: null, registrarConsentimento: false };
}

/** Prioritária = "Sim" (RN-015). "Não", não informado e resposta já apagada (RN-026) não são. */
export const ehPrioritaria = (necessidadeEspecial: boolean | null | undefined): boolean =>
  necessidadeEspecial === true;

/**
 * Retenção da necessidade especial (RN-026, decisão S-47): ao entrar num status final, a resposta e
 * o registro do consentimento são apagados **na mesma gravação** da mudança de status. Vale para
 * todos os caminhos (operador, lote e cancelamento pelo autor). Nos outros status, nada muda.
 */
export function camposSensiveisAoMudarStatus(
  para: StatusDenuncia,
): { necessidadeEspecial: null; consentimentoNecessidadeEm: null } | Record<string, never> {
  return ehStatusFinal(para) ? { necessidadeEspecial: null, consentimentoNecessidadeEm: null } : {};
}

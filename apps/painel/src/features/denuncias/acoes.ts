import type { StatusDaDenuncia } from './tipos';

/**
 * Para quais status o operador pode levar a denúncia (RN-004). Cópia da regra do servidor
 * (`acoesDisponiveis` em `apps/api/src/domain`), usada só para montar os botões; quem decide de
 * verdade é a API, que recusa qualquer outra transição com 422.
 */
export function acoesDoOperador(status: StatusDaDenuncia): StatusDaDenuncia[] {
  switch (status) {
    case 'RECEBIDA':
      return ['EM_ATENDIMENTO', 'IMPROCEDENTE'];
    case 'EM_ATENDIMENTO':
      return ['RESOLVIDA', 'IMPROCEDENTE'];
    default:
      return [];
  }
}

export const JUSTIFICATIVA_MIN = 10;
export const JUSTIFICATIVA_MAX = 500;

/** Texto de erro da justificativa de improcedência (RN-010), ou `null` se estiver válida. */
export function erroDaJustificativa(texto: string): string | null {
  const n = texto.trim().length;
  if (n < JUSTIFICATIVA_MIN) {
    return `Explique o motivo em pelo menos ${JUSTIFICATIVA_MIN} caracteres.`;
  }
  if (n > JUSTIFICATIVA_MAX) {
    return `A justificativa pode ter no máximo ${JUSTIFICATIVA_MAX} caracteres.`;
  }
  return null;
}

/**
 * Converte o valor de um `datetime-local` (hora do navegador) em ISO 8601. Devolve `null` se
 * estiver vazio, `'passado'` se a data não for futura (RN-009) e `'invalida'` se não for uma data.
 */
export function previsaoParaIso(
  valor: string,
  agoraMs: number = Date.now(),
): string | null | 'passado' | 'invalida' {
  if (valor.trim() === '') return null;
  const ms = new Date(valor).getTime();
  if (Number.isNaN(ms)) return 'invalida';
  if (ms <= agoraMs) return 'passado';
  return new Date(ms).toISOString();
}

/**
 * O inverso de `previsaoParaIso`: um ISO 8601 vira o valor de um `datetime-local` (hora do
 * navegador, `AAAA-MM-DDTHH:mm`), para preencher o campo com a previsão que já existe.
 */
export function isoParaCampoDeData(iso: string | null | undefined): string {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T${dois(data.getHours())}:${dois(data.getMinutes())}`;
}

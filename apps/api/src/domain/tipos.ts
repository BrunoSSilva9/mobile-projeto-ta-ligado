/**
 * Tipos e constantes do domínio (RN-002, RN-003).
 * São uniões de strings que espelham os enums do Prisma, mas sem depender dele:
 * o domínio é puro (S-40) e não importa Prisma, Express nem Socket.IO.
 */
export type Papel = 'CIDADAO' | 'OPERADOR';

export type TipoDenuncia = 'SEM_ENERGIA' | 'OSCILACAO';

export type StatusDenuncia =
  'RECEBIDA' | 'EM_ATENDIMENTO' | 'RESOLVIDA' | 'IMPROCEDENTE' | 'CANCELADA';

/** Status calculado do bairro (RN-007). Não é armazenado. */
export type StatusBairro = 'SEM_LUZ' | 'OSCILACAO' | 'NORMAL';

export const TODOS_OS_STATUS: readonly StatusDenuncia[] = [
  'RECEBIDA',
  'EM_ATENDIMENTO',
  'RESOLVIDA',
  'IMPROCEDENTE',
  'CANCELADA',
];

/** Denúncia "em aberto" (RN-003): ainda não chegou a um estado final. */
export const STATUS_EM_ABERTO: readonly StatusDenuncia[] = ['RECEBIDA', 'EM_ATENDIMENTO'];

export const STATUS_FINAIS: readonly StatusDenuncia[] = ['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'];

export function estaEmAberto(status: StatusDenuncia): boolean {
  return STATUS_EM_ABERTO.includes(status);
}

export function ehStatusFinal(status: StatusDenuncia): boolean {
  return STATUS_FINAIS.includes(status);
}

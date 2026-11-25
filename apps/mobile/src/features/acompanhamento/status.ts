import { rotuloDoAndamento } from '@/features/situacao';

export type StatusDaDenuncia =
  'RECEBIDA' | 'EM_ATENDIMENTO' | 'RESOLVIDA' | 'IMPROCEDENTE' | 'CANCELADA';

/** Texto do status em caixa normal (a apresentação mora em `features/situacao.ts`, decisão R-13). */
export const rotuloDoStatus = (status: string): string => rotuloDoAndamento(status);

/** Em aberto = ainda não terminou (RN-006). */
export const statusEmAberto = (status: string): boolean =>
  status === 'RECEBIDA' || status === 'EM_ATENDIMENTO';

import { colors } from '@/theme';

export type StatusDaDenuncia =
  'RECEBIDA' | 'EM_ATENDIMENTO' | 'RESOLVIDA' | 'IMPROCEDENTE' | 'CANCELADA';

export const ROTULOS_DE_STATUS: Record<StatusDaDenuncia, string> = {
  RECEBIDA: 'Recebida',
  EM_ATENDIMENTO: 'Em atendimento',
  RESOLVIDA: 'Resolvida',
  IMPROCEDENTE: 'Improcedente',
  CANCELADA: 'Cancelada',
};

export const rotuloDoStatus = (status: string): string =>
  ROTULOS_DE_STATUS[status as StatusDaDenuncia] ?? status;

/** Cor do ponto do status (decisão S-26). O texto do selo usa sempre a cor de texto padrão. */
export const corDoStatus = (status: string): string =>
  colors.complaintStatus[status as StatusDaDenuncia] ?? colors.textMuted;

/** Em aberto = ainda não terminou (RN-006). */
export const statusEmAberto = (status: string): boolean =>
  status === 'RECEBIDA' || status === 'EM_ATENDIMENTO';

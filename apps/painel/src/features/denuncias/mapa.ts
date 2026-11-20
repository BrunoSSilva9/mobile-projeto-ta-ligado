import { statusEmAberto, type DenunciaDoPainel } from './tipos';

/** Centro de Marabá-PA. */
export const CENTRO_DE_MARABA: [number, number] = [-5.3686, -49.1178];

/** Cor do pino: denúncias encerradas ficam cinza; em aberto, vermelho (sem energia) ou âmbar. */
export function corDoPino(d: Pick<DenunciaDoPainel, 'tipo' | 'status'>): string {
  if (!statusEmAberto(d.status)) return '#6e7a6d';
  return d.tipo === 'SEM_ENERGIA' ? '#ba1a1a' : '#ce8300';
}

type ComCoordenadas = DenunciaDoPainel & { latitude: number; longitude: number };

export const temCoordenadas = (d: DenunciaDoPainel): d is ComCoordenadas =>
  d.latitude !== null && d.longitude !== null;

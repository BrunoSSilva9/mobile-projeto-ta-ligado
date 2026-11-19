import type { PrismaClient } from '@prisma/client';

import {
  calcularStatusBairro,
  menorPrevisaoFutura,
  STATUS_EM_ABERTO,
  type StatusBairro,
} from '../../domain';

export type StatusDoBairro = {
  bairroId: number;
  nome: string;
  folha: string | null;
  status: StatusBairro;
  /** Quantas denúncias em aberto o bairro tem. */
  emAberto: number;
  /** Menor previsão de reparo futura entre as denúncias em aberto (RN-009), ou `null`. */
  previsaoReparo: string | null;
};

/**
 * Status calculado de um bairro (RN-007, RN-009), lendo as denúncias em aberto do banco.
 * Usado pelo evento `bairro:status-atualizado` (e, no Passo 11, por `GET /bairros/status`).
 * Devolve `null` se o bairro não existir.
 */
export async function obterStatusDoBairro(
  prisma: PrismaClient,
  bairroId: number,
  agora: Date,
): Promise<StatusDoBairro | null> {
  const [bairro, emAberto] = await Promise.all([
    prisma.bairro.findUnique({ where: { id: bairroId } }),
    prisma.denuncia.findMany({
      where: { bairroId, status: { in: [...STATUS_EM_ABERTO] } },
      select: { tipo: true, status: true, previsaoReparo: true },
    }),
  ]);
  if (!bairro) return null;

  return {
    bairroId: bairro.id,
    nome: bairro.nome,
    folha: bairro.folha,
    status: calcularStatusBairro(emAberto),
    emAberto: emAberto.length,
    previsaoReparo:
      menorPrevisaoFutura(
        emAberto.map((d) => d.previsaoReparo),
        agora,
      )?.toISOString() ?? null,
  };
}

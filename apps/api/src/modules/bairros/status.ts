import type { PrismaClient } from '@prisma/client';

import {
  calcularStatusBairro,
  menorPrevisaoFutura,
  STATUS_EM_ABERTO,
  type StatusBairro,
  type StatusDenuncia,
  type TipoDenuncia,
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

export type StatusDoBairroComLocal = StatusDoBairro & { latitude: number; longitude: number };

/** Monta o status (RN-007) e a previsão (RN-009) a partir das denúncias em aberto do bairro. */
function resumir(
  bairro: { id: number; nome: string; folha: string | null },
  emAberto: readonly { tipo: TipoDenuncia; status: StatusDenuncia; previsaoReparo: Date | null }[],
  agora: Date,
): StatusDoBairro {
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

/**
 * Status calculado de um bairro (RN-007, RN-009), lendo as denúncias em aberto do banco.
 * Usado pelo evento `bairro:status-atualizado`. Devolve `null` se o bairro não existir.
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
  return resumir(bairro, emAberto, agora);
}

/**
 * Status de **todos** os bairros (RF-019, RF-023), em duas consultas: a lista fixa de bairros e as
 * denúncias em aberto. Bairro sem denúncia em aberto fica `NORMAL`.
 */
export async function obterStatusDeTodosOsBairros(
  prisma: PrismaClient,
  agora: Date,
): Promise<StatusDoBairroComLocal[]> {
  const [bairros, emAberto] = await Promise.all([
    prisma.bairro.findMany({ orderBy: [{ nome: 'asc' }, { folha: 'asc' }] }),
    prisma.denuncia.findMany({
      where: { status: { in: [...STATUS_EM_ABERTO] } },
      select: { bairroId: true, tipo: true, status: true, previsaoReparo: true },
    }),
  ]);

  const porBairro = new Map<number, typeof emAberto>();
  for (const d of emAberto) {
    const lista = porBairro.get(d.bairroId) ?? [];
    lista.push(d);
    porBairro.set(d.bairroId, lista);
  }

  return bairros.map((b) => ({
    ...resumir(b, porBairro.get(b.id) ?? [], agora),
    latitude: b.latitude.toNumber(),
    longitude: b.longitude.toNumber(),
  }));
}

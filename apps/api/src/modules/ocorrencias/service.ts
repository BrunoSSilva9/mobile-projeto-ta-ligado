import type { Prisma, PrismaClient } from '@prisma/client';

import { projetarOcorrenciaPublica, STATUS_EM_ABERTO } from '../../domain';
import { normalizarTexto } from '../../shared/texto';
import type { ConsultaDeOcorrencias } from './schemas';

/** "Restabelecidos" = resolvidas nas últimas 24 horas (RN-007, decisão S-21). */
export const JANELA_DE_RESTABELECIDOS_MS = 24 * 60 * 60 * 1000;

type Deps = { prisma: PrismaClient; relogio?: () => Date };

/**
 * Ocorrências públicas (RF-019 a RF-021): a visão dos demais cidadãos, **anonimizada** (RN-014).
 * A resposta passa sempre por `projetarOcorrenciaPublica`, que usa uma lista explícita de campos:
 * autor, telefone, protocolo, fotos, pessoas afetadas, necessidade especial, ponto de referência,
 * CEP e coordenadas exatas nunca saem daqui.
 */
export function criarServicoOcorrencias({ prisma, relogio = () => new Date() }: Deps) {
  /** Ids dos bairros cujo nome ou folha contém a busca, sem diferenciar acentos nem caixa. */
  async function bairrosDaBusca(q: string): Promise<number[]> {
    const termo = normalizarTexto(q);
    const todos = await prisma.bairro.findMany({ select: { id: true, nome: true, folha: true } });
    return todos
      .filter((b) => normalizarTexto(`${b.nome} ${b.folha ?? ''}`).includes(termo))
      .map((b) => b.id);
  }

  async function listar(consulta: ConsultaDeOcorrencias) {
    const agora = relogio();

    // Filtro de bairro: o escolhido, a busca por texto, ou os dois (a interseção).
    let bairros: number[] | undefined;
    if (consulta.q) bairros = await bairrosDaBusca(consulta.q);
    if (consulta.bairroId !== undefined) {
      bairros = bairros ? bairros.filter((id) => id === consulta.bairroId) : [consulta.bairroId];
    }
    const doBairro: Prisma.DenunciaWhereInput = bairros ? { bairroId: { in: bairros } } : {};

    const emAberto = { in: [...STATUS_EM_ABERTO] } as Prisma.EnumStatusDenunciaFilter;
    const ondeSemLuz: Prisma.DenunciaWhereInput = {
      ...doBairro,
      status: emAberto,
      tipo: 'SEM_ENERGIA',
    };
    const ondeOscilacao: Prisma.DenunciaWhereInput = {
      ...doBairro,
      status: emAberto,
      tipo: 'OSCILACAO',
    };
    const ondeRestabelecido: Prisma.DenunciaWhereInput = {
      ...doBairro,
      status: 'RESOLVIDA',
      finalizadaEm: { gte: new Date(agora.getTime() - JANELA_DE_RESTABELECIDOS_MS) },
    };

    const onde: Prisma.DenunciaWhereInput =
      consulta.status === 'SEM_LUZ'
        ? ondeSemLuz
        : consulta.status === 'OSCILACAO'
          ? ondeOscilacao
          : consulta.status === 'RESTABELECIDO'
            ? ondeRestabelecido
            : { OR: [ondeSemLuz, ondeOscilacao, ondeRestabelecido] };

    const [itens, total, semLuz, oscilacao, restabelecidos] = await Promise.all([
      prisma.denuncia.findMany({
        where: onde,
        orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
        skip: (consulta.page - 1) * consulta.limite,
        take: consulta.limite,
        include: { bairro: { select: { id: true, nome: true, folha: true } } },
      }),
      prisma.denuncia.count({ where: onde }),
      prisma.denuncia.count({ where: ondeSemLuz }),
      prisma.denuncia.count({ where: ondeOscilacao }),
      prisma.denuncia.count({ where: ondeRestabelecido }),
    ]);

    return {
      itens: itens.map((d) =>
        projetarOcorrenciaPublica({
          id: d.id,
          tipo: d.tipo,
          status: d.status,
          bairro: d.bairro,
          logradouro: d.logradouro,
          descricao: d.descricao,
          latitude: d.latitude?.toNumber() ?? null,
          longitude: d.longitude?.toNumber() ?? null,
          criadoEm: d.criadoEm,
        }),
      ),
      pagina: consulta.page,
      total,
      // Contagem dos chips: respeita o bairro e a busca, mas não o chip escolhido (RF-020).
      totais: {
        todos: semLuz + oscilacao + restabelecidos,
        semLuz,
        oscilacao,
        restabelecidos,
      },
      atualizadoEm: agora.toISOString(),
    };
  }

  return { listar };
}

export type ServicoOcorrencias = ReturnType<typeof criarServicoOcorrencias>;

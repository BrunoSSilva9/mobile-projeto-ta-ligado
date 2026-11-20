import { Prisma, type PrismaClient } from '@prisma/client';

import {
  ehStatusFinal,
  estaEmAberto,
  validarPrevisao,
  validarTransicao,
  type StatusDenuncia,
} from '../../domain';
import { publicadorNulo, type Publicador } from '../../realtime/publicador';
import { erros } from '../../shared/errors';
import { paraSnapshot } from '../denuncias/snapshot';
import type { DadosDeStatus, FiltrosDoPainel } from './schemas';

export type PainelDeps = {
  prisma: PrismaClient;
  publicador?: Publicador;
  /** Relógio injetável (os testes fixam a data). */
  relogio?: () => Date;
};

export type OperadorDaRequisicao = { id: string };

/** O que o cidadão vê como autor das mudanças da operadora (RN-014): nunca o nome do operador. */
const POR_OPERADORA = 'Equatorial Pará';

const num = (valor: Prisma.Decimal | null): number | null =>
  valor === null ? null : valor.toNumber();

const INCLUIR_DETALHE = {
  bairro: true,
  autor: { select: { id: true, nome: true, telefone: true } },
  historico: {
    orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
    include: { alteradoPor: { select: { nome: true } } },
  },
} satisfies Prisma.DenunciaInclude;

type DenunciaDetalhada = Prisma.DenunciaGetPayload<{ include: typeof INCLUIR_DETALHE }>;

/** Detalhe completo para o operador (RN-014): autor, telefone, local, histórico com quem alterou. */
function paraDetalheDoPainel(d: DenunciaDetalhada) {
  return {
    id: d.id,
    protocolo: d.protocolo,
    prioritaria: d.necessidadeEspecial,
    tipo: d.tipo,
    status: d.status,
    autor: d.autor ? { id: d.autor.id, nome: d.autor.nome, telefone: d.autor.telefone } : null,
    logradouro: d.logradouro,
    cep: d.cep,
    pontoReferencia: d.pontoReferencia,
    bairro: { id: d.bairro.id, nome: d.bairro.nome, folha: d.bairro.folha },
    descricao: d.descricao,
    latitude: num(d.latitude),
    longitude: num(d.longitude),
    faixaPessoas: d.faixaPessoas,
    necessidadeEspecial: d.necessidadeEspecial,
    detalheNecessidade: d.detalheNecessidade,
    previsaoReparo: d.previsaoReparo?.toISOString() ?? null,
    justificativa: d.justificativa,
    fotos: [] as { id: string; url: string }[], // fotos entram na Fase 2 (B-031)
    historico: d.historico.map((h) => ({
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      papel: h.papelAutor,
      por: h.alteradoPor?.nome ?? (h.papelAutor === 'CIDADAO' ? 'Cidadão' : 'Operador'),
      justificativa: h.justificativa,
      criadoEm: h.criadoEm.toISOString(),
    })),
    criadoEm: d.criadoEm.toISOString(),
    atualizadoEm: d.atualizadoEm.toISOString(),
    finalizadaEm: d.finalizadaEm?.toISOString() ?? null,
  };
}

export function criarServicoPainel({
  prisma,
  publicador = publicadorNulo,
  relogio = () => new Date(),
}: PainelDeps) {
  /**
   * RF-028, RF-029, RF-035: lista com filtros. A ordem é a de RN-015: prioritárias primeiro e,
   * dentro de cada grupo, da mais antiga para a mais recente (a que espera há mais tempo).
   */
  async function listar(filtros: FiltrosDoPainel) {
    const where: Prisma.DenunciaWhereInput = {
      ...(filtros.status ? { status: { in: filtros.status as StatusDenuncia[] } } : {}),
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.bairroId ? { bairroId: filtros.bairroId } : {}),
      ...(filtros.prioritarias !== undefined ? { necessidadeEspecial: filtros.prioritarias } : {}),
    };

    const [itens, total] = await Promise.all([
      prisma.denuncia.findMany({
        where,
        orderBy: [{ necessidadeEspecial: 'desc' }, { criadoEm: 'asc' }, { id: 'asc' }],
        skip: (filtros.page - 1) * filtros.limite,
        take: filtros.limite,
        include: { bairro: { select: { id: true, nome: true, folha: true } } },
      }),
      prisma.denuncia.count({ where }),
    ]);

    return {
      itens: itens.map((d) => ({
        id: d.id,
        protocolo: d.protocolo,
        prioritaria: d.necessidadeEspecial,
        tipo: d.tipo,
        status: d.status,
        bairro: { id: d.bairro.id, nome: d.bairro.nome, folha: d.bairro.folha },
        logradouro: d.logradouro,
        latitude: num(d.latitude),
        longitude: num(d.longitude),
        previsaoReparo: d.previsaoReparo?.toISOString() ?? null,
        criadoEm: d.criadoEm.toISOString(),
      })),
      pagina: filtros.page,
      total,
    };
  }

  /** RF-030: detalhe completo. */
  async function detalhe(id: string) {
    const d = await prisma.denuncia.findUnique({ where: { id }, include: INCLUIR_DETALHE });
    if (!d) throw erros.naoEncontrado('Denúncia não encontrada.');
    return paraDetalheDoPainel(d);
  }

  /**
   * RF-031, RF-032, RF-033, RF-036. Valida a transição com as regras de domínio e grava o novo
   * status e o histórico **na mesma transação** (RNF-010). Se outra pessoa mudou o status no
   * meio tempo (por exemplo, o cidadão cancelou), a gravação condicional não acha a linha e a
   * resposta é 422 (decisão S-29). O evento em tempo real só sai depois do commit.
   */
  async function atualizarStatus(operador: OperadorDaRequisicao, id: string, dados: DadosDeStatus) {
    const agora = relogio();
    const para = dados.status as StatusDenuncia;
    const previsao = dados.previsaoReparo ? new Date(dados.previsaoReparo) : undefined;

    if (previsao) {
      if (!estaEmAberto(para)) {
        throw erros.validacao([
          {
            campo: 'previsaoReparo',
            mensagem: 'A previsão de reparo só vale para denúncias em aberto.',
          },
        ]);
      }
      const previsaoValida = validarPrevisao(previsao, agora);
      if (!previsaoValida.ok) throw erros.previsaoNoPassado(previsaoValida.mensagem);
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const atual = await tx.denuncia.findUnique({ where: { id } });
      if (!atual) throw erros.naoEncontrado('Denúncia não encontrada.');

      const validacao = validarTransicao({
        de: atual.status,
        para,
        ator: { papel: 'OPERADOR', ehAutor: false },
        justificativa: dados.justificativa,
      });
      if (!validacao.ok) {
        if (validacao.codigo === 'SEM_PERMISSAO') throw erros.semPermissao(validacao.mensagem);
        if (validacao.codigo === 'JUSTIFICATIVA_OBRIGATORIA') {
          throw erros.justificativaObrigatoria(validacao.mensagem);
        }
        throw erros.transicaoInvalida(validacao.mensagem);
      }

      // A justificativa só vale (e só é guardada) para IMPROCEDENTE.
      const justificativa = para === 'IMPROCEDENTE' ? dados.justificativa!.trim() : null;

      const alterada = await tx.denuncia.updateMany({
        where: { id, status: atual.status }, // só altera se o status ainda for o que o operador viu
        data: {
          status: para,
          ...(justificativa ? { justificativa } : {}),
          ...(previsao ? { previsaoReparo: previsao } : {}),
          ...(ehStatusFinal(para) ? { finalizadaEm: agora } : {}),
        },
      });
      if (alterada.count === 0) {
        throw erros.transicaoInvalida(
          'O status desta denúncia mudou enquanto você decidia. Atualize a tela e tente de novo.',
        );
      }

      const historico = await tx.historicoStatus.create({
        data: {
          denunciaId: id,
          statusAnterior: atual.status,
          statusNovo: para,
          alteradoPorId: operador.id,
          papelAutor: 'OPERADOR',
          justificativa,
        },
      });

      const completa = await tx.denuncia.findUniqueOrThrow({
        where: { id },
        include: INCLUIR_DETALHE,
      });
      return { completa, statusAnterior: atual.status, alteradoEm: historico.criadoEm };
    });

    // Depois do commit: uma falha ao emitir o evento não desfaz nem falha a operação.
    try {
      await publicador.statusAtualizado({
        denuncia: paraSnapshot(resultado.completa),
        statusAnterior: resultado.statusAnterior,
        alteradoEm: resultado.alteradoEm,
        por: POR_OPERADORA,
      });
    } catch (erro) {
      console.error('Falha ao publicar o evento denuncia:status-atualizado', erro);
    }

    return paraDetalheDoPainel(resultado.completa);
  }

  return { listar, detalhe, atualizarStatus };
}

export type ServicoPainel = ReturnType<typeof criarServicoPainel>;

import { Prisma, type PrismaClient } from '@prisma/client';

import {
  camposSensiveisAoMudarStatus,
  ehPrioritaria,
  DIAS_DA_JANELA,
  ehStatusFinal,
  estaEmAberto,
  inicioDaJanela,
  resumirPorBairro,
  taxaResolucao,
  validarMudancaDePrevisao,
  validarPrevisao,
  validarTransicao,
  type StatusDenuncia,
} from '../../domain';
import { publicadorNulo, type Publicador } from '../../realtime/publicador';
import { erros } from '../../shared/errors';
import { paraSnapshot } from '../denuncias/snapshot';
import type { DadosDePrevisao, DadosDeStatus, FiltrosDoPainel } from './schemas';

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
  fotos: { orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }] },
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
    prioritaria: ehPrioritaria(d.necessidadeEspecial),
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
    // Sim/Não ou nula (não informada, ou apagada ao encerrar: RN-026). Sem texto livre (S-46).
    necessidadeEspecial: d.necessidadeEspecial,
    consentimentoNecessidadeEm: d.consentimentoNecessidadeEm?.toISOString() ?? null,
    previsaoReparo: d.previsaoReparo?.toISOString() ?? null,
    justificativa: d.justificativa,
    fotos: d.fotos.map((f) => ({ id: f.id, url: `/api/v1/denuncias/${d.id}/fotos/${f.id}` })),
    historico: d.historico.map((h) => ({
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      // STATUS = mudança de status; PREVISAO = só a previsão mudou (S-60). `previsaoReparo` nulo
      // num evento PREVISAO quer dizer "previsão removida".
      evento: h.evento,
      previsaoReparo: h.previsaoReparo?.toISOString() ?? null,
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
      // "Só prioritárias" = Sim; "não prioritárias" = Não ou sem resposta (nula).
      ...(filtros.prioritarias === true ? { necessidadeEspecial: true } : {}),
      ...(filtros.prioritarias === false
        ? { OR: [{ necessidadeEspecial: false }, { necessidadeEspecial: null }] }
        : {}),
    };

    const [itens, total] = await Promise.all([
      prisma.denuncia.findMany({
        where,
        // RN-015: prioritárias primeiro. `nulls: 'last'` é obrigatório: no PostgreSQL, em ordem
        // decrescente, os nulos viriam ANTES do "Sim".
        orderBy: [
          { necessidadeEspecial: { sort: 'desc', nulls: 'last' } },
          { criadoEm: 'asc' },
          { id: 'asc' },
        ],
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
        prioritaria: ehPrioritaria(d.necessidadeEspecial),
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
          ...camposSensiveisAoMudarStatus(para), // RN-026: apaga a necessidade especial ao encerrar
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
          // A previsão informada junto com a mudança de status também fica no registro.
          previsaoReparo: previsao ?? null,
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

  /**
   * RF-033, RN-009, RN-011, decisão S-60: o operador **define, troca ou remove** só a previsão de
   * reparo, **enquanto a denúncia está em aberto**. Cada mudança vira um registro no histórico
   * (`evento: PREVISAO`, com o status igual antes e depois), na mesma transação (RNF-010).
   * Pedir o mesmo valor que já está salvo não muda nada (sem registro nem evento). A gravação é
   * condicional ao status lido: se o status mudou no meio tempo, a resposta é 422 (S-29).
   * O evento sai depois do commit, no mesmo formato de sempre (`status` e `statusAnterior` iguais).
   */
  async function atualizarPrevisao(
    operador: OperadorDaRequisicao,
    id: string,
    dados: DadosDePrevisao,
  ) {
    const agora = relogio();
    const nova = dados.previsaoReparo === null ? null : new Date(dados.previsaoReparo);

    const resultado = await prisma.$transaction(async (tx) => {
      const atual = await tx.denuncia.findUnique({ where: { id } });
      if (!atual) throw erros.naoEncontrado('Denúncia não encontrada.');

      const validacao = validarMudancaDePrevisao({ status: atual.status, previsao: nova, agora });
      if (!validacao.ok) {
        if (validacao.codigo === 'PREVISAO_NO_PASSADO') {
          throw erros.previsaoNoPassado(validacao.mensagem);
        }
        throw erros.transicaoInvalida(validacao.mensagem);
      }

      const igual = (atual.previsaoReparo?.getTime() ?? null) === (nova?.getTime() ?? null);
      if (igual) return { mudou: false as const, id };

      const alterada = await tx.denuncia.updateMany({
        where: { id, status: atual.status }, // só altera se o status ainda for o que o operador viu
        data: { previsaoReparo: nova },
      });
      if (alterada.count === 0) {
        throw erros.transicaoInvalida(
          'O status desta denúncia mudou enquanto você decidia. Atualize a tela e tente de novo.',
        );
      }

      const historico = await tx.historicoStatus.create({
        data: {
          denunciaId: id,
          evento: 'PREVISAO',
          statusAnterior: atual.status,
          statusNovo: atual.status,
          previsaoReparo: nova,
          alteradoPorId: operador.id,
          papelAutor: 'OPERADOR',
        },
      });
      return { mudou: true as const, id, status: atual.status, alteradoEm: historico.criadoEm };
    });

    const completa = await prisma.denuncia.findUniqueOrThrow({
      where: { id },
      include: INCLUIR_DETALHE,
    });

    // Depois do commit: uma falha ao emitir o evento não desfaz nem falha a operação.
    if (resultado.mudou) {
      try {
        await publicador.statusAtualizado({
          denuncia: paraSnapshot(completa),
          statusAnterior: resultado.status,
          alteradoEm: resultado.alteradoEm,
          por: POR_OPERADORA,
        });
      } catch (erro) {
        console.error('Falha ao publicar o evento denuncia:status-atualizado', erro);
      }
    }

    return paraDetalheDoPainel(completa);
  }

  /**
   * RF-034: visão agrupada por bairro, só com as denúncias em aberto (a conta é da regra de
   * domínio `resumirPorBairro`).
   */
  async function listarPorBairro() {
    const abertas = await prisma.denuncia.findMany({
      where: { status: { in: ['RECEBIDA', 'EM_ATENDIMENTO'] } },
      select: {
        tipo: true,
        status: true,
        necessidadeEspecial: true,
        bairro: { select: { id: true, nome: true, folha: true } },
      },
    });
    return {
      bairros: resumirPorBairro(
        abertas.map((d) => ({
          bairroId: d.bairro.id,
          nome: d.bairro.nome,
          folha: d.bairro.folha,
          tipo: d.tipo,
          status: d.status,
          prioritaria: ehPrioritaria(d.necessidadeEspecial),
        })),
      ),
    };
  }

  /**
   * RF-034, RN-016: resolve de uma vez **todas as denúncias em aberto do bairro**. Numa única
   * transação, cada uma vai para RESOLVIDA (única exceção de RN-004: RECEBIDA -> RESOLVIDA), com
   * o seu registro no histórico (RN-011), `finalizadaEm` e a retenção da necessidade especial
   * (RN-026). A gravação é condicional ao status lido: a denúncia que mudou no meio tempo (por
   * exemplo, o cidadão cancelou) fica de fora, sem derrubar as outras. Os eventos em tempo real
   * saem depois do commit, um por denúncia.
   */
  async function resolverBairro(operador: OperadorDaRequisicao, bairroId: number) {
    const agora = relogio();

    const bairro = await prisma.bairro.findUnique({ where: { id: bairroId } });
    if (!bairro) throw erros.naoEncontrado('Bairro não encontrado.');

    const resolvidas = await prisma.$transaction(async (tx) => {
      const abertas = await tx.denuncia.findMany({
        where: { bairroId, status: { in: ['RECEBIDA', 'EM_ATENDIMENTO'] } },
        orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
      });

      const feitas: { id: string; statusAnterior: StatusDenuncia; alteradoEm: Date }[] = [];
      for (const atual of abertas) {
        const validacao = validarTransicao({
          de: atual.status,
          para: 'RESOLVIDA',
          ator: { papel: 'OPERADOR', ehAutor: false },
          lote: true,
        });
        if (!validacao.ok) continue;

        const alterada = await tx.denuncia.updateMany({
          where: { id: atual.id, status: atual.status },
          data: {
            status: 'RESOLVIDA',
            finalizadaEm: agora,
            ...camposSensiveisAoMudarStatus('RESOLVIDA'), // RN-026
          },
        });
        if (alterada.count === 0) continue;

        const historico = await tx.historicoStatus.create({
          data: {
            denunciaId: atual.id,
            statusAnterior: atual.status,
            statusNovo: 'RESOLVIDA',
            alteradoPorId: operador.id,
            papelAutor: 'OPERADOR',
          },
        });
        feitas.push({ id: atual.id, statusAnterior: atual.status, alteradoEm: historico.criadoEm });
      }
      return feitas;
    });

    // Depois do commit: uma falha ao emitir um evento não desfaz nem falha a operação.
    for (const feita of resolvidas) {
      try {
        const completa = await prisma.denuncia.findUniqueOrThrow({
          where: { id: feita.id },
          include: INCLUIR_DETALHE,
        });
        await publicador.statusAtualizado({
          denuncia: paraSnapshot(completa),
          statusAnterior: feita.statusAnterior,
          alteradoEm: feita.alteradoEm,
          por: POR_OPERADORA,
        });
      } catch (erro) {
        console.error('Falha ao publicar o evento denuncia:status-atualizado', erro);
      }
    }

    return { resolvidas: resolvidas.length };
  }

  /**
   * RF-018, RN-017: indicadores dos últimos 30 dias, calculados do banco. "Resolvidas" conta as
   * denúncias que passaram a `RESOLVIDA` na janela (pelo histórico, que registra cada mudança
   * uma vez); "em atendimento" é a situação de agora; usuários é o total de cidadãos.
   */
  async function indicadores() {
    const desde = inicioDaJanela(relogio());
    const [usuariosCadastrados, denunciasRegistradas, emAtendimento, resolvidas] =
      await Promise.all([
        prisma.usuario.count({ where: { papel: 'CIDADAO' } }),
        prisma.denuncia.count({ where: { criadoEm: { gte: desde } } }),
        prisma.denuncia.count({ where: { status: 'EM_ATENDIMENTO' } }),
        prisma.historicoStatus.count({
          where: { evento: 'STATUS', statusNovo: 'RESOLVIDA', criadoEm: { gte: desde } },
        }),
      ]);
    return {
      periodoDias: DIAS_DA_JANELA,
      usuariosCadastrados,
      denunciasRegistradas,
      emAtendimento,
      resolvidas,
      taxaResolucao: taxaResolucao(resolvidas, denunciasRegistradas),
    };
  }

  return {
    listar,
    detalhe,
    atualizarStatus,
    atualizarPrevisao,
    listarPorBairro,
    resolverBairro,
    indicadores,
  };
}

export type ServicoPainel = ReturnType<typeof criarServicoPainel>;

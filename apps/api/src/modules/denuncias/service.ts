import { Prisma, type PrismaClient } from '@prisma/client';

import {
  formatarProtocolo,
  podeCriarDenuncia,
  podeVerDenuncia,
  STATUS_EM_ABERTO,
  type UsuarioAutenticado,
} from '../../domain';
import { publicadorNulo, type Publicador } from '../../realtime/publicador';
import { erros } from '../../shared/errors';
import type { ConsultaMinhasDenuncias, DadosDeDenuncia } from './schemas';

export type DenunciasDeps = {
  prisma: PrismaClient;
  publicador?: Publicador;
  /** Relógio injetável (os testes fixam a data para conferir o ano do protocolo). */
  relogio?: () => Date;
};

export type AutorDaDenuncia = { id: string; nome: string; telefone: string | null };

const num = (valor: Prisma.Decimal | null): number | null =>
  valor === null ? null : valor.toNumber();

/** Próximo número do protocolo do ano, de forma atômica (S-34): sem corrida entre requisições. */
async function proximaSequencia(tx: Prisma.TransactionClient, ano: number): Promise<number> {
  const linhas = await tx.$queryRaw<{ ultimo: number }[]>`
    INSERT INTO "ProtocoloSequencia" ("ano", "ultimo") VALUES (${ano}, 1)
    ON CONFLICT ("ano") DO UPDATE SET "ultimo" = "ProtocoloSequencia"."ultimo" + 1
    RETURNING "ultimo"`;
  return linhas[0]!.ultimo;
}

export function criarServicoDenuncias({
  prisma,
  publicador = publicadorNulo,
  relogio = () => new Date(),
}: DenunciasDeps) {
  /** Id da denúncia em aberto do autor (para o app levar o usuário até ela, RF-011). */
  async function idDaDenunciaEmAberto(autorId: string): Promise<string | undefined> {
    const aberta = await prisma.denuncia.findFirst({
      where: { autorId, status: { in: [...STATUS_EM_ABERTO] } },
      select: { id: true },
    });
    return aberta?.id;
  }

  /**
   * RF-007, RF-011, RF-012, RF-036. Tudo numa transação: confere o bairro e o limite (RN-006),
   * gera o protocolo (RN-023), cria a denúncia `RECEBIDA` e o primeiro registro do histórico (RN-011).
   * O evento em tempo real só sai **depois** do commit.
   */
  async function criar(autor: AutorDaDenuncia, dados: DadosDeDenuncia) {
    const agora = relogio();

    let criada;
    try {
      criada = await prisma.$transaction(async (tx) => {
        const bairro = await tx.bairro.findUnique({ where: { id: dados.bairroId } });
        if (!bairro) {
          throw erros.validacao([{ campo: 'bairroId', mensagem: 'Bairro não encontrado.' }]);
        }

        const emAberto = await tx.denuncia.findMany({
          where: { autorId: autor.id, status: { in: [...STATUS_EM_ABERTO] } },
          select: { id: true, status: true },
        });
        if (!podeCriarDenuncia(emAberto.map((d) => d.status))) {
          throw erros.denunciaEmAberto(emAberto[0]?.id);
        }

        const ano = agora.getFullYear();
        const protocolo = formatarProtocolo(ano, await proximaSequencia(tx, ano));

        return tx.denuncia.create({
          data: {
            protocolo,
            autorId: autor.id,
            bairroId: bairro.id,
            tipo: dados.tipo,
            logradouro: dados.logradouro,
            cep: dados.cep,
            pontoReferencia: dados.pontoReferencia,
            descricao: dados.descricao,
            latitude: dados.latitude,
            longitude: dados.longitude,
            faixaPessoas: dados.faixaPessoas,
            necessidadeEspecial: dados.necessidadeEspecial,
            detalheNecessidade: dados.necessidadeEspecial ? dados.detalheNecessidade : undefined,
            historico: {
              create: {
                statusAnterior: null,
                statusNovo: 'RECEBIDA',
                alteradoPorId: autor.id,
                papelAutor: 'CIDADAO',
              },
            },
          },
          include: { bairro: true },
        });
      });
    } catch (erro) {
      // Duas requisições simultâneas do mesmo autor: o índice único parcial do banco barra a segunda.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw erros.denunciaEmAberto(await idDaDenunciaEmAberto(autor.id));
      }
      throw erro;
    }

    // Depois do commit: uma falha ao emitir o evento não pode desfazer nem falhar o registro.
    try {
      await publicador.denunciaCriada({
        id: criada.id,
        protocolo: criada.protocolo,
        tipo: criada.tipo,
        status: criada.status,
        prioritaria: criada.necessidadeEspecial,
        bairro: { id: criada.bairro.id, nome: criada.bairro.nome },
        logradouro: criada.logradouro,
        latitude: num(criada.latitude),
        longitude: num(criada.longitude),
        autor: { id: autor.id, nome: autor.nome, telefone: autor.telefone },
        criadoEm: criada.criadoEm,
      });
    } catch (erro) {
      console.error('Falha ao publicar o evento denuncia:criada', erro);
    }

    return {
      id: criada.id,
      protocolo: criada.protocolo,
      status: criada.status,
      tipo: criada.tipo,
      bairro: { id: criada.bairro.id, nome: criada.bairro.nome },
      criadoEm: criada.criadoEm.toISOString(),
    };
  }

  /** RF-013: as denúncias do próprio usuário, da mais recente para a mais antiga. */
  async function minhas(autorId: string, consulta: ConsultaMinhasDenuncias) {
    const where: Prisma.DenunciaWhereInput = {
      autorId,
      ...(consulta.status
        ? { status: consulta.status as Prisma.EnumStatusDenunciaFilter['equals'] }
        : {}),
    };

    const [itens, total] = await Promise.all([
      prisma.denuncia.findMany({
        where,
        orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
        skip: (consulta.page - 1) * consulta.limite,
        take: consulta.limite,
        include: { bairro: { select: { nome: true, folha: true } } },
      }),
      prisma.denuncia.count({ where }),
    ]);

    return {
      itens: itens.map((d) => ({
        id: d.id,
        protocolo: d.protocolo,
        tipo: d.tipo,
        status: d.status,
        bairro: d.bairro.nome,
        folha: d.bairro.folha,
        criadoEm: d.criadoEm.toISOString(),
        previsaoReparo: d.previsaoReparo?.toISOString() ?? null,
      })),
      pagina: consulta.page,
      total,
    };
  }

  /**
   * RF-014, RF-036: detalhe com histórico. Só o autor vê. Denúncia de outro usuário e denúncia
   * inexistente respondem igual (404), para não revelar que ela existe (RN-014).
   */
  async function detalhe(usuario: UsuarioAutenticado, id: string) {
    const d = await prisma.denuncia.findUnique({
      where: { id },
      include: {
        bairro: true,
        historico: { orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!d || !podeVerDenuncia(usuario, d)) throw erros.naoEncontrado('Denúncia não encontrada.');

    return {
      id: d.id,
      protocolo: d.protocolo,
      tipo: d.tipo,
      status: d.status,
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
        // Para o autor: as ações dele aparecem como "Você" e as da operadora como "Equatorial Pará".
        por: h.papelAutor === 'CIDADAO' ? 'Você' : 'Equatorial Pará',
        justificativa: h.justificativa,
        criadoEm: h.criadoEm.toISOString(),
      })),
      criadoEm: d.criadoEm.toISOString(),
      atualizadoEm: d.atualizadoEm.toISOString(),
    };
  }

  return { criar, minhas, detalhe };
}

export type ServicoDenuncias = ReturnType<typeof criarServicoDenuncias>;

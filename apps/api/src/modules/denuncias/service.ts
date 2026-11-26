import { randomUUID } from 'node:crypto';

import { Prisma, type PrismaClient } from '@prisma/client';

import {
  camposSensiveisAoMudarStatus,
  ehPrioritaria,
  formatarProtocolo,
  podeCriarDenuncia,
  podeVerDenuncia,
  STATUS_EM_ABERTO,
  validarFotos,
  validarNecessidade,
  validarTransicao,
  type FotoRecebida,
  type UsuarioAutenticado,
} from '../../domain';
import { publicadorNulo, type Publicador } from '../../realtime/publicador';
import { erros } from '../../shared/errors';
import { criarArmazenamento, type Armazenamento } from '../fotos/armazenamento';
import { JpegInvalidoError, removerMetadados } from '../fotos/metadados';
import type { ConsultaMinhasDenuncias, DadosDeDenuncia } from './schemas';
import { paraSnapshot } from './snapshot';

export type DenunciasDeps = {
  prisma: PrismaClient;
  publicador?: Publicador;
  /** Relógio injetável (os testes fixam a data para conferir o ano do protocolo). */
  relogio?: () => Date;
  /** Onde as fotos ficam gravadas (fora de qualquer rota pública, S-49). */
  armazenamento?: Armazenamento;
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

/** Por que o cancelamento foi recusado: a operadora já começou (ou a denúncia já terminou). */
const MENSAGEM_NAO_CANCELA =
  'Esta denúncia não pode mais ser cancelada: a operadora já começou o atendimento ou ela já foi encerrada.';

export function criarServicoDenuncias({
  prisma,
  publicador = publicadorNulo,
  relogio = () => new Date(),
  armazenamento = criarArmazenamento('uploads'),
}: DenunciasDeps) {
  /** URL da foto na API (rota autenticada, RNF-015). */
  const urlDaFoto = (denunciaId: string, fotoId: string) =>
    `/api/v1/denuncias/${denunciaId}/fotos/${fotoId}`;

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
  async function criar(
    autor: AutorDaDenuncia,
    dados: DadosDeDenuncia,
    fotosRecebidas: readonly FotoRecebida[] = [],
  ) {
    const agora = relogio();
    const fotos = prepararFotos(fotosRecebidas);
    const denunciaId = randomUUID();
    const gravadas = fotos.map((bytes) => {
      const fotoId = randomUUID();
      return { fotoId, bytes, arquivo: armazenamento.nomeDoArquivo(denunciaId, fotoId) };
    });
    // O schema já recusou o "Sim" sem consentimento; aqui só se decide o que gravar (RN-015).
    const necessidade = validarNecessidade({
      necessidadeEspecial: dados.necessidadeEspecial,
      consentimento: dados.consentimentoNecessidade,
    });
    if (!necessidade.ok) {
      throw erros.validacao([
        { campo: 'consentimentoNecessidade', mensagem: necessidade.mensagem },
      ]);
    }

    // Os arquivos vão para o disco só depois de validados; se o registro falhar, são apagados.
    for (const foto of gravadas) await armazenamento.gravar(foto.arquivo, foto.bytes);

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
            id: denunciaId,
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
            necessidadeEspecial: necessidade.necessidadeEspecial,
            consentimentoNecessidadeEm: necessidade.registrarConsentimento ? agora : null,
            fotos: {
              create: gravadas.map((f) => ({
                id: f.fotoId,
                arquivo: f.arquivo,
                mimeType: 'image/jpeg',
                tamanhoBytes: f.bytes.length,
              })),
            },
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
      await armazenamento.apagar(gravadas.map((f) => f.arquivo)).catch(() => undefined);
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
        prioritaria: ehPrioritaria(criada.necessidadeEspecial),
        bairro: { id: criada.bairro.id, nome: criada.bairro.nome, folha: criada.bairro.folha },
        logradouro: criada.logradouro,
        descricao: criada.descricao,
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

  /**
   * RN-013, S-49: valida as fotos (quantidade, tamanho e tipo pelo **conteúdo**) e tira os
   * metadados de cada uma (EXIF/XMP, onde fica o GPS). Devolve os bytes já limpos.
   */
  function prepararFotos(recebidas: readonly FotoRecebida[]): Uint8Array[] {
    const validacao = validarFotos(recebidas);
    if (!validacao.ok) {
      if (validacao.codigo === 'LIMITE_FOTOS') throw erros.limiteFotos(validacao.mensagem);
      throw erros.arquivoInvalido(
        validacao.codigo === 'FOTO_GRANDE' ? 413 : 415,
        validacao.mensagem,
      );
    }
    return recebidas.map((foto, indice) => {
      try {
        return removerMetadados(foto.bytes);
      } catch (erro) {
        if (erro instanceof JpegInvalidoError) {
          throw erros.arquivoInvalido(415, `A foto ${indice + 1} não é um JPEG válido.`);
        }
        throw erro;
      }
    });
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
        fotos: { orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }] },
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
      // Enquanto aberta: a resposta do autor (Sim/Não ou nula). Encerrada: sempre nula (RN-026).
      necessidadeEspecial: d.necessidadeEspecial,
      previsaoReparo: d.previsaoReparo?.toISOString() ?? null,
      justificativa: d.justificativa,
      fotos: d.fotos.map((f) => ({ id: f.id, url: urlDaFoto(d.id, f.id) })),
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

  /**
   * RF-015, RN-005: o autor cancela a própria denúncia enquanto ela está `RECEBIDA`. A gravação é
   * condicional ao status lido (como no painel): se a operadora começou o atendimento no meio
   * tempo, só uma das duas vence e a outra recebe 422. Status e histórico na mesma transação
   * (RN-011); o evento sai depois do commit e **não** gera push (RN-019).
   * Denúncia de outro usuário responde 404, igual a uma que não existe (RN-014).
   */
  async function cancelar(usuario: UsuarioAutenticado, id: string) {
    const agora = relogio();

    const resultado = await prisma.$transaction(async (tx) => {
      const atual = await tx.denuncia.findUnique({ where: { id } });
      if (!atual || !podeVerDenuncia(usuario, atual)) {
        throw erros.naoEncontrado('Denúncia não encontrada.');
      }

      const validacao = validarTransicao({
        de: atual.status,
        para: 'CANCELADA',
        ator: { papel: usuario.papel, ehAutor: atual.autorId === usuario.id },
      });
      if (!validacao.ok) {
        if (validacao.codigo === 'SEM_PERMISSAO') throw erros.semPermissao(validacao.mensagem);
        throw erros.transicaoInvalida(MENSAGEM_NAO_CANCELA);
      }

      const alterada = await tx.denuncia.updateMany({
        where: { id, status: atual.status }, // só cancela se ainda estiver como o autor viu
        data: {
          status: 'CANCELADA',
          finalizadaEm: agora,
          ...camposSensiveisAoMudarStatus('CANCELADA'),
        },
      });
      if (alterada.count === 0) throw erros.transicaoInvalida(MENSAGEM_NAO_CANCELA);

      const historico = await tx.historicoStatus.create({
        data: {
          denunciaId: id,
          statusAnterior: atual.status,
          statusNovo: 'CANCELADA',
          alteradoPorId: usuario.id,
          papelAutor: 'CIDADAO',
        },
      });

      const completa = await tx.denuncia.findUniqueOrThrow({
        where: { id },
        include: { bairro: true },
      });
      return { completa, statusAnterior: atual.status, alteradoEm: historico.criadoEm };
    });

    // Depois do commit: uma falha ao emitir o evento não desfaz nem falha o cancelamento.
    try {
      await publicador.statusAtualizado({
        denuncia: paraSnapshot(resultado.completa),
        statusAnterior: resultado.statusAnterior,
        alteradoEm: resultado.alteradoEm,
        por: 'Você', // o evento privado vai ao próprio autor; o painel mostra o nome pelo detalhe
      });
    } catch (erro) {
      console.error('Falha ao publicar o evento denuncia:status-atualizado', erro);
    }

    return detalhe(usuario, id);
  }

  /**
   * RNF-015, RN-014: o arquivo de uma foto, **só para o autor da denúncia e para o operador**. Foto
   * de outra pessoa, foto que não existe e denúncia anonimizada respondem igual (404), para não
   * revelar que existem.
   */
  async function foto(usuario: UsuarioAutenticado, denunciaId: string, fotoId: string) {
    const registro = await prisma.denunciaFoto.findFirst({
      where: { id: fotoId, denunciaId },
      include: { denuncia: { select: { autorId: true } } },
    });
    if (!registro || !podeVerDenuncia(usuario, registro.denuncia)) {
      throw erros.naoEncontrado('Foto não encontrada.');
    }
    let bytes: Buffer;
    try {
      bytes = await armazenamento.ler(registro.arquivo);
    } catch {
      throw erros.naoEncontrado('Foto não encontrada.');
    }
    return { bytes, mimeType: registro.mimeType };
  }

  return { criar, minhas, detalhe, cancelar, foto };
}

export type ServicoDenuncias = ReturnType<typeof criarServicoDenuncias>;

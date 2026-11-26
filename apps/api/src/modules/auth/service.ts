import { Prisma, type PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import type { Papel } from '../../domain';
import { publicadorNulo, type Publicador } from '../../realtime/publicador';
import { erros } from '../../shared/errors';
import { criarArmazenamento, type Armazenamento } from '../fotos/armazenamento';
import type { DadosDeLogin, DadosDePerfil, DadosDeRegistro } from './schemas';
import { gerarToken } from './token';

export type AuthDeps = {
  prisma: PrismaClient;
  segredoJwt: string;
  /** Custo do bcrypt (RNF-011: >= 10 em produção). Os testes usam um valor menor, para ficar rápido. */
  bcryptCost: number;
  /** Onde ficam as fotos (apagadas na exclusão da conta, S-50). */
  armazenamento?: Armazenamento;
  /** Para derrubar as conexões em tempo real da conta excluída. */
  publicador?: Publicador;
};

export type UsuarioPublico = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  papel: Papel;
};

export type RespostaDeAutenticacao = {
  token: string;
  usuario: UsuarioPublico;
};

const SELECIONAR_USUARIO = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  papel: true,
} as const;

export function criarServicoAuth({
  prisma,
  segredoJwt,
  bcryptCost,
  armazenamento = criarArmazenamento('uploads'),
  publicador = publicadorNulo,
}: AuthDeps) {
  // Hash "de mentira" para que o login de um e-mail inexistente leve o mesmo tempo que o de um
  // existente com senha errada (não revela quais e-mails têm conta).
  const hashFalso = bcrypt.hashSync('senha-falsa-para-igualar-o-tempo', bcryptCost);

  async function registrar(dados: DadosDeRegistro): Promise<RespostaDeAutenticacao> {
    const senhaHash = await bcrypt.hash(dados.senha, bcryptCost);
    try {
      const usuario = await prisma.usuario.create({
        data: {
          nome: dados.nome,
          email: dados.email,
          senhaHash,
          telefone: dados.telefone ?? null,
          papel: 'CIDADAO', // RN-001: o cadastro público só cria cidadão
          consentimentoEm: new Date(), // RN-020
          versaoTermos: dados.versaoTermos,
        },
        select: SELECIONAR_USUARIO,
      });
      return { token: gerarToken(usuario.id, usuario.papel, segredoJwt), usuario };
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw erros.emailJaCadastrado();
      }
      throw erro;
    }
  }

  async function entrar(dados: DadosDeLogin): Promise<RespostaDeAutenticacao> {
    const encontrado = await prisma.usuario.findUnique({
      where: { email: dados.email },
      select: { ...SELECIONAR_USUARIO, senhaHash: true },
    });

    const senhaConfere = await bcrypt.compare(dados.senha, encontrado?.senhaHash ?? hashFalso);
    if (!encontrado || !senhaConfere) throw erros.credenciaisInvalidas();

    const { senhaHash: _senhaHash, ...usuario } = encontrado;
    return { token: gerarToken(usuario.id, usuario.papel, segredoJwt), usuario };
  }

  /** RF-005: edita nome e/ou telefone. O e-mail é somente leitura (S-22). */
  async function atualizarPerfil(usuarioId: string, dados: DadosDePerfil): Promise<UsuarioPublico> {
    return prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
        ...(dados.telefone !== undefined ? { telefone: dados.telefone } : {}),
      },
      select: SELECIONAR_USUARIO,
    });
  }

  /**
   * RF-006, RN-024, decisões S-50 e S-59: exclui a conta **depois de conferir a senha atual**
   * (errada: 403 `SENHA_INCORRETA`, e nada é apagado). Numa transação:
   * - apaga a resposta de necessidade especial e o consentimento das denúncias da conta;
   * - apaga os registros das fotos (os arquivos saem logo depois do commit);
   * - apaga o usuário: o banco desvincula as denúncias e o histórico (`SET NULL`) e apaga os tokens
   *   de push (`CASCADE`). **Uma denúncia em aberto continua aberta**, só que sem autor (o painel
   *   mostra "Conta excluída").
   * Depois do commit, apaga os arquivos (uma falha de disco vira log, sem dado pessoal) e derruba
   * as conexões em tempo real da conta.
   */
  async function excluirConta(usuarioId: string, senha: string): Promise<void> {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { senhaHash: true },
    });
    const confere = await bcrypt.compare(senha, usuario?.senhaHash ?? hashFalso);
    if (!usuario || !confere) throw erros.senhaIncorreta();

    const arquivos = await prisma.$transaction(async (tx) => {
      const fotos = await tx.denunciaFoto.findMany({
        where: { denuncia: { autorId: usuarioId } },
        select: { arquivo: true },
      });
      await tx.denuncia.updateMany({
        where: { autorId: usuarioId },
        data: { necessidadeEspecial: null, consentimentoNecessidadeEm: null },
      });
      await tx.denunciaFoto.deleteMany({ where: { denuncia: { autorId: usuarioId } } });
      await tx.usuario.delete({ where: { id: usuarioId } });
      return fotos.map((f) => f.arquivo);
    });

    try {
      await armazenamento.apagar(arquivos);
    } catch {
      // Sem dados pessoais no log: só quantos arquivos ficaram para trás.
      console.error(`Falha ao apagar ${arquivos.length} foto(s) de uma conta excluída.`);
    }
    try {
      await publicador.desconectarUsuario?.(usuarioId);
    } catch {
      console.error('Falha ao desconectar as conexões de uma conta excluída.');
    }
  }

  return { registrar, entrar, atualizarPerfil, excluirConta };
}

export type ServicoAuth = ReturnType<typeof criarServicoAuth>;

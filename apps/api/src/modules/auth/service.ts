import { Prisma, type PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import type { Papel } from '../../domain';
import { erros } from '../../shared/errors';
import type { DadosDeLogin, DadosDeRegistro } from './schemas';
import { gerarToken } from './token';

export type AuthDeps = {
  prisma: PrismaClient;
  segredoJwt: string;
  /** Custo do bcrypt (RNF-011: >= 10 em produção). Os testes usam um valor menor, para ficar rápido. */
  bcryptCost: number;
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

export function criarServicoAuth({ prisma, segredoJwt, bcryptCost }: AuthDeps) {
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

  return { registrar, entrar };
}

export type ServicoAuth = ReturnType<typeof criarServicoAuth>;

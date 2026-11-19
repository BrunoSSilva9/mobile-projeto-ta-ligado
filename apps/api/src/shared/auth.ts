import type { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'express';

import { temPapel, type Papel, type UsuarioAutenticado } from '../domain';
import { verificarToken } from '../modules/auth/token';
import { erros } from './errors';

export type UsuarioDaRequisicao = UsuarioAutenticado & {
  nome: string;
  email: string;
  telefone: string | null;
};

declare global {
  // Acrescenta o usuário autenticado ao `Request` do Express.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioDaRequisicao;
    }
  }
}

/**
 * Middlewares de autenticação e autorização (RNF-012, ADR-0004).
 * `autenticar` valida o JWT **e confirma o usuário no banco** (conta excluída ou papel alterado
 * não valem mais, mesmo com o token ainda dentro da validade).
 */
export function criarAutenticacao(prisma: PrismaClient, segredoJwt: string) {
  const autenticar: RequestHandler = async (req, _res, next) => {
    const cabecalho = req.headers.authorization;
    if (!cabecalho?.startsWith('Bearer ')) throw erros.naoAutenticado();

    const conteudo = verificarToken(cabecalho.slice('Bearer '.length).trim(), segredoJwt);
    if (!conteudo) throw erros.naoAutenticado('Sessão inválida ou expirada. Entre novamente.');

    const usuario = await prisma.usuario.findUnique({
      where: { id: conteudo.sub },
      select: { id: true, papel: true, nome: true, email: true, telefone: true },
    });
    if (!usuario) throw erros.naoAutenticado('Sessão inválida ou expirada. Entre novamente.');

    req.usuario = usuario;
    next();
  };

  /** Exige que o usuário autenticado tenha um dos papéis informados (RBAC, RN-001). */
  const exigirPapel =
    (...papeis: Papel[]): RequestHandler =>
    (req, _res, next) => {
      if (!req.usuario) throw erros.naoAutenticado();
      if (!temPapel(req.usuario, ...papeis)) throw erros.semPermissao();
      next();
    };

  return { autenticar, exigirPapel };
}

export type Autenticacao = ReturnType<typeof criarAutenticacao>;

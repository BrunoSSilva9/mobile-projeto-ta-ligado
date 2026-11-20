import type { Server as HttpServer } from 'node:http';

import type { PrismaClient } from '@prisma/client';
import { Server, type Socket } from 'socket.io';

import type { UsuarioAutenticado } from '../domain';
import { verificarToken } from '../modules/auth/token';
import { SALAS } from './eventos';

export type SocketDeps = {
  corsOrigins: string[];
  prisma: PrismaClient;
  segredoJwt: string;
};

/** Erro de handshake: o cliente o recebe em `connect_error`, com `err.data.codigo`. */
function erroDeHandshake(mensagem: string): Error & { data: { codigo: string; mensagem: string } } {
  const erro = new Error('NAO_AUTENTICADO') as Error & {
    data: { codigo: string; mensagem: string };
  };
  erro.data = { codigo: 'NAO_AUTENTICADO', mensagem };
  return erro;
}

/** As salas em que um usuário entra. O servidor decide; o cliente nunca escolhe (ADR-0002). */
export function salasDoUsuario(usuario: UsuarioAutenticado): string[] {
  return usuario.papel === 'OPERADOR'
    ? [SALAS.operadores]
    : [SALAS.cidadaos, SALAS.usuario(usuario.id)];
}

/**
 * Servidor Socket.IO (ADR-0002, RF-024, RF-027).
 *
 * - **Autenticação no handshake:** o cliente envia `auth: { token }` (o mesmo JWT da API REST). O
 *   usuário é confirmado no banco, como nas rotas. Sem token válido a conexão é recusada.
 * - **Salas:** operador entra em `papel:OPERADOR`; cidadão entra em `cidadaos` e em `usuario:{id}`.
 * - **Só o servidor emite:** o servidor não escuta nenhum evento do cliente. As ações de negócio
 *   acontecem pela API REST.
 *
 * Limitação do MVP: a validade do token é checada só ao conectar; uma conexão aberta não é
 * derrubada quando o token expira (ao reconectar, o cliente precisa de um token válido).
 */
export function createSocketServer(httpServer: HttpServer, deps: SocketDeps): Server {
  const { corsOrigins, prisma, segredoJwt } = deps;

  const io = new Server(httpServer, {
    cors: { origin: corsOrigins.length > 0 ? corsOrigins : false },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || token === '') {
        return next(erroDeHandshake('Faça login para conectar.'));
      }

      const conteudo = verificarToken(token, segredoJwt);
      if (!conteudo) return next(erroDeHandshake('Sessão inválida ou expirada. Entre novamente.'));

      const usuario = await prisma.usuario.findUnique({
        where: { id: conteudo.sub },
        select: { id: true, papel: true },
      });
      if (!usuario) return next(erroDeHandshake('Sessão inválida ou expirada. Entre novamente.'));

      socket.data.usuario = usuario satisfies UsuarioAutenticado;
      next();
    } catch (erro) {
      next(erro instanceof Error ? erro : new Error('Erro ao autenticar a conexão.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const usuario = socket.data.usuario as UsuarioAutenticado;
    void socket.join(salasDoUsuario(usuario));
  });

  return io;
}

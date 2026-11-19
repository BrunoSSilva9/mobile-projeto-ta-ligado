import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

/**
 * Servidor Socket.IO (ADR-0002).
 * Fase 0: apenas a infraestrutura. Autenticação JWT no handshake, salas por papel/usuário
 * (`papel:OPERADOR`, `cidadaos`, `usuario:{id}`) e os eventos de docs/10-api.md entram na Fase 1 (B-014).
 */
export function createSocketServer(httpServer: HttpServer, corsOrigins: string[]): Server {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins.length > 0 ? corsOrigins : false },
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => undefined);
  });

  return io;
}

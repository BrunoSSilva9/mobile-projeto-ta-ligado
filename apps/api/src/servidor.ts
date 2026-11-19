import { createServer } from 'node:http';

import type { PrismaClient } from '@prisma/client';

import { createApp, type AppDeps } from './app';
import { PublicadorSocketIO } from './realtime/publicador-socket';
import { createSocketServer } from './realtime/socket';

export type ServidorDeps = {
  prisma: PrismaClient;
  segredoJwt: string;
  corsOrigins?: string[];
} & Pick<AppDeps, 'checkDb' | 'limites' | 'bcryptCost' | 'relogio'>;

/**
 * Monta o servidor completo: app Express (REST), Socket.IO e o publicador que liga os dois.
 * É usado pelo `server.ts` e pelos testes de tempo real, para ambos rodarem a mesma ligação.
 *
 * O publicador é criado antes do Socket.IO (o app precisa dele) e recebe o `io` logo depois.
 */
export function criarServidor({ prisma, segredoJwt, corsOrigins = [], ...resto }: ServidorDeps) {
  const publicador = new PublicadorSocketIO(prisma, resto.relogio);
  const app = createApp({ ...resto, corsOrigins, prisma, segredoJwt, publicador });
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer, { corsOrigins, prisma, segredoJwt });
  publicador.conectar(io);

  return { app, httpServer, io, publicador };
}

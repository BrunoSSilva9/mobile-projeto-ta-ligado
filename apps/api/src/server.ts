import { createServer } from 'node:http';

import { createApp } from './app';
import { loadEnvFromFile } from './config/env';
import { checkDatabase, disconnectPrisma, getPrisma } from './db/prisma';
import { createSocketServer } from './realtime/socket';

const env = loadEnvFromFile();

const app = createApp({
  corsOrigins: env.CORS_ORIGINS,
  checkDb: checkDatabase,
  prisma: getPrisma(),
  segredoJwt: env.JWT_SECRET,
});
const httpServer = createServer(app);
const io = createSocketServer(httpServer, env.CORS_ORIGINS);

httpServer.listen(env.PORT, () => {
  console.log(`API do Tá Ligado? em http://localhost:${env.PORT} (health: /health)`);
});

async function encerrar(sinal: string) {
  console.log(`${sinal} recebido, encerrando...`);
  io.close();
  httpServer.close();
  await disconnectPrisma();
  process.exit(0);
}

process.on('SIGINT', () => void encerrar('SIGINT'));
process.on('SIGTERM', () => void encerrar('SIGTERM'));

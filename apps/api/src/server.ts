import { loadEnvFromFile } from './config/env';
import { checkDatabase, disconnectPrisma, getPrisma } from './db/prisma';
import { criarServidor } from './servidor';

const env = loadEnvFromFile();

const { httpServer, io } = criarServidor({
  prisma: getPrisma(),
  segredoJwt: env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS,
  uploadsDir: env.UPLOADS_DIR,
  checkDb: checkDatabase,
});

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

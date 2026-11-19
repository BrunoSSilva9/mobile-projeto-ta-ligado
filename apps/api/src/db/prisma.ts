import { PrismaClient } from '@prisma/client';

let client: PrismaClient | undefined;

/** Instância única do Prisma, criada sob demanda. */
export function getPrisma(): PrismaClient {
  client ??= new PrismaClient();
  return client;
}

export async function checkDatabase(): Promise<boolean> {
  await getPrisma().$queryRaw`SELECT 1`;
  return true;
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}

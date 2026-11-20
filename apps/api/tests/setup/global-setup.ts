import { execSync } from 'node:child_process';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';

/**
 * Roda uma vez antes de todos os testes: garante que o banco de teste existe e aplica as
 * migrations. Recusa qualquer banco cujo nome não termine em `_test` (os testes apagam tabelas).
 */
export default async function setup() {
  const urlTexto = process.env.DATABASE_URL;
  if (!urlTexto) throw new Error('DATABASE_URL não definida para os testes.');

  const url = new URL(urlTexto);
  const nomeDoBanco = url.pathname.replace(/^\//, '');
  if (!/^[a-z0-9_]+_test$/.test(nomeDoBanco)) {
    throw new Error(
      `Recusado: o banco "${nomeDoBanco}" não termina em "_test". ` +
        'Os testes apagam tabelas e só podem rodar em um banco de teste.',
    );
  }

  await criarBancoSeNaoExistir(url, nomeDoBanco);

  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: urlTexto },
    stdio: 'pipe',
  });
}

async function criarBancoSeNaoExistir(url: URL, nomeDoBanco: string) {
  // Conecta no banco administrativo "postgres" para poder criar o banco de teste.
  const admin = new URL(url.toString());
  admin.pathname = '/postgres';

  const cliente = new PrismaClient({ datasources: { db: { url: admin.toString() } } });
  try {
    const existe = await cliente.$queryRawUnsafe<{ ok: number }[]>(
      'SELECT 1 AS ok FROM pg_database WHERE datname = $1',
      nomeDoBanco,
    );
    if (existe.length === 0) {
      // O nome já foi validado (letras minúsculas, números e "_"), então é seguro interpolar.
      await cliente.$executeRawUnsafe(`CREATE DATABASE "${nomeDoBanco}"`);
    }
  } finally {
    await cliente.$disconnect();
  }
}

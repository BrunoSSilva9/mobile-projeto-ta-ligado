import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config({ quiet: true });

/**
 * Os testes de integração usam um banco SEPARADO (S-36): o mesmo da `DATABASE_URL`, mas com o
 * sufixo `_test`. Eles apagam as tabelas a cada teste, então nunca podem apontar para o banco de
 * desenvolvimento (nem para um banco hospedado). Se a URL já termina em `_test` (como na CI), é mantida.
 */
function urlDoBancoDeTeste(): string {
  const base = process.env.DATABASE_URL ?? 'postgresql://taligado:taligado@localhost:5432/taligado';
  const url = new URL(base);
  const nome = url.pathname.replace(/^\//, '');
  if (!nome.endsWith('_test')) url.pathname = `/${nome}_test`;
  return url.toString();
}

const DATABASE_URL = urlDoBancoDeTeste();
process.env.DATABASE_URL = DATABASE_URL;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/setup/global-setup.ts'],
    // Os arquivos de integração compartilham o mesmo banco: rodam um de cada vez.
    fileParallelism: false,
    env: {
      DATABASE_URL,
      JWT_SECRET: 'segredo-de-teste-com-mais-de-16-caracteres',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
      reporter: ['text', 'lcov'],
      // RNF-020: as regras de negócio em `src/domain` precisam de >= 90% de cobertura.
      thresholds: {
        'src/domain/**': { lines: 90, statements: 90, functions: 90, branches: 90 },
      },
    },
  },
});

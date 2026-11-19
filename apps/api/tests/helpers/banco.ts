import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { createApp } from '../../src/app';
import type { LimitesDeTaxa } from '../../src/shared/rate-limit';

export const SEGREDO_JWT = process.env.JWT_SECRET!;

/** Cliente Prisma dos testes (aponta para o banco `_test`, ver vitest.config.ts). */
export const prisma = new PrismaClient();

/** Limites altos por padrão, para os testes não esbarrarem no rate limit sem querer. */
const LIMITES_DE_TESTE: Partial<LimitesDeTaxa> = { geral: 10_000, login: 10_000 };

/** App completo, ligado ao banco de teste. `bcryptCost` baixo deixa os testes rápidos. */
export function criarAppDeTeste(limites: Partial<LimitesDeTaxa> = {}) {
  return createApp({
    prisma,
    segredoJwt: SEGREDO_JWT,
    bcryptCost: 4,
    limites: { ...LIMITES_DE_TESTE, ...limites },
    checkDb: async () => true,
  });
}

/** Apaga os dados de todas as tabelas (menos o controle de migrations). */
export async function limparBanco(): Promise<void> {
  const tabelas = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tabelas.length === 0) return;
  const lista = tabelas.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
}

export async function criarOperador(dados: { email?: string; senha?: string; nome?: string } = {}) {
  const email = dados.email ?? 'operador@teste.com';
  const senha = dados.senha ?? 'senha-do-operador';
  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome ?? 'Operador de Teste',
      email,
      senhaHash: await bcrypt.hash(senha, 4),
      papel: 'OPERADOR',
    },
  });
  return { usuario, email, senha };
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import request from 'supertest';

import { createApp } from '../../src/app';
import type { StatusDenuncia } from '../../src/domain';
import type { Publicador } from '../../src/realtime/publicador';
import type { LimitesDeTaxa } from '../../src/shared/rate-limit';

export const SEGREDO_JWT = process.env.JWT_SECRET!;

/** Cliente Prisma dos testes (aponta para o banco `_test`, ver vitest.config.ts). */
export const prisma = new PrismaClient();

/** Limites altos por padrão, para os testes não esbarrarem no rate limit sem querer. */
const LIMITES_DE_TESTE: Partial<LimitesDeTaxa> = { geral: 10_000, login: 10_000 };

/**
 * App completo, ligado ao banco de teste. `bcryptCost` baixo deixa os testes rápidos.
 * `extras` permite injetar um `publicador` (espião) e um `relogio` fixo.
 */
export function criarAppDeTeste(
  limites: Partial<LimitesDeTaxa> = {},
  extras: { publicador?: Publicador; relogio?: () => Date } = {},
) {
  return createApp({
    prisma,
    segredoJwt: SEGREDO_JWT,
    bcryptCost: 4,
    limites: { ...LIMITES_DE_TESTE, ...limites },
    checkDb: async () => true,
    ...extras,
  });
}

let contadorDeCidadaos = 0;

/** Cadastra um cidadão pela API e devolve o token e o id. */
export async function registrarCidadao(
  app: Express,
  dados: { nome?: string; email?: string; telefone?: string } = {},
) {
  contadorDeCidadaos += 1;
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      nome: dados.nome ?? `Cidadão ${contadorDeCidadaos}`,
      email: dados.email ?? `cidadao${contadorDeCidadaos}@exemplo.com`,
      senha: 'senha-do-cidadao',
      telefone: dados.telefone,
      aceiteTermos: true,
      versaoTermos: '2026-11',
    });
  if (res.status !== 201)
    throw new Error(`Falha ao cadastrar cidadão: ${JSON.stringify(res.body)}`);
  return { token: res.body.token as string, id: res.body.usuario.id as string };
}

export async function criarBairro(
  dados: { nome?: string; folha?: string | null; latitude?: number; longitude?: number } = {},
) {
  return prisma.bairro.create({
    data: {
      nome: dados.nome ?? 'Nova Marabá',
      folha: dados.folha === undefined ? 'Folha 28' : dados.folha,
      latitude: dados.latitude ?? -5.34,
      longitude: dados.longitude ?? -49.082,
    },
  });
}

/** Operador autenticado: cria a conta por seed (como no projeto) e faz o login pela API. */
export async function entrarComoOperador(app: Express) {
  const operador = await criarOperador();
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: operador.email, senha: operador.senha });
  return { token: res.body.token as string, id: operador.usuario.id };
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

let sequenciaDeDenuncias = 0;

/**
 * Cria uma denúncia direto no banco, sem passar pela API (nem pelo limite de uma em aberto):
 * útil para montar listas com status, datas e prioridades específicos. Sem autor por padrão.
 */
export async function criarDenunciaNoBanco(dados: {
  bairroId: number;
  autorId?: string | null;
  tipo?: 'SEM_ENERGIA' | 'OSCILACAO';
  status?: StatusDenuncia;
  necessidadeEspecial?: boolean;
  criadoEm?: Date;
  logradouro?: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  sequenciaDeDenuncias += 1;
  const status = dados.status ?? 'RECEBIDA';
  const prioritaria = dados.necessidadeEspecial ?? false;
  return prisma.denuncia.create({
    data: {
      protocolo: `TL-2020-${String(sequenciaDeDenuncias).padStart(6, '0')}`,
      autorId: dados.autorId ?? null,
      bairroId: dados.bairroId,
      tipo: dados.tipo ?? 'SEM_ENERGIA',
      status,
      logradouro: dados.logradouro ?? `Rua ${sequenciaDeDenuncias}`,
      latitude: dados.latitude ?? undefined,
      longitude: dados.longitude ?? undefined,
      necessidadeEspecial: prioritaria,
      detalheNecessidade: prioritaria ? 'Detalhe da situação prioritária' : undefined,
      justificativa: status === 'IMPROCEDENTE' ? 'Sem interrupção confirmada.' : undefined,
      criadoEm: dados.criadoEm,
    },
  });
}

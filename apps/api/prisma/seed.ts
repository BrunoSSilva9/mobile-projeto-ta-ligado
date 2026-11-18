import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import { bairros } from './seed-data/bairros';

dotenv.config({ quiet: true });

const prisma = new PrismaClient();

async function seedBairros() {
  let criados = 0;
  let atualizados = 0;
  for (const b of bairros) {
    // `folha` é opcional: a chave única composta não aceita NULL no `upsert`, por isso find + create/update.
    const existente = await prisma.bairro.findFirst({ where: { nome: b.nome, folha: b.folha } });
    if (existente) {
      await prisma.bairro.update({
        where: { id: existente.id },
        data: { latitude: b.latitude, longitude: b.longitude },
      });
      atualizados++;
    } else {
      await prisma.bairro.create({ data: b });
      criados++;
    }
  }
  console.log(`Bairros: ${criados} criados, ${atualizados} atualizados (dados aproximados de demonstração).`);
}

async function seedOperador() {
  const email = (process.env.SEED_OPERADOR_EMAIL ?? 'operador@taligado.local').toLowerCase();
  const senha = process.env.SEED_OPERADOR_SENHA;
  const nome = process.env.SEED_OPERADOR_NOME ?? 'Operador de Teste';
  if (!senha || senha.length < 8) {
    throw new Error('Defina SEED_OPERADOR_SENHA (mínimo 8 caracteres) no .env da API.');
  }
  const senhaHash = await bcrypt.hash(senha, 10);
  await prisma.usuario.upsert({
    where: { email },
    update: { nome, senhaHash, papel: 'OPERADOR' },
    create: { nome, email, senhaHash, papel: 'OPERADOR' },
  });
  console.log(`Operador de teste: ${email}`);
}

async function main() {
  await seedBairros();
  await seedOperador();
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

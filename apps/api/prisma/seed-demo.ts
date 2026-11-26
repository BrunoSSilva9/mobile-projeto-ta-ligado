/**
 * Dados de DEMONSTRAÇÃO (opcional): contas de cidadão de exemplo e algumas denúncias em estados
 * variados, para a Home, as Ocorrências e o painel não ficarem vazios na apresentação.
 *
 * - Nunca roda em produção.
 * - Só mexe nas contas `demo*@taligado.local`: cada execução apaga as denúncias delas e recria.
 * - Pressupõe `npm run db:seed` (bairros e operador) já executado.
 *
 * Uso: `npm run db:seed:demo -w apps/api`
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import { formatarProtocolo } from '../src/domain';

dotenv.config({ quiet: true });

if (process.env.NODE_ENV === 'production') {
  console.error('O seed de demonstração não roda em produção.');
  process.exit(1);
}

const prisma = new PrismaClient();

export const SENHA_DEMO = 'demo-12345';
const CIDADAOS = [
  { nome: 'Maria Demo', email: 'demo1@taligado.local', telefone: '(94) 90000-0001' },
  { nome: 'João Demo', email: 'demo2@taligado.local', telefone: '(94) 90000-0002' },
  { nome: 'Ana Demo', email: 'demo3@taligado.local', telefone: null },
] as const;

const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000);
const horasAdiante = (h: number) => new Date(Date.now() + h * 3_600_000);

async function proximoProtocolo(tx: Prisma.TransactionClient, ano: number) {
  const [{ ultimo }] = await tx.$queryRaw<{ ultimo: number }[]>`
    INSERT INTO "ProtocoloSequencia" ("ano", "ultimo") VALUES (${ano}, 1)
    ON CONFLICT ("ano") DO UPDATE SET "ultimo" = "ProtocoloSequencia"."ultimo" + 1
    RETURNING "ultimo"`;
  return formatarProtocolo(ano, Number(ultimo));
}

async function main() {
  const [bairros, operador] = await Promise.all([
    prisma.bairro.findMany({ orderBy: { id: 'asc' }, take: 6 }),
    prisma.usuario.findFirst({ where: { papel: 'OPERADOR' } }),
  ]);
  if (bairros.length < 4 || !operador) {
    throw new Error('Rode `npm run db:seed` antes (bairros e operador de teste).');
  }

  const senhaHash = await bcrypt.hash(SENHA_DEMO, 10);
  const [maria, joao, ana] = await Promise.all(
    CIDADAOS.map((c) =>
      prisma.usuario.upsert({
        where: { email: c.email },
        update: { nome: c.nome, senhaHash, telefone: c.telefone },
        create: { ...c, senhaHash, papel: 'CIDADAO' },
      }),
    ),
  );
  if (!maria || !joao || !ana) throw new Error('Falha ao criar as contas de demonstração.');

  // Recria só as denúncias das contas de demonstração.
  await prisma.denuncia.deleteMany({
    where: { autorId: { in: [maria.id, joao.id, ana.id] } },
  });

  type Cenario = {
    autorId: string;
    bairro: (typeof bairros)[number];
    tipo: 'SEM_ENERGIA' | 'OSCILACAO';
    status: 'RECEBIDA' | 'EM_ATENDIMENTO' | 'RESOLVIDA' | 'IMPROCEDENTE';
    criadoHaH: number;
    logradouro: string;
    descricao?: string;
    prioritaria?: boolean;
    previsao?: Date;
    justificativa?: string;
  };
  const [b1, b2, b3, b4] = bairros;
  const cenarios: Cenario[] = [
    {
      autorId: maria.id,
      bairro: b1!,
      tipo: 'SEM_ENERGIA',
      status: 'RECEBIDA',
      criadoHaH: 0.2,
      logradouro: 'Av. VP-8',
      descricao: 'Queda brusca de energia na rua toda.',
      prioritaria: true,
    },
    {
      autorId: joao.id,
      bairro: b2!,
      tipo: 'SEM_ENERGIA',
      status: 'EM_ATENDIMENTO',
      criadoHaH: 2,
      logradouro: 'Rua 7, 120',
      previsao: horasAdiante(2),
    },
    {
      autorId: ana.id,
      bairro: b3!,
      tipo: 'OSCILACAO',
      status: 'RECEBIDA',
      criadoHaH: 1,
      logradouro: 'Travessa das Flores, 45',
      descricao: 'A luz fica piscando desde o fim da tarde.',
    },
    // Encerradas (a de "Restabelecidos" é de poucas horas atrás; a outra não aparece na lista pública).
    {
      autorId: maria.id,
      bairro: b4!,
      tipo: 'SEM_ENERGIA',
      status: 'RESOLVIDA',
      criadoHaH: 6,
      logradouro: 'Rua do Comércio, 300',
    },
    {
      autorId: joao.id,
      bairro: b4!,
      tipo: 'OSCILACAO',
      status: 'IMPROCEDENTE',
      criadoHaH: 30,
      logradouro: 'Rua do Comércio, 310',
      justificativa: 'Equipe foi ao local e não encontrou interrupção.',
    },
  ];

  const ano = new Date().getFullYear();
  for (const c of cenarios) {
    await prisma.$transaction(async (tx) => {
      const criadoEm = horasAtras(c.criadoHaH);
      const protocolo = await proximoProtocolo(tx, ano);
      // Pequeno deslocamento para o pino não cair exatamente sobre o centro do bairro.
      const deslocamento = (Math.random() - 0.5) * 0.004;
      const denuncia = await tx.denuncia.create({
        data: {
          protocolo,
          autorId: c.autorId,
          bairroId: c.bairro.id,
          tipo: c.tipo,
          status: c.status,
          logradouro: c.logradouro,
          descricao: c.descricao,
          latitude: c.bairro.latitude.toNumber() + deslocamento,
          longitude: c.bairro.longitude.toNumber() + deslocamento,
          // RN-015/RN-026: "Sim" só com consentimento, e encerrada não guarda a resposta.
          ...(c.status === 'RECEBIDA' || c.status === 'EM_ATENDIMENTO'
            ? {
                necessidadeEspecial: c.prioritaria ?? false,
                consentimentoNecessidadeEm: c.prioritaria ? criadoEm : null,
              }
            : {}),
          previsaoReparo: c.previsao,
          justificativa: c.justificativa,
          criadoEm,
          finalizadaEm:
            c.status === 'RESOLVIDA' || c.status === 'IMPROCEDENTE'
              ? new Date(criadoEm.getTime() + 2 * 3_600_000)
              : undefined,
        },
      });

      // Histórico coerente com o status atual (RN-011).
      const passos: { de: string | null; para: string; por: 'CIDADAO' | 'OPERADOR'; em: Date }[] = [
        { de: null, para: 'RECEBIDA', por: 'CIDADAO', em: criadoEm },
      ];
      if (c.status !== 'RECEBIDA') {
        const meio = new Date(criadoEm.getTime() + 30 * 60_000);
        if (c.status === 'IMPROCEDENTE') {
          passos.push({ de: 'RECEBIDA', para: 'IMPROCEDENTE', por: 'OPERADOR', em: meio });
        } else {
          passos.push({ de: 'RECEBIDA', para: 'EM_ATENDIMENTO', por: 'OPERADOR', em: meio });
          if (c.status === 'RESOLVIDA') {
            passos.push({
              de: 'EM_ATENDIMENTO',
              para: 'RESOLVIDA',
              por: 'OPERADOR',
              em: new Date(criadoEm.getTime() + 2 * 3_600_000),
            });
          }
        }
      }
      for (const p of passos) {
        await tx.historicoStatus.create({
          data: {
            denunciaId: denuncia.id,
            statusAnterior: p.de as never,
            statusNovo: p.para as never,
            alteradoPorId: p.por === 'CIDADAO' ? c.autorId : operador.id,
            papelAutor: p.por,
            justificativa: p.para === 'IMPROCEDENTE' ? c.justificativa : undefined,
            criadoEm: p.em,
          },
        });
      }
    });
  }

  console.log(
    `Demonstração: ${cenarios.length} denúncias de exemplo criadas para ${CIDADAOS.map((c) => c.email).join(', ')} (senha ${SENHA_DEMO}).`,
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

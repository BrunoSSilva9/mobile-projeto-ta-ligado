-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('CIDADAO', 'OPERADOR');

-- CreateEnum
CREATE TYPE "TipoDenuncia" AS ENUM ('SEM_ENERGIA', 'OSCILACAO');

-- CreateEnum
CREATE TYPE "StatusDenuncia" AS ENUM ('RECEBIDA', 'EM_ATENDIMENTO', 'RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "FaixaPessoas" AS ENUM ('ATE_3', 'DE_4_A_8', 'DE_9_A_20', 'RUA_TODA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "telefone" TEXT,
    "papel" "Papel" NOT NULL DEFAULT 'CIDADAO',
    "consentimentoEm" TIMESTAMP(3),
    "versaoTermos" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bairro" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "folha" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "Bairro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Denuncia" (
    "id" UUID NOT NULL,
    "protocolo" TEXT NOT NULL,
    "autorId" UUID,
    "bairroId" INTEGER NOT NULL,
    "tipo" "TipoDenuncia" NOT NULL,
    "status" "StatusDenuncia" NOT NULL DEFAULT 'RECEBIDA',
    "logradouro" TEXT NOT NULL,
    "cep" TEXT,
    "pontoReferencia" TEXT,
    "descricao" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "faixaPessoas" "FaixaPessoas",
    "necessidadeEspecial" BOOLEAN NOT NULL DEFAULT false,
    "detalheNecessidade" TEXT,
    "previsaoReparo" TIMESTAMP(3),
    "justificativa" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "finalizadaEm" TIMESTAMP(3),

    CONSTRAINT "Denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DenunciaFoto" (
    "id" UUID NOT NULL,
    "denunciaId" UUID NOT NULL,
    "arquivo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanhoBytes" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DenunciaFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoStatus" (
    "id" UUID NOT NULL,
    "denunciaId" UUID NOT NULL,
    "statusAnterior" "StatusDenuncia",
    "statusNovo" "StatusDenuncia" NOT NULL,
    "alteradoPorId" UUID,
    "papelAutor" "Papel" NOT NULL,
    "justificativa" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Bairro_nome_folha_key" ON "Bairro"("nome", "folha");

-- CreateIndex
CREATE UNIQUE INDEX "Denuncia_protocolo_key" ON "Denuncia"("protocolo");

-- CreateIndex
CREATE INDEX "Denuncia_status_bairroId_idx" ON "Denuncia"("status", "bairroId");

-- CreateIndex
CREATE INDEX "Denuncia_bairroId_status_tipo_idx" ON "Denuncia"("bairroId", "status", "tipo");

-- CreateIndex
CREATE INDEX "Denuncia_criadoEm_idx" ON "Denuncia"("criadoEm");

-- CreateIndex
CREATE INDEX "DenunciaFoto_denunciaId_idx" ON "DenunciaFoto"("denunciaId");

-- CreateIndex
CREATE INDEX "HistoricoStatus_denunciaId_criadoEm_idx" ON "HistoricoStatus"("denunciaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_usuarioId_idx" ON "PushToken"("usuarioId");

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Denuncia" ADD CONSTRAINT "Denuncia_bairroId_fkey" FOREIGN KEY ("bairroId") REFERENCES "Bairro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenunciaFoto" ADD CONSTRAINT "DenunciaFoto_denunciaId_fkey" FOREIGN KEY ("denunciaId") REFERENCES "Denuncia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoStatus" ADD CONSTRAINT "HistoricoStatus_denunciaId_fkey" FOREIGN KEY ("denunciaId") REFERENCES "Denuncia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoStatus" ADD CONSTRAINT "HistoricoStatus_alteradoPorId_fkey" FOREIGN KEY ("alteradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Restrições que o Prisma não expressa (docs/09-modelo-de-dados.md)
-- ---------------------------------------------------------------------------

-- RN-006: no máximo uma denúncia em aberto por autor.
CREATE UNIQUE INDEX "denuncia_autor_aberta_uk"
  ON "Denuncia" ("autorId")
  WHERE "status" IN ('RECEBIDA', 'EM_ATENDIMENTO') AND "autorId" IS NOT NULL;

-- RN-010: improcedência exige justificativa.
ALTER TABLE "Denuncia"
  ADD CONSTRAINT "denuncia_improcedente_justificativa_ck"
  CHECK ("status" <> 'IMPROCEDENTE' OR "justificativa" IS NOT NULL);

-- RN-015: necessidade especial exige o detalhe da situação.
ALTER TABLE "Denuncia"
  ADD CONSTRAINT "denuncia_necessidade_detalhe_ck"
  CHECK (NOT "necessidadeEspecial" OR "detalheNecessidade" IS NOT NULL);

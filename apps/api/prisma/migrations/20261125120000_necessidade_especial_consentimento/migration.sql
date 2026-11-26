-- Fase 2, F2-2: necessidade especial só Sim/Não, com consentimento específico e retenção curta
-- (decisões S-46 e S-47; RN-015 e RN-026).
--
-- ATENÇÃO: esta migration APAGA a coluna "detalheNecessidade" e os dados dela, e APAGA as
-- respostas de necessidade especial que já existiam (ver os UPDATE abaixo).

-- 1) Sai o texto livre da situação (minimização de dado de saúde).
ALTER TABLE "Denuncia" DROP CONSTRAINT "denuncia_necessidade_detalhe_ck";
ALTER TABLE "Denuncia" DROP COLUMN "detalheNecessidade";

-- 2) A resposta passa a aceitar nulo (não informado ou apagado) e entra a data do consentimento.
ALTER TABLE "Denuncia" ALTER COLUMN "necessidadeEspecial" DROP NOT NULL;
ALTER TABLE "Denuncia" ALTER COLUMN "necessidadeEspecial" DROP DEFAULT;
ALTER TABLE "Denuncia" ADD COLUMN "consentimentoNecessidadeEm" TIMESTAMP(3);

-- 3) Nenhum "Sim" antigo foi dado com o consentimento específico: a resposta é apagada.
UPDATE "Denuncia" SET "necessidadeEspecial" = NULL WHERE "necessidadeEspecial" = true;

-- 4) RN-026 aplicada ao que já existe: denúncia encerrada não guarda a resposta.
UPDATE "Denuncia" SET "necessidadeEspecial" = NULL
  WHERE "status" IN ('RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA');

-- 5) O banco também garante as duas regras.
-- RN-015: "Sim" só com o consentimento registrado.
ALTER TABLE "Denuncia"
  ADD CONSTRAINT "denuncia_necessidade_consentimento_ck"
  CHECK ("necessidadeEspecial" IS NOT TRUE OR "consentimentoNecessidadeEm" IS NOT NULL);

-- RN-026: denúncia encerrada não guarda a resposta nem o consentimento.
ALTER TABLE "Denuncia"
  ADD CONSTRAINT "denuncia_necessidade_encerrada_ck"
  CHECK (
    "status" NOT IN ('RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA')
    OR ("necessidadeEspecial" IS NULL AND "consentimentoNecessidadeEm" IS NULL)
  );

-- Fase 2, F2-5: o histórico passa a registrar também as mudanças da previsão de reparo (S-60, RN-011).
-- Aditiva: nada é apagado. Todo registro que já existe vira `STATUS` (é uma mudança de status) e fica
-- sem previsão no registro.

CREATE TYPE "EventoHistorico" AS ENUM ('STATUS', 'PREVISAO');

ALTER TABLE "HistoricoStatus"
  ADD COLUMN "evento" "EventoHistorico" NOT NULL DEFAULT 'STATUS',
  ADD COLUMN "previsaoReparo" TIMESTAMP(3);

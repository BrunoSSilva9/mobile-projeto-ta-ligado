import { z } from 'zod';

import { TODOS_OS_STATUS } from '../../domain';
import { vazioOuNuloViraAusente } from '../../shared/validacao';

const STATUS = TODOS_OS_STATUS as [string, ...string[]];

/** `status=RECEBIDA,EM_ATENDIMENTO` (ou o parâmetro repetido) vira uma lista; vazio vira "ausente". */
const listaDeStatus = (valor: unknown) => {
  if (Array.isArray(valor)) return valor.length > 0 ? valor : undefined;
  if (typeof valor === 'string') {
    const itens = valor
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return itens.length > 0 ? itens : undefined;
  }
  return valor;
};

/**
 * Filtros da lista do painel (RF-028): status (um ou vários), tipo, bairro e prioritárias.
 * Paginação: padrão 20, máximo 100.
 */
export const filtrosDoPainelSchema = z.object({
  status: z.preprocess(
    listaDeStatus,
    z.array(z.enum(STATUS, { error: 'Status inválido.' })).optional(),
  ),
  tipo: z.preprocess(
    vazioOuNuloViraAusente,
    z.enum(['SEM_ENERGIA', 'OSCILACAO'], { error: 'Tipo inválido.' }).optional(),
  ),
  bairroId: z.preprocess(
    vazioOuNuloViraAusente,
    z.coerce
      .number({ error: 'Bairro inválido.' })
      .int('Bairro inválido.')
      .positive('Bairro inválido.')
      .optional(),
  ),
  prioritarias: z.preprocess(
    vazioOuNuloViraAusente,
    z
      .enum(['true', 'false'], { error: 'Use true ou false.' })
      .transform((v) => v === 'true')
      .optional(),
  ),
  page: z.coerce.number().int().min(1, 'A página começa em 1.').default(1),
  limite: z.coerce
    .number()
    .int()
    .min(1, 'O limite mínimo é 1.')
    .max(100, 'O limite máximo é 100.')
    .default(20),
});

export type FiltrosDoPainel = z.infer<typeof filtrosDoPainelSchema>;

/**
 * Mudança de status feita pelo operador (RF-031 a RF-033).
 * A justificativa (10 a 500 caracteres) é conferida pela regra de domínio, e só vale para IMPROCEDENTE.
 */
export const atualizarStatusSchema = z.object({
  status: z.enum(STATUS, { error: 'Informe o novo status.' }),
  justificativa: z.preprocess(vazioOuNuloViraAusente, z.string().trim().optional()),
  previsaoReparo: z.preprocess(
    vazioOuNuloViraAusente,
    z.iso
      .datetime({ offset: true, error: 'Informe a previsão como data e hora (ISO 8601).' })
      .optional(),
  ),
});

export type DadosDeStatus = z.infer<typeof atualizarStatusSchema>;

/**
 * Previsão de reparo isolada (RF-033, decisão S-60): uma data e hora (ISO 8601) para **definir ou
 * trocar**, ou `null` para **remover**. O campo é obrigatório (ausente é erro): assim um corpo
 * vazio nunca remove a previsão sem querer.
 */
export const atualizarPrevisaoSchema = z.object({
  previsaoReparo: z
    .string({ error: 'Informe a previsão (data e hora) ou null para remover.' })
    .pipe(
      z.iso.datetime({ offset: true, error: 'Informe a previsão como data e hora (ISO 8601).' }),
    )
    .nullable(),
});

export type DadosDePrevisao = z.infer<typeof atualizarPrevisaoSchema>;

/** Id de bairro na rota (inteiro positivo). */
export const bairroIdSchema = z.coerce
  .number({ error: 'Bairro inválido.' })
  .int('Bairro inválido.')
  .positive('Bairro inválido.');

/**
 * Resolução em lote por bairro (RF-034, RN-016): a confirmação explícita é obrigatória
 * (`"confirmacao": true`); sem ela, 400. Ação em massa nunca roda por engano.
 */
export const resolverBairroSchema = z.object({
  confirmacao: z.literal(true, { error: 'Confirme a resolução em lote (confirmacao: true).' }),
});

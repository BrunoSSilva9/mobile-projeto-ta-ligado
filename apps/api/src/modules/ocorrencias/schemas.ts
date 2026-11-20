import { z } from 'zod';

import { vazioOuNuloViraAusente } from '../../shared/validacao';

/** Filtro de status da lista pública (RF-019, RF-020): os chips da tela T-04. */
export const STATUS_PUBLICOS = ['SEM_LUZ', 'OSCILACAO', 'RESTABELECIDO'] as const;
export type StatusPublico = (typeof STATUS_PUBLICOS)[number];

/** `GET /ocorrencias`: status (chip), bairro, busca por bairro/folha e paginação (padrão 20, máx. 50). */
export const consultaDeOcorrenciasSchema = z.object({
  status: z.preprocess(
    vazioOuNuloViraAusente,
    z
      .enum(STATUS_PUBLICOS, { error: 'Status inválido. Use SEM_LUZ, OSCILACAO ou RESTABELECIDO.' })
      .optional(),
  ),
  bairroId: z.preprocess(
    vazioOuNuloViraAusente,
    z.coerce
      .number({ error: 'Bairro inválido.' })
      .int('Bairro inválido.')
      .positive('Bairro inválido.')
      .optional(),
  ),
  q: z.preprocess(
    vazioOuNuloViraAusente,
    z.string().trim().max(100, 'A busca pode ter no máximo 100 caracteres.').optional(),
  ),
  page: z.coerce.number().int().min(1, 'A página começa em 1.').default(1),
  limite: z.coerce
    .number()
    .int()
    .min(1, 'O limite mínimo é 1.')
    .max(50, 'O limite máximo é 50.')
    .default(20),
});

export type ConsultaDeOcorrencias = z.infer<typeof consultaDeOcorrenciasSchema>;

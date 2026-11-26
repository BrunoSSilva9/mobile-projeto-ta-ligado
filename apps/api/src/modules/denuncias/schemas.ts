import { z } from 'zod';

import { TODOS_OS_STATUS, validarNecessidade } from '../../domain';
import { vazioOuNuloViraAusente } from '../../shared/validacao';

/** Texto opcional: vazio ou `null` viram "ausente"; o resto é aparado e limitado. */
const textoOpcional = (max: number, rotulo: string) =>
  z.preprocess(
    vazioOuNuloViraAusente,
    z.string().trim().max(max, `${rotulo} pode ter no máximo ${max} caracteres.`).optional(),
  );

const numeroOpcional = (rotulo: string, min: number, max: number) =>
  z.preprocess(
    vazioOuNuloViraAusente,
    z
      .number({ error: `${rotulo} inválida.` })
      .min(min, `${rotulo} inválida.`)
      .max(max, `${rotulo} inválida.`)
      .optional(),
  );

/**
 * Registro de denúncia (RF-007, RF-008, RF-010, RN-002, RN-012, RN-015).
 * O `detalheNecessidade` da Fase 1 não existe mais (S-46): se vier, é descartado como qualquer chave desconhecida.
 * Obrigatórios: tipo, bairro e logradouro. Coordenadas são opcionais (GPS negado), mas vêm juntas.
 * Campos como `status`, `protocolo`, `autorId` e `prioritaria` NÃO são aceitos do cliente:
 * o Zod descarta chaves desconhecidas e o servidor define esses valores.
 */
export const criarDenunciaSchema = z
  .object({
    tipo: z.enum(['SEM_ENERGIA', 'OSCILACAO'], {
      error: 'Escolha o tipo: sem energia ou oscilação.',
    }),
    bairroId: z
      .number({ error: 'Escolha o bairro.' })
      .int('Escolha o bairro.')
      .positive('Escolha o bairro.'),
    logradouro: z
      .string({ error: 'Informe o logradouro.' })
      .trim()
      .min(3, 'Informe o logradouro (pelo menos 3 caracteres).')
      .max(200, 'O logradouro pode ter no máximo 200 caracteres.'),
    cep: z.preprocess(
      vazioOuNuloViraAusente,
      z
        .string()
        .trim()
        .regex(/^\d{5}-?\d{3}$/, 'Informe o CEP no formato 68500-000.')
        .optional(),
    ),
    pontoReferencia: textoOpcional(200, 'O ponto de referência'),
    descricao: textoOpcional(500, 'A descrição'),
    latitude: numeroOpcional('Latitude', -90, 90),
    longitude: numeroOpcional('Longitude', -180, 180),
    faixaPessoas: z.preprocess(
      vazioOuNuloViraAusente,
      z
        .enum(['ATE_3', 'DE_4_A_8', 'DE_9_A_20', 'RUA_TODA'], {
          error: 'Faixa de pessoas inválida.',
        })
        .optional(),
    ),
    // RN-015, S-46: só Sim/Não (sem texto livre); `null` ou ausente = não informado.
    necessidadeEspecial: z.preprocess(
      vazioOuNuloViraAusente,
      z.boolean({ error: 'Informe se há necessidade especial (sim ou não).' }).optional(),
    ),
    // Consentimento específico do "Sim" (LGPD, art. 11, I).
    consentimentoNecessidade: z.preprocess(
      vazioOuNuloViraAusente,
      z.boolean({ error: 'Informe se autoriza o envio (sim ou não).' }).optional(),
    ),
  })
  .refine((d) => (d.latitude === undefined) === (d.longitude === undefined), {
    error: 'Informe latitude e longitude juntas, ou nenhuma das duas.',
    path: ['latitude'],
  })
  .superRefine((d, ctx) => {
    const resultado = validarNecessidade({
      necessidadeEspecial: d.necessidadeEspecial,
      consentimento: d.consentimentoNecessidade,
    });
    if (!resultado.ok) {
      ctx.addIssue({
        code: 'custom',
        message: resultado.mensagem,
        path: ['consentimentoNecessidade'],
      });
    }
  });

export type DadosDeDenuncia = z.infer<typeof criarDenunciaSchema>;

/** Consulta de "Minhas denúncias": filtro opcional por status e paginação (padrão 20, máximo 50). */
export const minhasDenunciasSchema = z.object({
  status: z
    .enum(TODOS_OS_STATUS as [string, ...string[]], { error: 'Status inválido.' })
    .optional(),
  page: z.coerce.number().int().min(1, 'A página começa em 1.').default(1),
  limite: z.coerce
    .number()
    .int()
    .min(1, 'O limite mínimo é 1.')
    .max(50, 'O limite máximo é 50.')
    .default(20),
});

export type ConsultaMinhasDenuncias = z.infer<typeof minhasDenunciasSchema>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita consultar o banco com um id que não é UUID (o Prisma lançaria erro de formato). */
export function idValido(id: string): boolean {
  return UUID.test(id);
}

/**
 * No `multipart/form-data` todo campo chega como texto. Converte os que não são texto (números e
 * sim/não) para os tipos que o schema espera; o que não der para converter segue como veio e o
 * schema recusa com a mensagem de sempre. Texto vazio fica como está (vira "ausente" no schema).
 */
export function normalizarCamposDoMultipart(corpo: Record<string, unknown> | undefined) {
  const saida: Record<string, unknown> = { ...(corpo ?? {}) };
  for (const campo of ['bairroId', 'latitude', 'longitude']) {
    const valor = saida[campo];
    if (typeof valor === 'string' && valor.trim() !== '') saida[campo] = Number(valor);
  }
  for (const campo of ['necessidadeEspecial', 'consentimentoNecessidade']) {
    const valor = saida[campo];
    if (valor === 'true') saida[campo] = true;
    if (valor === 'false') saida[campo] = false;
  }
  return saida;
}

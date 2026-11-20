import { z } from 'zod';

// Mensagens do Zod em português (RNF-005).
z.config(z.locales.pt());

export const TIPOS_DE_DENUNCIA = [
  { valor: 'SEM_ENERGIA', rotulo: 'Sem energia' },
  { valor: 'OSCILACAO', rotulo: 'Oscilação' },
] as const;

export type TipoDeDenuncia = (typeof TIPOS_DE_DENUNCIA)[number]['valor'];

export const rotuloDoTipo = (tipo: string): string =>
  TIPOS_DE_DENUNCIA.find((t) => t.valor === tipo)?.rotulo ?? tipo;

/**
 * Formulário de denúncia da Fase 1 (RF-007, RN-002, RN-012). Espelha a validação da API.
 * Fotos, pessoas afetadas e necessidade especial ficam para a Fase 2 (decisão S-38).
 * Latitude e longitude não são campos do formulário: vêm do GPS (ou do pino movido no mapa).
 */
export const denunciaSchema = z.object({
  tipo: z.enum(['SEM_ENERGIA', 'OSCILACAO'], {
    error: 'Escolha o tipo: sem energia ou oscilação.',
  }),
  bairroId: z
    .number({ error: 'Escolha o bairro.' })
    .int('Escolha o bairro.')
    .positive('Escolha o bairro.'),
  logradouro: z
    .string()
    .trim()
    .min(3, 'Informe o logradouro (pelo menos 3 caracteres).')
    .max(200, 'O logradouro pode ter no máximo 200 caracteres.'),
  cep: z
    .string()
    .trim()
    .refine((valor) => valor === '' || /^\d{5}-?\d{3}$/.test(valor), {
      error: 'Informe o CEP no formato 68500-000.',
    }),
  pontoReferencia: z
    .string()
    .trim()
    .max(200, 'O ponto de referência pode ter no máximo 200 caracteres.'),
  descricao: z.string().trim().max(500, 'A descrição pode ter no máximo 500 caracteres.'),
});

export type DadosDaDenuncia = z.infer<typeof denunciaSchema>;

/** Campos do formulário que o servidor pode apontar com erro. */
export const CAMPOS_DA_DENUNCIA = [
  'tipo',
  'bairroId',
  'logradouro',
  'cep',
  'pontoReferencia',
  'descricao',
] as const;

export const LIMITE_DA_DESCRICAO = 500;

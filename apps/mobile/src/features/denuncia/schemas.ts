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

/** Faixas de pessoas no local (RF-010, S-48), com o texto do protótipo. */
export const FAIXAS_DE_PESSOAS = [
  { valor: 'ATE_3', rotulo: '1 a 3' },
  { valor: 'DE_4_A_8', rotulo: '4 a 8' },
  { valor: 'DE_9_A_20', rotulo: '9 a 20' },
  { valor: 'RUA_TODA', rotulo: 'Rua toda' },
] as const;

export type FaixaDePessoas = (typeof FAIXAS_DE_PESSOAS)[number]['valor'];

export const rotuloDaFaixa = (faixa: string): string => {
  const item = FAIXAS_DE_PESSOAS.find((f) => f.valor === faixa);
  if (!item) return faixa;
  return item.valor === 'RUA_TODA' ? item.rotulo : `${item.rotulo} pessoas`;
};

/** Pergunta da necessidade especial (S-46): só Sim/Não, sem texto livre. */
export const PERGUNTA_DA_NECESSIDADE =
  'Alguém no local depende de aparelho elétrico, como respirador ou geladeira de remédios, ou tem necessidade especial?';

/** Consentimento específico do "Sim" (LGPD, art. 11, I), separado dos Termos. */
export const TEXTO_DO_CONSENTIMENTO =
  'Autorizo enviar essa informação à Equatorial, só para dar prioridade ao atendimento. Ela é apagada quando a denúncia termina.';

/**
 * Formulário de denúncia (RF-007, RF-010, RN-002, RN-012, RN-015). Espelha a validação da API.
 * Pessoas no local e necessidade especial são opcionais (S-46, S-48). O "Sim" sem o consentimento
 * **não bloqueia** o envio: ele só não é enviado (o resumo avisa). Fotos entram na F2-3.
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
  faixaPessoas: z.enum(['ATE_3', 'DE_4_A_8', 'DE_9_A_20', 'RUA_TODA']).optional(),
  necessidadeEspecial: z.boolean().optional(),
  consentimentoNecessidade: z.boolean().optional(),
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
  'faixaPessoas',
  'necessidadeEspecial',
  'consentimentoNecessidade',
] as const;

export const LIMITE_DA_DESCRICAO = 500;

/**
 * O que vai acontecer com a necessidade especial ao enviar (RN-015, S-46): `'sim'` (com o
 * consentimento), `'nao'`, `'sem-autorizacao'` ("Sim" sem o consentimento: não é enviado) ou
 * `null` (sem resposta).
 */
export function necessidadeAoEnviar(
  dados: Pick<DadosDaDenuncia, 'necessidadeEspecial' | 'consentimentoNecessidade'>,
): 'sim' | 'nao' | 'sem-autorizacao' | null {
  if (dados.necessidadeEspecial === true) {
    return dados.consentimentoNecessidade === true ? 'sim' : 'sem-autorizacao';
  }
  if (dados.necessidadeEspecial === false) return 'nao';
  return null;
}

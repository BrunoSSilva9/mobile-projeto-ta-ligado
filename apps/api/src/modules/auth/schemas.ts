import { z } from 'zod';

import { vazioOuNuloViraAusente } from '../../shared/validacao';

/** Telefone brasileiro com DDD, com ou sem máscara: (94) 90000-0000, (94) 3322-1234, 94900000000. */
const TELEFONE_BR = /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/;

/**
 * Cadastro de cidadão (RN-020, RN-022). CPF e data de nascimento NÃO são coletados.
 * O papel nunca vem do cliente: o cadastro público só cria `CIDADAO` (RN-001).
 */
export const registerSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(2, 'O nome precisa ter pelo menos 2 caracteres.')
    .max(100, 'O nome pode ter no máximo 100 caracteres.'),
  email: z
    .string({ error: 'Informe o e-mail.' })
    .trim()
    .toLowerCase()
    .pipe(z.email('Informe um e-mail válido.')),
  senha: z
    .string({ error: 'Informe a senha.' })
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .max(72, 'A senha pode ter no máximo 72 caracteres.'),
  telefone: z.preprocess(
    vazioOuNuloViraAusente,
    z
      .string()
      .trim()
      .regex(TELEFONE_BR, 'Informe o telefone com DDD, ex.: (94) 90000-0000.')
      .optional(),
  ),
  aceiteTermos: z.literal(true, {
    error: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.',
  }),
  versaoTermos: z
    .string({ error: 'Informe a versão dos termos.' })
    .trim()
    .min(1, 'Informe a versão dos termos.')
    .max(20),
});

/**
 * Edição do perfil (RF-005): só `nome` e `telefone`. O e-mail é somente leitura (decisão S-22) e,
 * como qualquer outra chave (papel, senha...), é descartado. Campo ausente = não muda; telefone
 * vazio ou `null` = apagar o telefone.
 */
export const atualizarPerfilSchema = z
  .object({
    nome: z
      .string({ error: 'Informe o nome.' })
      .trim()
      .min(2, 'O nome precisa ter pelo menos 2 caracteres.')
      .max(100, 'O nome pode ter no máximo 100 caracteres.')
      .optional(),
    telefone: z.preprocess(
      (valor) => (typeof valor === 'string' && valor.trim() === '' ? null : valor),
      z
        .string()
        .trim()
        .regex(TELEFONE_BR, 'Informe o telefone com DDD, ex.: (94) 90000-0000.')
        .nullable()
        .optional(),
    ),
  })
  .refine((d) => d.nome !== undefined || d.telefone !== undefined, {
    error: 'Informe o nome ou o telefone.',
    path: ['nome'],
  });

/** Exclusão de conta (RF-006, RN-024, S-59): exige a senha atual. */
export const excluirContaSchema = z.object({
  senha: z.string({ error: 'Informe a sua senha atual.' }).min(1, 'Informe a sua senha atual.'),
});

export const loginSchema = z.object({
  email: z.string({ error: 'Informe o e-mail.' }).trim().toLowerCase().min(1, 'Informe o e-mail.'),
  senha: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.'),
});

export type DadosDeRegistro = z.infer<typeof registerSchema>;
export type DadosDeLogin = z.infer<typeof loginSchema>;
export type DadosDePerfil = z.infer<typeof atualizarPerfilSchema>;

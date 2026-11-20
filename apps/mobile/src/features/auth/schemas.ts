import { z } from 'zod';

// Mensagens do Zod em português (RNF-005).
z.config(z.locales.pt());

/** Telefone brasileiro com DDD, com ou sem máscara. Igual ao da API (RN-022). */
export const TELEFONE_BR = /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/;

/**
 * Cadastro (RF-001, RF-002, RN-020, RN-022). Espelha a validação da API para o usuário ver o erro
 * antes de enviar; a API continua sendo a fonte da verdade. CPF e nascimento não são coletados.
 */
export const cadastroSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, 'O nome precisa ter pelo menos 2 caracteres.')
      .max(100, 'O nome pode ter no máximo 100 caracteres.'),
    email: z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido.')),
    telefone: z
      .string()
      .trim()
      .refine((valor) => valor === '' || TELEFONE_BR.test(valor), {
        error: 'Informe o telefone com DDD, ex.: (94) 90000-0000.',
      }),
    senha: z
      .string()
      .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
      .max(72, 'A senha pode ter no máximo 72 caracteres.'),
    confirmarSenha: z.string().min(1, 'Confirme a senha.'),
    aceiteTermos: z.boolean().refine((aceito) => aceito, {
      error: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.',
    }),
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    error: 'As senhas não são iguais.',
    path: ['confirmarSenha'],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe o e-mail.')
    .pipe(z.email('Informe um e-mail válido.')),
  senha: z.string().min(1, 'Informe a senha.'),
});

export type DadosDoCadastro = z.infer<typeof cadastroSchema>;
export type DadosDoLogin = z.infer<typeof loginSchema>;

export const VALORES_INICIAIS_DO_CADASTRO: DadosDoCadastro = {
  nome: '',
  email: '',
  telefone: '',
  senha: '',
  confirmarSenha: '',
  aceiteTermos: false,
};

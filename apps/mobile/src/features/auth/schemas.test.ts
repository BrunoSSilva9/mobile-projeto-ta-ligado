import {
  cadastroSchema,
  loginSchema,
  perfilSchema,
  VALORES_INICIAIS_DO_CADASTRO,
  type DadosDoCadastro,
} from '@/features/auth/schemas';

const valido: DadosDoCadastro = {
  nome: 'Maria Silva',
  email: 'maria@exemplo.com',
  telefone: '(94) 90000-0000',
  senha: 'minhasenha1',
  confirmarSenha: 'minhasenha1',
  aceiteTermos: true,
};

/** Mensagens de erro por campo (a primeira de cada campo). */
function erros(dados: Partial<DadosDoCadastro>) {
  const resultado = cadastroSchema.safeParse({ ...valido, ...dados });
  if (resultado.success) return {};
  return Object.fromEntries(
    resultado.error.issues.map((i) => [String(i.path[0]), i.message] as const).reverse(),
  );
}

describe('cadastroSchema (RF-001, RF-002, RN-022)', () => {
  it('aceita um cadastro válido', () => {
    expect(cadastroSchema.safeParse(valido).success).toBe(true);
  });

  it('o formulário vazio começa inválido (todos os campos obrigatórios pendentes)', () => {
    const resultado = cadastroSchema.safeParse(VALORES_INICIAIS_DO_CADASTRO);
    expect(resultado.success).toBe(false);
  });

  it('normaliza: nome e e-mail sem espaços nas pontas e e-mail em minúsculas', () => {
    const resultado = cadastroSchema.parse({
      ...valido,
      nome: '  Maria Silva ',
      email: '  Maria@EXEMPLO.com ',
    });
    expect(resultado.nome).toBe('Maria Silva');
    expect(resultado.email).toBe('maria@exemplo.com');
  });

  it.each([
    ['nome com 1 caractere', { nome: 'A' }, 'nome'],
    ['nome só com espaços', { nome: '   ' }, 'nome'],
    ['nome com mais de 100 caracteres', { nome: 'A'.repeat(101) }, 'nome'],
    ['e-mail sem @', { email: 'nao-e-email' }, 'email'],
    ['e-mail vazio', { email: '' }, 'email'],
    ['telefone curto', { telefone: '12345' }, 'telefone'],
    ['telefone com letras', { telefone: '(94) abcde-0000' }, 'telefone'],
    ['senha com 7 caracteres', { senha: '1234567', confirmarSenha: '1234567' }, 'senha'],
    [
      'senha com mais de 72 caracteres',
      { senha: 'a'.repeat(73), confirmarSenha: 'a'.repeat(73) },
      'senha',
    ],
    ['confirmação diferente da senha', { confirmarSenha: 'outra-senha-1' }, 'confirmarSenha'],
    ['confirmação vazia', { confirmarSenha: '' }, 'confirmarSenha'],
    ['termos não aceitos', { aceiteTermos: false }, 'aceiteTermos'],
  ] as const)('recusa %s', (_nome, alteracao, campo) => {
    expect(Object.keys(erros(alteracao))).toContain(campo);
  });

  it.each(['', '(94) 90000-0000', '(94) 3322-1234', '94900000000', '(94)90000-0000'])(
    'aceita o telefone "%s" (opcional, como na API)',
    (telefone) => {
      expect(cadastroSchema.safeParse({ ...valido, telefone }).success).toBe(true);
    },
  );

  it('as mensagens vêm em português', () => {
    const e = erros({ nome: 'A', senha: '123', confirmarSenha: '456', aceiteTermos: false });

    expect(e.nome).toBe('O nome precisa ter pelo menos 2 caracteres.');
    expect(e.senha).toBe('A senha precisa ter pelo menos 8 caracteres.');
    expect(e.confirmarSenha).toBe('As senhas não são iguais.');
    expect(e.aceiteTermos).toBe('É preciso aceitar os Termos de Uso e a Política de Privacidade.');
    expect(JSON.stringify(e)).not.toMatch(/\b(Invalid|Too small|expected)\b/);
  });

  it('não coleta CPF nem data de nascimento (minimização)', () => {
    expect(
      Object.keys(cadastroSchema.parse({ ...valido, cpf: '123', nascimento: '1990' })),
    ).toEqual(expect.not.arrayContaining(['cpf', 'nascimento']));
    expect(Object.keys(VALORES_INICIAIS_DO_CADASTRO)).toEqual(
      expect.not.arrayContaining(['cpf', 'nascimento']),
    );
  });
});

describe('loginSchema (RF-003)', () => {
  it('aceita e-mail e senha', () => {
    expect(loginSchema.safeParse({ email: 'maria@exemplo.com', senha: 'x' }).success).toBe(true);
  });

  it('normaliza o e-mail', () => {
    expect(loginSchema.parse({ email: '  MARIA@exemplo.com ', senha: 'x' }).email).toBe(
      'maria@exemplo.com',
    );
  });

  it.each([
    ['e-mail vazio', { email: '', senha: 'x' }, 'Informe o e-mail.'],
    ['e-mail inválido', { email: 'abc', senha: 'x' }, 'Informe um e-mail válido.'],
    ['senha vazia', { email: 'maria@exemplo.com', senha: '' }, 'Informe a senha.'],
  ])('recusa %s', (_nome, dados, mensagem) => {
    const resultado = loginSchema.safeParse(dados);
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0]!.message).toBe(mensagem);
  });

  it('não exige tamanho mínimo da senha no login (contas antigas continuam entrando)', () => {
    expect(loginSchema.safeParse({ email: 'maria@exemplo.com', senha: '1' }).success).toBe(true);
  });
});

describe('perfilSchema (RF-005)', () => {
  it('aceita nome e telefone válidos, ou telefone em branco', () => {
    expect(
      perfilSchema.safeParse({ nome: 'Maria Silva', telefone: '(94) 90000-0000' }).success,
    ).toBe(true);
    expect(perfilSchema.safeParse({ nome: 'Maria Silva', telefone: '' }).success).toBe(true);
  });

  it('apara o nome', () => {
    expect(perfilSchema.parse({ nome: '  Maria Silva ', telefone: '' }).nome).toBe('Maria Silva');
  });

  it.each([
    ['nome curto', { nome: 'M', telefone: '' }, 'O nome precisa ter pelo menos 2 caracteres.'],
    [
      'nome longo',
      { nome: 'M'.repeat(101), telefone: '' },
      'O nome pode ter no máximo 100 caracteres.',
    ],
    [
      'telefone sem DDD',
      { nome: 'Maria', telefone: '90000-0000' },
      'Informe o telefone com DDD, ex.: (94) 90000-0000.',
    ],
  ])('recusa %s', (_nome, dados, mensagem) => {
    const resultado = perfilSchema.safeParse(dados);
    expect(resultado.success).toBe(false);
    if (!resultado.success) expect(resultado.error.issues[0]!.message).toBe(mensagem);
  });
});

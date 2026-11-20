import { denunciaSchema, rotuloDoTipo } from './schemas';

const valido = {
  tipo: 'SEM_ENERGIA',
  bairroId: 3,
  logradouro: 'Rua das Flores, 10',
  cep: '',
  pontoReferencia: '',
  descricao: '',
};

const mensagens = (entrada: unknown) => {
  const r = denunciaSchema.safeParse(entrada);
  return r.success ? [] : r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`);
};

describe('denunciaSchema (RF-007, RN-002, RN-012)', () => {
  it('aceita só os campos obrigatórios', () => {
    expect(denunciaSchema.safeParse(valido).success).toBe(true);
  });

  it('aceita os dois tipos de denúncia', () => {
    expect(denunciaSchema.safeParse({ ...valido, tipo: 'OSCILACAO' }).success).toBe(true);
  });

  it('exige o tipo', () => {
    expect(mensagens({ ...valido, tipo: undefined })).toEqual([
      'tipo: Escolha o tipo: sem energia ou oscilação.',
    ]);
  });

  it('rejeita um tipo desconhecido', () => {
    expect(denunciaSchema.safeParse({ ...valido, tipo: 'APAGAO' }).success).toBe(false);
  });

  it('exige o bairro', () => {
    expect(mensagens({ ...valido, bairroId: undefined })).toEqual(['bairroId: Escolha o bairro.']);
    expect(mensagens({ ...valido, bairroId: 0 })).toEqual(['bairroId: Escolha o bairro.']);
  });

  it('exige logradouro com pelo menos 3 caracteres (depois de aparar os espaços)', () => {
    expect(mensagens({ ...valido, logradouro: '' })).toHaveLength(1);
    expect(mensagens({ ...valido, logradouro: '  ab  ' })).toHaveLength(1);
    expect(denunciaSchema.safeParse({ ...valido, logradouro: 'Rua' }).success).toBe(true);
  });

  it('limita o logradouro a 200 e a descrição a 500 caracteres', () => {
    expect(denunciaSchema.safeParse({ ...valido, logradouro: 'a'.repeat(200) }).success).toBe(true);
    expect(denunciaSchema.safeParse({ ...valido, logradouro: 'a'.repeat(201) }).success).toBe(
      false,
    );
    expect(denunciaSchema.safeParse({ ...valido, descricao: 'a'.repeat(500) }).success).toBe(true);
    expect(denunciaSchema.safeParse({ ...valido, descricao: 'a'.repeat(501) }).success).toBe(false);
  });

  it('limita o ponto de referência a 200 caracteres', () => {
    expect(denunciaSchema.safeParse({ ...valido, pontoReferencia: 'a'.repeat(201) }).success).toBe(
      false,
    );
  });

  it.each(['68500-000', '68500000'])('aceita o CEP %s', (cep) => {
    expect(denunciaSchema.safeParse({ ...valido, cep }).success).toBe(true);
  });

  it.each(['685', '68500-00', 'abcde-fgh', '68500--000'])('rejeita o CEP %s', (cep) => {
    expect(mensagens({ ...valido, cep })).toEqual(['cep: Informe o CEP no formato 68500-000.']);
  });

  it('apara espaços dos textos', () => {
    const r = denunciaSchema.parse({ ...valido, logradouro: '  Rua A  ', descricao: ' oi ' });
    expect(r.logradouro).toBe('Rua A');
    expect(r.descricao).toBe('oi');
  });
});

describe('rotuloDoTipo', () => {
  it('traduz os tipos e devolve o próprio valor se for desconhecido', () => {
    expect(rotuloDoTipo('SEM_ENERGIA')).toBe('Sem energia');
    expect(rotuloDoTipo('OSCILACAO')).toBe('Oscilação');
    expect(rotuloDoTipo('X')).toBe('X');
  });
});

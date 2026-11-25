import {
  anuncioDoPasso,
  CAMPOS_DO_PASSO,
  enderecoCompleto,
  passoDoCampo,
  primeiroPassoComErro,
  TITULOS_DOS_PASSOS,
} from './passos';

describe('passos da denúncia', () => {
  it('cada campo do formulário pertence a exatamente um passo', () => {
    const todos = Object.values(CAMPOS_DO_PASSO).flat();
    expect(new Set(todos).size).toBe(todos.length);
    expect(todos.sort()).toEqual(
      ['bairroId', 'cep', 'descricao', 'logradouro', 'pontoReferencia', 'tipo'].sort(),
    );
  });

  it('passoDoCampo acha o passo, ou null para campo desconhecido', () => {
    expect(passoDoCampo('tipo')).toBe(1);
    expect(passoDoCampo('cep')).toBe(2);
    expect(passoDoCampo('descricao')).toBe(3);
    expect(passoDoCampo('qualquerCoisa')).toBeNull();
  });

  it('primeiroPassoComErro devolve o menor passo e ignora campos desconhecidos', () => {
    expect(primeiroPassoComErro(['descricao', 'logradouro'])).toBe(2);
    expect(primeiroPassoComErro(['descricao'])).toBe(3);
    expect(primeiroPassoComErro(['x', 'y'])).toBeNull();
    expect(primeiroPassoComErro([])).toBeNull();
  });

  it('anuncioDoPasso junta "Passo X de 3" e o título', () => {
    expect(anuncioDoPasso(2)).toBe(`Passo 2 de 3: ${TITULOS_DOS_PASSOS[2]}`);
  });

  it('enderecoCompleto exige logradouro com 3+ caracteres (sem espaços) e bairro', () => {
    expect(enderecoCompleto({ logradouro: 'Rua A', bairroId: 1 })).toBe(true);
    expect(enderecoCompleto({ logradouro: '  ab ', bairroId: 1 })).toBe(false);
    expect(enderecoCompleto({ logradouro: 'Rua A' })).toBe(false);
    expect(enderecoCompleto({ bairroId: 1 })).toBe(false);
  });
});

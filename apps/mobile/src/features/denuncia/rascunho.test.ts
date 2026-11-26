import AsyncStorage from '@react-native-async-storage/async-storage';

import { chaveDoRascunho, lerRascunho, limparRascunho, salvarRascunho } from './rascunho';

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('rascunho da denúncia (RNF-008)', () => {
  it('guarda e devolve o que foi digitado', async () => {
    await salvarRascunho('u1', {
      tipo: 'OSCILACAO',
      bairroId: 2,
      logradouro: 'Rua A',
      descricao: 'oi',
    });

    expect(await lerRascunho('u1')).toEqual({
      tipo: 'OSCILACAO',
      bairroId: 2,
      logradouro: 'Rua A',
      descricao: 'oi',
    });
  });

  it('cada usuário tem o seu rascunho', async () => {
    await salvarRascunho('u1', { logradouro: 'Rua da Maria' });

    expect(await lerRascunho('u2')).toBeNull();
  });

  it('formulário vazio apaga o rascunho', async () => {
    await salvarRascunho('u1', { logradouro: 'Rua A' });
    await salvarRascunho('u1', { logradouro: '', cep: '', descricao: '' });

    expect(await AsyncStorage.getItem(chaveDoRascunho('u1'))).toBeNull();
  });

  it('limparRascunho apaga', async () => {
    await salvarRascunho('u1', { logradouro: 'Rua A' });
    await limparRascunho('u1');

    expect(await lerRascunho('u1')).toBeNull();
  });

  it('não guarda coordenadas', async () => {
    await salvarRascunho('u1', {
      logradouro: 'Rua A',
      ...({ latitude: -5, longitude: -49 } as object),
    });

    const texto = (await AsyncStorage.getItem(chaveDoRascunho('u1'))) ?? '';
    expect(texto).not.toMatch(/latitude|longitude/);
  });

  it('descarta valores com formato errado vindos do disco', async () => {
    await AsyncStorage.setItem(
      chaveDoRascunho('u1'),
      JSON.stringify({ tipo: 'APAGAO', bairroId: -1, logradouro: 42, descricao: 'ok', x: 1 }),
    );

    expect(await lerRascunho('u1')).toEqual({ descricao: 'ok' });
  });

  it('JSON corrompido ou valor que não é objeto vira "sem rascunho"', async () => {
    await AsyncStorage.setItem(chaveDoRascunho('u1'), '{quebrado');
    expect(await lerRascunho('u1')).toBeNull();
    await AsyncStorage.setItem(chaveDoRascunho('u1'), '"texto"');
    expect(await lerRascunho('u1')).toBeNull();
  });
});

describe('rascunho e dados sensíveis (S-56)', () => {
  it('guarda a faixa de pessoas', async () => {
    await salvarRascunho('u1', { logradouro: 'Rua A', faixaPessoas: 'DE_9_A_20' });

    expect(await lerRascunho('u1')).toEqual({ logradouro: 'Rua A', faixaPessoas: 'DE_9_A_20' });
  });

  it('NUNCA guarda a necessidade especial nem o consentimento', async () => {
    await salvarRascunho('u1', {
      logradouro: 'Rua A',
      necessidadeEspecial: true,
      consentimentoNecessidade: true,
    });

    const bruto = (await AsyncStorage.getItem(chaveDoRascunho('u1')))!;
    expect(bruto).not.toMatch(/necessidade/i);
    expect(bruto).not.toMatch(/consentimento/i);
    expect(await lerRascunho('u1')).toEqual({ logradouro: 'Rua A' });
  });

  it('ignora necessidade gravada por uma versão antiga ou por fora', async () => {
    await AsyncStorage.setItem(
      chaveDoRascunho('u1'),
      JSON.stringify({ logradouro: 'Rua A', necessidadeEspecial: true, faixaPessoas: 'X' }),
    );

    expect(await lerRascunho('u1')).toEqual({ logradouro: 'Rua A' });
  });
});

// Fica por último: os espiões quebram o AsyncStorage simulado para os testes seguintes.
describe('rascunho com o armazenamento quebrado', () => {
  it('falha do armazenamento nunca lança', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('disco'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('disco'));
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValue(new Error('disco'));

    expect(await lerRascunho('u1')).toBeNull();
    await expect(salvarRascunho('u1', { logradouro: 'Rua A' })).resolves.toBeUndefined();
    await expect(salvarRascunho('u1', {})).resolves.toBeUndefined();
    await expect(limparRascunho('u1')).resolves.toBeUndefined();
  });
});

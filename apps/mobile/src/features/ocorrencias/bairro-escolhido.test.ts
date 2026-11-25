import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  chaveDoBairroEscolhido,
  lerBairroEscolhido,
  limparBairroEscolhido,
  salvarBairroEscolhido,
} from './bairro-escolhido';

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('bairro escolhido em "Trocar" (só no aparelho)', () => {
  it('guarda e devolve o bairro', async () => {
    await salvarBairroEscolhido('u1', 7);

    expect(await lerBairroEscolhido('u1')).toBe(7);
    expect(await AsyncStorage.getItem(chaveDoBairroEscolhido('u1'))).toBe('{"bairroId":7}');
  });

  it('só guarda o id do bairro: nada de nome, coordenadas ou dados da conta', async () => {
    await salvarBairroEscolhido('u1', 7);

    expect(
      Object.keys(JSON.parse((await AsyncStorage.getItem(chaveDoBairroEscolhido('u1')))!)),
    ).toEqual(['bairroId']);
  });

  it('cada usuário tem o seu', async () => {
    await salvarBairroEscolhido('u1', 7);

    expect(await lerBairroEscolhido('u2')).toBeNull();
  });

  it('limpar apaga a escolha', async () => {
    await salvarBairroEscolhido('u1', 7);
    await limparBairroEscolhido('u1');

    expect(await lerBairroEscolhido('u1')).toBeNull();
  });

  it('sem escolha salva, devolve null', async () => {
    expect(await lerBairroEscolhido('u1')).toBeNull();
  });

  it.each([
    ['{"bairroId":0}'],
    ['{"bairroId":-3}'],
    ['{"bairroId":1.5}'],
    ['{"bairroId":"7"}'],
    ['{"outro":7}'],
    ['"texto"'],
    ['null'],
    ['{quebrado'],
  ])('descarta o valor inválido %s lido do disco', async (valor) => {
    await AsyncStorage.setItem(chaveDoBairroEscolhido('u1'), valor);

    expect(await lerBairroEscolhido('u1')).toBeNull();
  });

  it('não grava um id inválido', async () => {
    await salvarBairroEscolhido('u1', 0);
    await salvarBairroEscolhido('u1', 2.5);

    expect(await AsyncStorage.getItem(chaveDoBairroEscolhido('u1'))).toBeNull();
  });

  it('se o armazenamento falhar, nunca lança', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('disco'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('disco'));
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValue(new Error('disco'));

    expect(await lerBairroEscolhido('u1')).toBeNull();
    await expect(salvarBairroEscolhido('u1', 7)).resolves.toBeUndefined();
    await expect(limparBairroEscolhido('u1')).resolves.toBeUndefined();
  });
});

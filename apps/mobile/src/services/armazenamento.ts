import * as SecureStore from 'expo-secure-store';

/** Armazenamento chave-valor assíncrono. Permite trocar o SecureStore por um falso nos testes. */
export type Armazenamento = {
  ler(chave: string): Promise<string | null>;
  gravar(chave: string, valor: string): Promise<void>;
  remover(chave: string): Promise<void>;
};

/** Armazenamento seguro do aparelho (Keychain no iOS, Keystore no Android) para o token (RNF-013). */
export const armazenamentoSeguro: Armazenamento = {
  ler: (chave) => SecureStore.getItemAsync(chave),
  gravar: (chave, valor) => SecureStore.setItemAsync(chave, valor),
  remover: (chave) => SecureStore.deleteItemAsync(chave),
};

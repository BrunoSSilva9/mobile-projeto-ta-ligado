import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query } from '@tanstack/react-query';

/**
 * Cache de leitura salvo no aparelho (ADR-0005): sem rede, o app mostra o último estado de Início,
 * Ocorrências, Detalhe e Minhas denúncias. Só leituras entram; nada de formulário nem de sessão
 * (o rascunho tem o seu próprio armazenamento e o token fica no SecureStore).
 */
export const CHAVE_DO_CACHE = 'taligado.cache';

/** O cache vale por 24 h. Passou disso, é descartado ao abrir o app. */
export const VALIDADE_DO_CACHE_MS = 24 * 60 * 60 * 1000;

/** Mude ao alterar o formato dos dados em cache: o cache antigo é descartado. */
export const VERSAO_DO_CACHE = '1';

/** Quais consultas são salvas (o primeiro item da chave). */
export const CHAVES_PERSISTIDAS = [
  'minhas-denuncias',
  'denuncia',
  'bairros-status',
  'ocorrencias',
  'bairros',
] as const;

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CHAVE_DO_CACHE,
  throttleTime: 1000,
});

/** Só consultas que deram certo e estão na lista permitida são gravadas. */
export function deveSalvar(consulta: Pick<Query, 'queryKey' | 'state'>): boolean {
  return (
    consulta.state.status === 'success' &&
    (CHAVES_PERSISTIDAS as readonly string[]).includes(String(consulta.queryKey[0]))
  );
}

export const opcoesDePersistencia = {
  persister,
  maxAge: VALIDADE_DO_CACHE_MS,
  buster: VERSAO_DO_CACHE,
  dehydrateOptions: { shouldDehydrateQuery: deveSalvar },
};

/** Apaga o cache do aparelho (ao sair da conta: os dados são do usuário que saiu, LGPD). */
export async function limparCachePersistido(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAVE_DO_CACHE);
  } catch {
    // Sem efeito: o cache expira sozinho e é trocado no próximo login.
  }
}

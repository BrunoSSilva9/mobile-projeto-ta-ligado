import { createContext, useContext, type ReactNode } from 'react';

import { useGps, type Gps } from '@/features/denuncia/hooks';

const SEM_LOCALIZACAO: Gps = {
  estado: 'buscando',
  coordenadas: null,
  endereco: null,
  bairroSugerido: null,
  podePedirDeNovo: true,
  mover: () => undefined,
  tentarDeNovo: () => undefined,
};

const LocalizacaoContext = createContext<Gps>(SEM_LOCALIZACAO);

/** A localização do usuário e o bairro mais próximo (RN-025), lidos uma vez e usados na Home e em Ocorrências. */
export const useLocalizacaoAtual = () => useContext(LocalizacaoContext);

/** Busca o GPS ao entrar na área logada (a permissão só é pedida "ao usar o app"). */
export function LocalizacaoProvider({ children }: { children: ReactNode }) {
  const gps = useGps();
  return <LocalizacaoContext.Provider value={gps}>{children}</LocalizacaoContext.Provider>;
}

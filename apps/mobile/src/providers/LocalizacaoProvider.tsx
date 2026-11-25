import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useGps, type Gps } from '@/features/denuncia/hooks';
import {
  limparBairroEscolhido,
  lerBairroEscolhido,
  salvarBairroEscolhido,
} from '@/features/ocorrencias/bairro-escolhido';
import { useSessao } from '@/store/session';

/** A localização pelo GPS mais o bairro que o usuário escolheu à mão (só no aparelho). */
export type Localizacao = Gps & {
  /** Bairro escolhido em "Trocar", ou `null` para usar a localização do celular. */
  bairroEscolhidoId: number | null;
  /** `true` depois de ler a escolha salva (evita mostrar o bairro do GPS por um instante). */
  bairroEscolhidoLido: boolean;
  escolherBairro: (bairroId: number) => void;
  /** Volta a usar o bairro achado pela localização do celular. */
  usarMinhaLocalizacao: () => void;
};

const SEM_LOCALIZACAO: Localizacao = {
  estado: 'buscando',
  coordenadas: null,
  endereco: null,
  bairroSugerido: null,
  podePedirDeNovo: true,
  mover: () => undefined,
  tentarDeNovo: () => undefined,
  bairroEscolhidoId: null,
  bairroEscolhidoLido: true,
  escolherBairro: () => undefined,
  usarMinhaLocalizacao: () => undefined,
};

const LocalizacaoContext = createContext<Localizacao>(SEM_LOCALIZACAO);

/** A localização do usuário e o bairro mais próximo (RN-025), lidos uma vez e usados na Início e no Mapa. */
export const useLocalizacaoAtual = () => useContext(LocalizacaoContext);

/** Busca o GPS ao entrar na área logada (a permissão só é pedida "ao usar o app") e lê o bairro escolhido. */
export function LocalizacaoProvider({ children }: { children: ReactNode }) {
  const gps = useGps();
  const usuarioId = useSessao((s) => s.usuario?.id);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [lido, setLido] = useState(false);

  useEffect(() => {
    let ativo = true;
    void (usuarioId ? lerBairroEscolhido(usuarioId) : Promise.resolve(null)).then((id) => {
      if (!ativo) return;
      setEscolhido(id);
      setLido(true);
    });
    return () => {
      ativo = false;
    };
  }, [usuarioId]);

  const escolherBairro = useCallback(
    (bairroId: number) => {
      setEscolhido(bairroId);
      if (usuarioId) void salvarBairroEscolhido(usuarioId, bairroId);
    },
    [usuarioId],
  );

  const usarMinhaLocalizacao = useCallback(() => {
    setEscolhido(null);
    if (usuarioId) void limparBairroEscolhido(usuarioId);
  }, [usuarioId]);

  return (
    <LocalizacaoContext.Provider
      value={{
        ...gps,
        bairroEscolhidoId: escolhido,
        bairroEscolhidoLido: lido,
        escolherBairro,
        usarMinhaLocalizacao,
      }}
    >
      {children}
    </LocalizacaoContext.Provider>
  );
}

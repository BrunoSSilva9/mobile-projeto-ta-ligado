import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  bairroMaisProximo,
  criarDenuncia,
  listarBairros,
  type BairroProximo,
  type Coordenadas,
} from './api';
import { obterLocalizacao, type ResultadoDaLocalizacao } from './localizacao';
import type { DadosDaDenuncia } from './schemas';

/** A lista de bairros é fixa (RN-021): pode ficar em cache por bastante tempo. */
export function useBairros() {
  return useQuery({
    queryKey: ['bairros'],
    queryFn: listarBairros,
    staleTime: 60 * 60 * 1000,
  });
}

/** Envia a denúncia. Nunca repete sozinho (para não duplicar); atualiza as listas que dependem dela. */
export function useCriarDenuncia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entrada: { dados: DadosDaDenuncia; coordenadas: Coordenadas | null }) =>
      criarDenuncia(entrada.dados, entrada.coordenadas),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['minhas-denuncias'] }),
        queryClient.invalidateQueries({ queryKey: ['ocorrencias'] }),
        queryClient.invalidateQueries({ queryKey: ['bairros-status'] }),
      ]),
  });
}

export type EstadoDoGps = 'buscando' | ResultadoDaLocalizacao['estado'];

export type Gps = {
  estado: EstadoDoGps;
  coordenadas: Coordenadas | null;
  /** Logradouro sugerido pelo endereço do GPS. */
  endereco: string | null;
  /** Bairro de centro mais próximo (RN-025), se houver. */
  bairroSugerido: BairroProximo | null;
  podePedirDeNovo: boolean;
  /** O usuário moveu o pino no mapa (decisão S-23). */
  mover: (coordenadas: Coordenadas) => void;
  tentarDeNovo: () => void;
};

/**
 * Busca a localização ao abrir o formulário (e de novo, se o usuário pedir). O estado diz o que
 * mostrar; coordenadas e bairro sugerido só existem quando o GPS respondeu.
 */
export function useGps(): Gps {
  const [estado, setEstado] = useState<EstadoDoGps>('buscando');
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);
  const [bairroSugerido, setBairroSugerido] = useState<BairroProximo | null>(null);
  const [podePedirDeNovo, setPodePedirDeNovo] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const geracao = useRef(0);

  const sugerirBairro = useCallback(async (posicao: Coordenadas) => {
    const minha = geracao.current;
    try {
      const achado = await bairroMaisProximo(posicao);
      if (minha === geracao.current) setBairroSugerido(achado);
    } catch {
      // Sem a sugestão, o usuário escolhe o bairro na lista.
    }
  }, []);

  useEffect(() => {
    const minha = ++geracao.current;
    const contador = geracao;
    void obterLocalizacao().then((resultado) => {
      if (minha !== contador.current) return; // a tela fechou ou o usuário tentou de novo
      setEstado(resultado.estado);
      if (resultado.estado === 'ok') {
        setCoordenadas(resultado.coordenadas);
        setEndereco(resultado.endereco);
        void sugerirBairro(resultado.coordenadas);
      } else if (resultado.estado === 'negada') {
        setPodePedirDeNovo(resultado.podePedirDeNovo);
      }
    });
    return () => {
      contador.current++; // invalida respostas que chegarem depois de sair
    };
  }, [tentativa, sugerirBairro]);

  return {
    estado,
    coordenadas,
    endereco,
    bairroSugerido,
    podePedirDeNovo,
    mover: (nova) => {
      setCoordenadas(nova);
      void sugerirBairro(nova);
    },
    tentarDeNovo: () => {
      setEstado('buscando');
      setTentativa((n) => n + 1);
    },
  };
}

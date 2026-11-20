import { createContext, useContext } from 'react';

import type { EstadoDaConexao } from '../services/socket';

export type AlertaDeDenuncia = {
  id: string;
  protocolo: string;
  /** "Nova denúncia: Sem energia em Nova Marabá (Folha 28)". */
  texto: string;
};

export type TempoReal = {
  estado: EstadoDaConexao;
  alertas: readonly AlertaDeDenuncia[];
  /** Denúncias recém-chegadas, destacadas na lista por alguns segundos. */
  destaques: ReadonlySet<string>;
  somAtivo: boolean;
  alternarSom: () => void;
  dispensarAlerta: (id: string) => void;
};

export const TempoRealContext = createContext<TempoReal>({
  estado: 'conectando',
  alertas: [],
  destaques: new Set(),
  somAtivo: false,
  alternarSom: () => undefined,
  dispensarAlerta: () => undefined,
});

export const useTempoReal = () => useContext(TempoRealContext);

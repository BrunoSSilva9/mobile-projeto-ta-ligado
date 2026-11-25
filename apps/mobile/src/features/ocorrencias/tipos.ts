import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

/** Status calculado do bairro (RN-007). */
export type StatusDoBairro = 'SEM_LUZ' | 'OSCILACAO' | 'NORMAL';

export type BairroComStatus = {
  bairroId: number;
  nome: string;
  folha: string | null;
  latitude: number;
  longitude: number;
  status: StatusDoBairro;
  emAberto: number;
  previsaoReparo: string | null;
};

export type StatusDosBairros = { atualizadoEm: string; bairros: BairroComStatus[] };

/** Versão pública e anonimizada de uma denúncia (RN-014). Sem protocolo, autor nem detalhes. */
export type OcorrenciaPublica = {
  id: string;
  tipo: 'SEM_ENERGIA' | 'OSCILACAO';
  status: string;
  bairro: string;
  folha: string | null;
  logradouro: string;
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  criadoEm: string;
};

export type TotaisDosChips = {
  todos: number;
  semLuz: number;
  oscilacao: number;
  restabelecidos: number;
};

export type ListaDeOcorrencias = {
  itens: OcorrenciaPublica[];
  pagina: number;
  total: number;
  totais: TotaisDosChips;
  atualizadoEm: string;
};

/** Os chips da aba Mapa filtram por isso. `undefined` = "Todos". */
export type FiltroPublico = 'SEM_LUZ' | 'OSCILACAO' | 'RESTABELECIDO' | undefined;

/**
 * Os chips da aba Mapa (RF-020), com ícone e texto (a cor nunca é a única pista). `undefined` =
 * "Todos". "Normal" é o filtro `RESTABELECIDO` da API (resolvidas nas últimas 24 h, S-21).
 */
export const CHIPS: readonly {
  valor: FiltroPublico;
  rotulo: string;
  total: keyof TotaisDosChips;
  icone: ComponentProps<typeof Ionicons>['name'];
}[] = [
  { valor: undefined, rotulo: 'Todos', total: 'todos', icone: 'list' },
  { valor: 'SEM_LUZ', rotulo: 'Sem energia', total: 'semLuz', icone: 'flash-off' },
  { valor: 'OSCILACAO', rotulo: 'Oscilando', total: 'oscilacao', icone: 'pulse' },
  { valor: 'RESTABELECIDO', rotulo: 'Normal', total: 'restabelecidos', icone: 'checkmark-circle' },
];

/** Rede Estável = bairro Normal; Instável = Sem luz ou Oscilação (RN-008, decisão S-02). */
export const redeEstavel = (status: StatusDoBairro) => status === 'NORMAL';

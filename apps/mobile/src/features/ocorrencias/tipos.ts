import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors } from '@/theme';

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

export const ROTULOS_DO_STATUS_DO_BAIRRO: Record<StatusDoBairro, string> = {
  SEM_LUZ: 'Sem luz',
  OSCILACAO: 'Oscilação',
  NORMAL: 'Normal',
};

/** Rede Estável = bairro Normal; Instável = Sem luz ou Oscilação (RN-008, decisão S-02). */
export const redeEstavel = (status: StatusDoBairro) => status === 'NORMAL';

/**
 * Cores do selo (fundo e texto com contraste, D-01) e da borda/círculo no mapa (RN-007):
 * vermelho = sem luz, âmbar = oscilação, verde = normal.
 */
export const CORES_DO_STATUS_DO_BAIRRO: Record<
  StatusDoBairro,
  { fundo: string; texto: string; destaque: string }
> = {
  SEM_LUZ: {
    fundo: colors.status.noPowerBg,
    texto: colors.status.noPowerText,
    destaque: colors.status.noPower,
  },
  OSCILACAO: {
    fundo: colors.status.flickerBg,
    texto: colors.status.flickerText,
    destaque: colors.status.flicker,
  },
  NORMAL: {
    fundo: colors.surfaceTint,
    texto: colors.status.restoredText,
    destaque: colors.status.restored,
  },
};

/** Cor de destaque de uma ocorrência: em aberto pelo tipo; resolvida em verde. */
export function corDaOcorrencia(o: Pick<OcorrenciaPublica, 'tipo' | 'status'>): string {
  if (o.status === 'RESOLVIDA') return CORES_DO_STATUS_DO_BAIRRO.NORMAL.destaque;
  return o.tipo === 'SEM_ENERGIA'
    ? CORES_DO_STATUS_DO_BAIRRO.SEM_LUZ.destaque
    : CORES_DO_STATUS_DO_BAIRRO.OSCILACAO.destaque;
}

export const rotuloDaOcorrencia = (o: Pick<OcorrenciaPublica, 'tipo' | 'status'>): string =>
  o.status === 'RESOLVIDA' ? 'Restabelecida' : o.tipo === 'SEM_ENERGIA' ? 'Sem luz' : 'Oscilação';

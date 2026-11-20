export type StatusDaDenuncia =
  'RECEBIDA' | 'EM_ATENDIMENTO' | 'RESOLVIDA' | 'IMPROCEDENTE' | 'CANCELADA';
export type TipoDeDenuncia = 'SEM_ENERGIA' | 'OSCILACAO';

export const ROTULOS_DE_STATUS: Record<StatusDaDenuncia, string> = {
  RECEBIDA: 'Recebida',
  EM_ATENDIMENTO: 'Em atendimento',
  RESOLVIDA: 'Resolvida',
  IMPROCEDENTE: 'Improcedente',
  CANCELADA: 'Cancelada',
};

export const ROTULOS_DE_TIPO: Record<TipoDeDenuncia, string> = {
  SEM_ENERGIA: 'Sem energia',
  OSCILACAO: 'Oscilação',
};

export const rotuloDoStatus = (s: string) => ROTULOS_DE_STATUS[s as StatusDaDenuncia] ?? s;
export const rotuloDoTipo = (t: string) => ROTULOS_DE_TIPO[t as TipoDeDenuncia] ?? t;

export const statusEmAberto = (s: string) => s === 'RECEBIDA' || s === 'EM_ATENDIMENTO';

/** Um item da lista do painel (`GET /painel/denuncias`). */
export type DenunciaDoPainel = {
  id: string;
  protocolo: string;
  prioritaria: boolean;
  tipo: TipoDeDenuncia;
  status: StatusDaDenuncia;
  bairro: { id: number; nome: string; folha: string | null };
  logradouro: string;
  latitude: number | null;
  longitude: number | null;
  previsaoReparo: string | null;
  criadoEm: string;
};

export type ListaDoPainel = { itens: DenunciaDoPainel[]; pagina: number; total: number };

export type Bairro = { id: number; nome: string; folha: string | null };

export const nomeDoBairro = (b: { nome: string; folha: string | null }) =>
  b.folha ? `${b.nome} (${b.folha})` : b.nome;

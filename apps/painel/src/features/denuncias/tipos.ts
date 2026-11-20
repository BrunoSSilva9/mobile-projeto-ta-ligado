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

export type EntradaDoHistorico = {
  statusAnterior: StatusDaDenuncia | null;
  statusNovo: StatusDaDenuncia;
  papel: 'CIDADAO' | 'OPERADOR';
  /** Nome de quem alterou. */
  por: string;
  justificativa: string | null;
  criadoEm: string;
};

/** `GET /painel/denuncias/:id` (RF-030). */
export type DetalheDoPainel = {
  id: string;
  protocolo: string;
  prioritaria: boolean;
  tipo: TipoDeDenuncia;
  status: StatusDaDenuncia;
  autor: { id: string; nome: string; telefone: string | null } | null;
  logradouro: string;
  cep: string | null;
  pontoReferencia: string | null;
  bairro: { id: number; nome: string; folha: string | null };
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  faixaPessoas: string | null;
  necessidadeEspecial: boolean;
  detalheNecessidade: string | null;
  previsaoReparo: string | null;
  justificativa: string | null;
  historico: EntradaDoHistorico[];
  criadoEm: string;
  atualizadoEm: string;
  finalizadaEm: string | null;
};

/** Evento `denuncia:criada` (docs/10-api.md). */
export type EventoDeCriacao = {
  id: string;
  protocolo: string;
  prioritaria: boolean;
  tipo: TipoDeDenuncia;
  status: StatusDaDenuncia;
  bairro: { id: number; nome: string; folha: string | null };
  logradouro: string;
  latitude: number | null;
  longitude: number | null;
  criadoEm: string;
};

/** Evento `denuncia:status-atualizado`. */
export type EventoDeStatus = {
  id: string;
  status: StatusDaDenuncia;
  previsaoReparo: string | null;
};

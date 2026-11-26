import { http } from '@/services/api';
import type { StatusDaDenuncia } from './status';

export type DenunciaResumo = {
  id: string;
  protocolo: string;
  tipo: string;
  status: StatusDaDenuncia;
  bairro: string;
  folha: string | null;
  criadoEm: string;
  previsaoReparo: string | null;
};

export type MinhasDenuncias = { itens: DenunciaResumo[]; pagina: number; total: number };

export type EntradaDoHistorico = {
  statusAnterior: StatusDaDenuncia | null;
  statusNovo: StatusDaDenuncia;
  /** "Você" ou "Equatorial Pará". */
  por: string;
  justificativa?: string | null;
  criadoEm: string;
};

export type DenunciaDetalhe = {
  id: string;
  protocolo: string;
  tipo: string;
  status: StatusDaDenuncia;
  logradouro: string;
  cep: string | null;
  pontoReferencia: string | null;
  bairro: { id: number; nome: string; folha: string | null };
  descricao: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Faixa de pessoas no local (RF-010), se informada. */
  faixaPessoas?: string | null;
  /** Sim/Não ou nula (não informada, ou apagada ao encerrar a denúncia: RN-026). */
  necessidadeEspecial?: boolean | null;
  previsaoReparo: string | null;
  justificativa: string | null;
  /** Fotos enviadas (RF-009): `url` é a rota autenticada da API. */
  fotos?: { id: string; url: string }[];
  historico: EntradaDoHistorico[];
  criadoEm: string;
  atualizadoEm: string;
};

/** Evento `denuncia:status-atualizado` (docs/10-api.md). */
export type EventoDeStatus = {
  id: string;
  protocolo: string;
  statusAnterior: StatusDaDenuncia;
  status: StatusDaDenuncia;
  previsaoReparo: string | null;
  justificativa: string | null;
  alteradoEm: string;
  por: string;
};

/** RF-013. O MVP traz até 50 de uma vez (cada cidadão tem poucas; paginação fica para depois). */
export function listarMinhasDenuncias(): Promise<MinhasDenuncias> {
  return http.get<MinhasDenuncias>('/denuncias/minhas', { limite: 50 });
}

/** RF-014, RF-036. */
export function obterDenuncia(id: string): Promise<DenunciaDetalhe> {
  return http.get<DenunciaDetalhe>(`/denuncias/${encodeURIComponent(id)}`);
}

/** RF-015, RN-005: o autor cancela a denúncia enquanto ela está `RECEBIDA`. Devolve o detalhe atualizado. */
export function cancelarDenuncia(id: string): Promise<DenunciaDetalhe> {
  return http.post<DenunciaDetalhe>(`/denuncias/${encodeURIComponent(id)}/cancelar`);
}

import { http } from '../../services/api';
import { montarConsulta, type Filtros } from './consulta';
import type { Bairro, DetalheDoPainel, ListaDoPainel, StatusDaDenuncia } from './tipos';

/** RF-030. */
export const obterDetalhe = (id: string) =>
  http.get<DetalheDoPainel>(`/painel/denuncias/${encodeURIComponent(id)}`);

export type MudancaDeStatus = {
  status: StatusDaDenuncia;
  justificativa?: string;
  previsaoReparo?: string;
};

/** RF-031 a RF-033, RF-036. */
export const atualizarStatus = (id: string, mudanca: MudancaDeStatus) =>
  http.patch<DetalheDoPainel>(`/painel/denuncias/${encodeURIComponent(id)}/status`, mudanca);

/**
 * RF-033, S-60: define, troca ou remove (`null`) só a previsão de reparo, com a denúncia em aberto.
 * Cada mudança vai para o histórico.
 */
export const atualizarPrevisao = (id: string, previsaoReparo: string | null) =>
  http.patch<DetalheDoPainel>(`/painel/denuncias/${encodeURIComponent(id)}/previsao`, {
    previsaoReparo,
  });

/** RF-028, RF-029, RF-035. */
export const listarDenuncias = (filtros: Filtros, pagina = 1) =>
  http.get<ListaDoPainel>('/painel/denuncias', montarConsulta(filtros, pagina));

/** Lista fixa de bairros (RN-021), para o filtro. */
export async function listarBairros(): Promise<Bairro[]> {
  const r = await http.get<{ bairros: Bairro[] }>('/bairros');
  return r.bairros;
}

/** Baixa uma foto pela URL que a API devolve (`/api/v1/denuncias/{id}/fotos/{fotoId}`), com o token. */
export const baixarFoto = (url: string) => http.baixar(url.replace(/^\/api\/v1/, ''));

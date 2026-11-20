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

/** RF-028, RF-029, RF-035. */
export const listarDenuncias = (filtros: Filtros, pagina = 1) =>
  http.get<ListaDoPainel>('/painel/denuncias', montarConsulta(filtros, pagina));

/** Lista fixa de bairros (RN-021), para o filtro. */
export async function listarBairros(): Promise<Bairro[]> {
  const r = await http.get<{ bairros: Bairro[] }>('/bairros');
  return r.bairros;
}

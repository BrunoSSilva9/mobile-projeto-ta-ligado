import { http } from '../../services/api';
import { montarConsulta, type Filtros } from './consulta';
import type { Bairro, ListaDoPainel } from './tipos';

/** RF-028, RF-029, RF-035. */
export const listarDenuncias = (filtros: Filtros, pagina = 1) =>
  http.get<ListaDoPainel>('/painel/denuncias', montarConsulta(filtros, pagina));

/** Lista fixa de bairros (RN-021), para o filtro. */
export async function listarBairros(): Promise<Bairro[]> {
  const r = await http.get<{ bairros: Bairro[] }>('/bairros');
  return r.bairros;
}

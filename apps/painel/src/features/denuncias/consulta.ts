import type { StatusDaDenuncia, TipoDeDenuncia } from './tipos';

/** Filtros da tela. `abertas` é o atalho "Recebida + Em atendimento". */
export type FiltroDeStatus = 'ABERTAS' | 'TODOS' | StatusDaDenuncia;

export type Filtros = {
  status: FiltroDeStatus;
  tipo: '' | TipoDeDenuncia;
  bairroId: '' | number;
  prioritarias: boolean;
};

/** Ao abrir, o operador vê o que ainda precisa de ação. */
export const FILTROS_INICIAIS: Filtros = {
  status: 'ABERTAS',
  tipo: '',
  bairroId: '',
  prioritarias: false,
};

export const LIMITE_POR_PAGINA = 100;

export const filtrosSaoOsIniciais = (f: Filtros) =>
  f.status === FILTROS_INICIAIS.status && f.tipo === '' && f.bairroId === '' && !f.prioritarias;

/** Monta os parâmetros do `GET /painel/denuncias` (docs/10-api.md). Só envia o que está filtrado. */
export function montarConsulta(
  filtros: Filtros,
  pagina = 1,
): Record<string, string | number | boolean> {
  return {
    ...(filtros.status === 'ABERTAS'
      ? { status: 'RECEBIDA,EM_ATENDIMENTO' }
      : filtros.status !== 'TODOS'
        ? { status: filtros.status }
        : {}),
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    ...(filtros.bairroId !== '' ? { bairroId: filtros.bairroId } : {}),
    ...(filtros.prioritarias ? { prioritarias: true } : {}),
    page: pagina,
    limite: LIMITE_POR_PAGINA,
  };
}

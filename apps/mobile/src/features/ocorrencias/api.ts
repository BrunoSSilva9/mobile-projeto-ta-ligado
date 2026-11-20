import { http } from '@/services/api';
import type { FiltroPublico, ListaDeOcorrencias, StatusDosBairros } from './tipos';

/** RF-019, RF-023: status calculado de cada bairro. */
export const listarStatusDosBairros = () => http.get<StatusDosBairros>('/bairros/status');

/** Quantas ocorrências a tela traz de uma vez (a lista pública do MVP não tem "ver mais"). */
export const LIMITE_DA_LISTA = 50;

/** RF-019 a RF-021: lista pública anonimizada, com os totais dos chips. */
export const listarOcorrencias = (filtro: { status: FiltroPublico; q: string }) =>
  http.get<ListaDeOcorrencias>('/ocorrencias', {
    status: filtro.status,
    q: filtro.q.trim() || undefined,
    limite: LIMITE_DA_LISTA,
  });

import type { StatusDenuncia, TipoDenuncia } from '../domain';

/** Dados de uma denúncia recém-criada, como o painel precisa (docs/10-api.md, `denuncia:criada`). */
export type DenunciaCriadaEvento = {
  id: string;
  protocolo: string;
  tipo: TipoDenuncia;
  status: StatusDenuncia;
  prioritaria: boolean;
  bairro: { id: number; nome: string };
  logradouro: string;
  latitude: number | null;
  longitude: number | null;
  autor: { id: string; nome: string; telefone: string | null };
  criadoEm: Date;
};

/**
 * Porta de saída dos eventos em tempo real (ADR-0002).
 * Os serviços chamam o publicador **depois do commit**. O Passo 4 troca o `publicadorNulo` pela
 * implementação com Socket.IO; até lá nada é emitido.
 */
export interface Publicador {
  denunciaCriada(denuncia: DenunciaCriadaEvento): void | Promise<void>;
}

export const publicadorNulo: Publicador = {
  denunciaCriada: () => undefined,
};

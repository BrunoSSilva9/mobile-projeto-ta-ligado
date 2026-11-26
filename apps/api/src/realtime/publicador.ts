import type { StatusDenuncia, DenunciaParaProjecao } from '../domain';

/**
 * Fotografia de uma denúncia no momento do evento: tudo o que a visão pública e a do painel
 * precisam, já com coordenadas como número. É montada **depois do commit**.
 */
export type DenunciaSnapshot = DenunciaParaProjecao & {
  protocolo: string;
  /** Necessidade especial = Sim (RN-015). */
  prioritaria: boolean;
  autorId: string | null;
  previsaoReparo: Date | null;
  justificativa: string | null;
};

/** Denúncia recém-criada: o snapshot mais os dados do autor (que só o painel recebe). */
export type DenunciaCriadaEvento = DenunciaParaProjecao & {
  protocolo: string;
  prioritaria: boolean;
  autor: { id: string; nome: string; telefone: string | null };
};

/** Mudança de status ou de previsão feita pela operadora (Passo 5). */
export type StatusAtualizadoEvento = {
  denuncia: DenunciaSnapshot;
  statusAnterior: StatusDenuncia;
  alteradoEm: Date;
  /** Quem alterou, como o cidadão vê: "Equatorial Pará". */
  por: string;
};

/**
 * Porta de saída dos eventos em tempo real (ADR-0002).
 * Os serviços chamam o publicador **depois do commit** e tratam qualquer falha por conta própria
 * (uma falha ao emitir nunca desfaz nem falha a operação).
 */
export interface Publicador {
  denunciaCriada(denuncia: DenunciaCriadaEvento): void | Promise<void>;
  statusAtualizado(evento: StatusAtualizadoEvento): void | Promise<void>;
  /**
   * Derruba as conexões abertas de um usuário (exclusão de conta, S-50). Opcional: quem não tem
   * Socket.IO (testes sem tempo real) não precisa implementar.
   */
  desconectarUsuario?(usuarioId: string): void | Promise<void>;
}

/** Não emite nada. Usado quando não há Socket.IO (testes sem tempo real). */
export const publicadorNulo: Publicador = {
  denunciaCriada: () => undefined,
  statusAtualizado: () => undefined,
};

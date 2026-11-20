/**
 * Nomes dos eventos e das salas do Socket.IO (docs/10-api.md, ADR-0002).
 * O app e o painel têm cópia destes nomes (decisão S-32); ao mudar aqui, atualize lá.
 */
export const EVENTOS = {
  /** Painel: chegou uma denúncia nova (dados completos). */
  denunciaCriada: 'denuncia:criada',
  /** Autor e painel: o status (ou a previsão) da denúncia mudou. */
  statusAtualizado: 'denuncia:status-atualizado',
  /** Cidadãos: criação ou mudança de uma ocorrência, na versão pública anonimizada. */
  ocorrenciaAtualizada: 'ocorrencia:atualizada',
  /** Cidadãos: o status calculado de um bairro foi recalculado. */
  bairroStatusAtualizado: 'bairro:status-atualizado',
} as const;

export const SALAS = {
  /** Todos os operadores conectados. */
  operadores: 'papel:OPERADOR',
  /** Todos os cidadãos conectados (eventos públicos, sem dado pessoal). */
  cidadaos: 'cidadaos',
  /** Eventos privados de um cidadão (as próprias denúncias). */
  usuario: (usuarioId: string) => `usuario:${usuarioId}`,
} as const;

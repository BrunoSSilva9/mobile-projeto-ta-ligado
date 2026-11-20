import { estaEmAberto, type StatusDenuncia } from './tipos';

/**
 * Limite de denúncias (RN-006): cada cidadão pode ter no máximo UMA denúncia em aberto
 * (RECEBIDA ou EM_ATENDIMENTO). Recebe o status de todas as denúncias do autor.
 *
 * No banco, a regra também é garantida por um índice único parcial (migration `init`),
 * que protege contra duas requisições simultâneas.
 */
export function podeCriarDenuncia(statusDasDenunciasDoAutor: readonly StatusDenuncia[]): boolean {
  return !statusDasDenunciasDoAutor.some(estaEmAberto);
}

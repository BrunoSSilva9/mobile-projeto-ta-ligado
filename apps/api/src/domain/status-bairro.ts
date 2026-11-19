import { estaEmAberto, type StatusBairro, type StatusDenuncia, type TipoDenuncia } from './tipos';

export type DenunciaParaStatus = {
  tipo: TipoDenuncia;
  status: StatusDenuncia;
};

/**
 * Status do bairro (RN-007), a partir das denúncias do bairro.
 * Só contam as denúncias em aberto (RECEBIDA ou EM_ATENDIMENTO), nesta precedência:
 *  1. ao menos uma SEM_ENERGIA  => SEM_LUZ
 *  2. senão, há denúncias (todas OSCILACAO) => OSCILACAO
 *  3. senão => NORMAL
 */
export function calcularStatusBairro(denuncias: readonly DenunciaParaStatus[]): StatusBairro {
  const emAberto = denuncias.filter((d) => estaEmAberto(d.status));

  if (emAberto.some((d) => d.tipo === 'SEM_ENERGIA')) return 'SEM_LUZ';
  if (emAberto.length > 0) return 'OSCILACAO';
  return 'NORMAL';
}

/** Selo da Home (RN-008): "Rede Estável" quando o bairro está NORMAL; senão "Instável". */
export function redeEstavel(statusBairro: StatusBairro): boolean {
  return statusBairro === 'NORMAL';
}

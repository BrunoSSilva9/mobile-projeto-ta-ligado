import { colors, type SituacaoDaEnergia, type StatusDeAndamento } from '@/theme';

/**
 * Apresentação da situação da energia e do andamento da denúncia (design system v2, R-13).
 * Só texto, ícone e cor: nenhuma regra de negócio mora aqui (o status do bairro continua sendo
 * calculado pela API, RN-007) e `features/denuncia/schemas.ts` não é tocado.
 */

/** Texto de cada situação da energia, na linguagem do dia a dia. */
export const ROTULOS_DA_SITUACAO: Record<SituacaoDaEnergia, string> = {
  semEnergia: 'Sem energia',
  oscilando: 'Oscilando',
  normal: 'Normal',
};

export const rotuloDaSituacao = (s: SituacaoDaEnergia): string => ROTULOS_DA_SITUACAO[s];

export const iconeDaSituacao = (s: SituacaoDaEnergia) => colors.situacao[s].icone;

/** Do status do bairro que a API devolve (`SEM_LUZ`, `OSCILACAO`, `NORMAL`) para a situação do app. */
export function situacaoDoBairro(status: string): SituacaoDaEnergia {
  if (status === 'SEM_LUZ') return 'semEnergia';
  if (status === 'OSCILACAO') return 'oscilando';
  return 'normal';
}

/** Do tipo da denúncia (`SEM_ENERGIA`, `OSCILACAO`) para a situação do app. */
export function situacaoDoTipo(tipo: string): SituacaoDaEnergia {
  return tipo === 'SEM_ENERGIA' ? 'semEnergia' : 'oscilando';
}

/** Texto de cada andamento da denúncia (caixa normal, nunca em maiúsculas). */
export const ROTULOS_DO_ANDAMENTO: Record<StatusDeAndamento, string> = {
  RECEBIDA: 'Recebida',
  EM_ATENDIMENTO: 'Em atendimento',
  RESOLVIDA: 'Resolvida',
  IMPROCEDENTE: 'Improcedente',
  CANCELADA: 'Cancelada',
};

/** O andamento correspondente a um status da API, ou `null` se o status for desconhecido. */
export function andamentoDe(status: string): StatusDeAndamento | null {
  return status in ROTULOS_DO_ANDAMENTO ? (status as StatusDeAndamento) : null;
}

/** Texto do status; um valor desconhecido é devolvido como veio. */
export const rotuloDoAndamento = (status: string): string => {
  const andamento = andamentoDe(status);
  return andamento ? ROTULOS_DO_ANDAMENTO[andamento] : status;
};

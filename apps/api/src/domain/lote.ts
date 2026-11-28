import { estaEmAberto, type StatusDenuncia, type TipoDenuncia } from './tipos';

/** O que o domínio precisa saber de cada denúncia para montar o resumo por bairro. */
export type DenunciaParaResumo = {
  bairroId: number;
  nome: string;
  folha: string | null;
  tipo: TipoDenuncia;
  status: StatusDenuncia;
  /** Necessidade especial = Sim (RN-015). */
  prioritaria: boolean;
};

export type ResumoDoBairro = {
  bairroId: number;
  nome: string;
  folha: string | null;
  /** Denúncias em aberto (`RECEBIDA` ou `EM_ATENDIMENTO`) do bairro. */
  emAberto: number;
  porTipo: Record<TipoDenuncia, number>;
  porStatus: { RECEBIDA: number; EM_ATENDIMENTO: number };
  prioritarias: number;
};

/** Sem acento e sem diferença de caixa, para ordenar nomes como as pessoas esperam. */
const chave = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Visão agrupada por bairro do painel (RF-034, RN-016): para cada bairro com denúncias **em aberto**,
 * quantas são por tipo e por status e quantas são prioritárias. As encerradas não entram, e um
 * bairro sem nenhuma em aberto não aparece (não há o que resolver). Ordem: mais prioritárias
 * primeiro, depois mais denúncias em aberto e, por fim, o nome (A a Z).
 */
export function resumirPorBairro(denuncias: readonly DenunciaParaResumo[]): ResumoDoBairro[] {
  const porBairro = new Map<number, ResumoDoBairro>();

  for (const denuncia of denuncias) {
    if (!estaEmAberto(denuncia.status)) continue;
    let resumo = porBairro.get(denuncia.bairroId);
    if (!resumo) {
      resumo = {
        bairroId: denuncia.bairroId,
        nome: denuncia.nome,
        folha: denuncia.folha,
        emAberto: 0,
        porTipo: { SEM_ENERGIA: 0, OSCILACAO: 0 },
        porStatus: { RECEBIDA: 0, EM_ATENDIMENTO: 0 },
        prioritarias: 0,
      };
      porBairro.set(denuncia.bairroId, resumo);
    }
    resumo.emAberto += 1;
    resumo.porTipo[denuncia.tipo] += 1;
    resumo.porStatus[denuncia.status as 'RECEBIDA' | 'EM_ATENDIMENTO'] += 1;
    if (denuncia.prioritaria) resumo.prioritarias += 1;
  }

  return [...porBairro.values()].sort(
    (a, b) =>
      b.prioritarias - a.prioritarias ||
      b.emAberto - a.emAberto ||
      chave(a.nome).localeCompare(chave(b.nome)),
  );
}

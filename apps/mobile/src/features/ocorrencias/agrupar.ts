import type { SituacaoDaEnergia } from '@/theme';
import { situacaoDoTipo } from '@/features/situacao';
import type { BairroComStatus, OcorrenciaPublica } from './tipos';

/** Um lugar com aviso: todas as ocorrências de um mesmo bairro (e folha), juntas. */
export type LugarComAviso = {
  /** Bairro + folha: identifica o lugar. */
  chave: string;
  nome: string;
  folha: string | null;
  /** A situação **mais grave** entre os avisos do lugar (Sem energia > Oscilando > Normal). */
  situacao: SituacaoDaEnergia;
  /** Quantos avisos o lugar tem na lista. */
  avisos: number;
  /** Data (ISO) do aviso **mais recente** do lugar: dela sai o "Há X min". */
  maisRecente: string;
  /** Centro do bairro (de `/bairros/status`), para o "Ver" centralizar o mapa; `null` se não houver. */
  centro: { latitude: number; longitude: number } | null;
};

/** Do mais grave (0) ao menos grave: a mesma precedência do status do bairro (RN-007). */
const GRAVIDADE: Record<SituacaoDaEnergia, number> = { semEnergia: 0, oscilando: 1, normal: 2 };

/** A situação de um aviso: resolvido vale como Normal; em aberto, pelo tipo da denúncia. */
export function situacaoDoAviso(o: Pick<OcorrenciaPublica, 'tipo' | 'status'>): SituacaoDaEnergia {
  return o.status === 'RESOLVIDA' ? 'normal' : situacaoDoTipo(o.tipo);
}

const chaveDoLugar = (nome: string, folha: string | null) => `${nome}|${folha ?? ''}`;

/**
 * Agrupa as ocorrências públicas por bairro, **no app**, sem mudar a API (decisão R-03).
 *
 * - a situação do lugar é a mais grave entre os seus avisos;
 * - "Há X min" conta a partir do aviso mais recente;
 * - ordem: situação mais grave primeiro e, empatando, o aviso mais recente primeiro.
 */
export function agruparPorBairro(
  ocorrencias: readonly OcorrenciaPublica[],
  bairros: readonly Pick<BairroComStatus, 'nome' | 'folha' | 'latitude' | 'longitude'>[] = [],
): LugarComAviso[] {
  const centros = new Map(
    bairros.map((b) => [
      chaveDoLugar(b.nome, b.folha),
      { latitude: b.latitude, longitude: b.longitude },
    ]),
  );

  const lugares = new Map<string, LugarComAviso>();
  for (const o of ocorrencias) {
    const chave = chaveDoLugar(o.bairro, o.folha);
    const situacao = situacaoDoAviso(o);
    const atual = lugares.get(chave);
    if (!atual) {
      lugares.set(chave, {
        chave,
        nome: o.bairro,
        folha: o.folha,
        situacao,
        avisos: 1,
        maisRecente: o.criadoEm,
        centro: centros.get(chave) ?? null,
      });
      continue;
    }
    atual.avisos += 1;
    if (GRAVIDADE[situacao] < GRAVIDADE[atual.situacao]) atual.situacao = situacao;
    if (Date.parse(o.criadoEm) > Date.parse(atual.maisRecente)) atual.maisRecente = o.criadoEm;
  }

  return [...lugares.values()].sort(
    (a, b) =>
      GRAVIDADE[a.situacao] - GRAVIDADE[b.situacao] ||
      Date.parse(b.maisRecente) - Date.parse(a.maisRecente) ||
      a.chave.localeCompare(b.chave),
  );
}

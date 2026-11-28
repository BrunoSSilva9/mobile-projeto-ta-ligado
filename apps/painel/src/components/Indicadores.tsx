import { useQuery } from '@tanstack/react-query';

import { obterIndicadores } from '../features/denuncias/api';
import { CHAVE_INDICADORES } from '../features/denuncias/cache';

const numero = (n: number) => n.toLocaleString('pt-BR');
const porcentagem = (taxa: number) => `${Math.round(taxa * 100)}%`;

/**
 * Indicadores dos últimos 30 dias (P-02, RF-018, RN-017, S-52): usuários cadastrados, denúncias
 * registradas, em atendimento agora e resolvidas (com a taxa de resolução). Atualiza com os
 * eventos em tempo real. Se não carregar, mostra um aviso e não atrapalha o resto do painel.
 */
export function Indicadores() {
  const consulta = useQuery({ queryKey: CHAVE_INDICADORES, queryFn: obterIndicadores });

  if (consulta.isPending) {
    return (
      <p className="muted" role="status">
        Carregando indicadores…
      </p>
    );
  }
  if (consulta.isError) {
    return (
      <p className="muted" role="alert">
        Não foi possível carregar os indicadores.{' '}
        <button
          type="button"
          className="botao botao--secundario"
          onClick={() => void consulta.refetch()}
        >
          Tentar novamente
        </button>
      </p>
    );
  }

  const i = consulta.data;
  const itens = [
    { rotulo: 'Usuários cadastrados', valor: numero(i.usuariosCadastrados) },
    { rotulo: 'Denúncias registradas', valor: numero(i.denunciasRegistradas) },
    { rotulo: 'Em atendimento', valor: numero(i.emAtendimento) },
    {
      rotulo: 'Resolvidas',
      valor: numero(i.resolvidas),
      detalhe: `Taxa de resolução: ${porcentagem(i.taxaResolucao)}`,
    },
  ];

  return (
    <section aria-label={`Indicadores dos últimos ${i.periodoDias} dias`}>
      <p className="muted">Últimos {i.periodoDias} dias</p>
      <dl className="indicadores">
        {itens.map((item) => (
          <div key={item.rotulo} className="indicador">
            <dt>{item.rotulo}</dt>
            <dd>{item.valor}</dd>
            {item.detalhe ? <dd className="muted">{item.detalhe}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Filtros } from '../components/Filtros';
import { MapaDenuncias } from '../components/MapaDenuncias';
import { PorBairro } from '../components/PorBairro';
import { TabelaDenuncias } from '../components/TabelaDenuncias';
import { listarBairros, listarDenuncias } from '../features/denuncias/api';
import { useAgora } from '../features/denuncias/useAgora';
import { useTempoReal } from '../providers/tempo-real-contexto';
import {
  FILTROS_INICIAIS,
  LIMITE_POR_PAGINA,
  type Filtros as FiltrosDaTela,
} from '../features/denuncias/consulta';

type Aba = 'lista' | 'mapa' | 'bairro';

const ROTULOS_DAS_ABAS: Record<Aba, string> = {
  lista: 'Lista',
  mapa: 'Mapa',
  bairro: 'Por bairro',
};

/** P-02 (parte 1): filtros e abas Lista e Mapa (RF-028, RF-029). Tempo real e alertas: Passo 10. */
export function PainelPage() {
  const [filtros, setFiltros] = useState<FiltrosDaTela>(FILTROS_INICIAIS);
  const [pagina, setPagina] = useState(1);
  const [aba, setAba] = useState<Aba>('lista');
  const agora = useAgora();
  const { destaques } = useTempoReal();

  const bairros = useQuery({ queryKey: ['bairros'], queryFn: listarBairros, staleTime: 3_600_000 });
  const denuncias = useQuery({
    queryKey: ['painel-denuncias', filtros, pagina],
    queryFn: () => listarDenuncias(filtros, pagina),
    placeholderData: (anterior) => anterior,
  });

  const alterarFiltros = (novos: FiltrosDaTela) => {
    setFiltros(novos);
    setPagina(1); // outro filtro, outra lista: volta à primeira página
  };

  const total = denuncias.data?.total ?? 0;
  const totalDePaginas = Math.max(1, Math.ceil(total / LIMITE_POR_PAGINA));

  return (
    <main className="painel">
      <h1>Denúncias</h1>

      {/* Os filtros valem para a lista e o mapa; "Por bairro" já agrupa por bairro. */}
      {aba !== 'bairro' ? (
        <Filtros filtros={filtros} bairros={bairros.data ?? []} onAlterar={alterarFiltros} />
      ) : null}

      <div role="tablist" aria-label="Visualização" className="abas">
        {(['lista', 'mapa', 'bairro'] as const).map((id) => (
          <button
            key={id}
            role="tab"
            id={`aba-${id}`}
            type="button"
            aria-selected={aba === id}
            aria-controls="painel-conteudo"
            className={aba === id ? 'aba aba--ativa' : 'aba'}
            onClick={() => setAba(id)}
          >
            {ROTULOS_DAS_ABAS[id]}
          </button>
        ))}
      </div>

      <section id="painel-conteudo" role="tabpanel" aria-labelledby={`aba-${aba}`}>
        {aba === 'bairro' ? (
          <PorBairro />
        ) : denuncias.isPending ? (
          <p className="estado" role="status">
            Carregando denúncias…
          </p>
        ) : denuncias.isError ? (
          <div className="estado" role="alert">
            <p>{denuncias.error.message}</p>
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => void denuncias.refetch()}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <p className="muted" aria-live="polite">
              {total === 1 ? '1 denúncia' : `${total} denúncias`}
            </p>
            {aba === 'lista' ? (
              <TabelaDenuncias
                denuncias={denuncias.data.itens}
                agoraMs={agora}
                destacadas={destaques}
              />
            ) : (
              <MapaDenuncias denuncias={denuncias.data.itens} />
            )}
            {totalDePaginas > 1 ? (
              <nav className="paginacao" aria-label="Paginação">
                <button
                  type="button"
                  className="botao botao--secundario"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {pagina} de {totalDePaginas}
                </span>
                <button
                  type="button"
                  className="botao botao--secundario"
                  disabled={pagina >= totalDePaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Próxima
                </button>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

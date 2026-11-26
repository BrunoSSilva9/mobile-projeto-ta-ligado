import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { baixarFoto } from '../features/denuncias/api';

type Props = { fotos: readonly { id: string; url: string }[] };

/**
 * Galeria das fotos da denúncia (P-03, RF-009). As fotos só saem por rota autenticada (RNF-015),
 * então cada uma é baixada com o token e mostrada por um endereço temporário do navegador, que é
 * liberado quando a foto sai da tela. Cada imagem tem texto alternativo ("Foto 1 de 3 enviada
 * pelo cidadão") e um aviso quando não carrega, com "Tentar de novo".
 */
export function GaleriaDeFotos({ fotos }: Props) {
  return (
    <ul className="galeria" aria-label="Fotos enviadas pelo cidadão">
      {fotos.map((foto, indice) => (
        <li key={foto.id}>
          <Foto url={foto.url} posicao={indice + 1} total={fotos.length} />
        </li>
      ))}
    </ul>
  );
}

function Foto({ url, posicao, total }: { url: string; posicao: number; total: number }) {
  const consulta = useQuery({
    queryKey: ['painel-foto', url],
    queryFn: () => baixarFoto(url),
    staleTime: Infinity,
  });
  // Endereço temporário da foto no navegador: criado quando ela chega e liberado ao sair da tela.
  const endereco = useMemo(
    () => (consulta.data ? URL.createObjectURL(consulta.data) : null),
    [consulta.data],
  );
  useEffect(() => {
    if (!endereco) return;
    return () => URL.revokeObjectURL(endereco);
  }, [endereco]);

  if (consulta.isError) {
    return (
      <div className="galeria__estado" role="alert">
        <p>Não foi possível carregar a foto {posicao}.</p>
        <button
          type="button"
          className="botao botao--secundario"
          onClick={() => void consulta.refetch()}
        >
          Tentar de novo
        </button>
      </div>
    );
  }
  if (!endereco) return <p className="galeria__estado">Carregando a foto {posicao}…</p>;

  return (
    <img
      className="galeria__foto"
      src={endereco}
      alt={`Foto ${posicao} de ${total} enviada pelo cidadão`}
    />
  );
}

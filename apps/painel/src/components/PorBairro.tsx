import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { listarResumoPorBairro, resolverBairro } from '../features/denuncias/api';
import { CHAVE_BAIRROS, CHAVE_LISTAS } from '../features/denuncias/cache';
import { nomeDoBairro, type ResumoDoBairro } from '../features/denuncias/tipos';
import { DialogoConfirmacao } from './DialogoConfirmacao';

const plural = (n: number, singular: string, pluralDe: string) =>
  `${n} ${n === 1 ? singular : pluralDe}`;

/**
 * Aba "Por bairro" (P-02, RF-034, RN-016): um cartão por bairro com denúncias em aberto (por tipo,
 * por status e prioritárias) e o botão "Resolver todas do bairro", sempre com confirmação. O
 * resultado é anunciado numa região `aria-live`. Atualiza sozinha com os eventos em tempo real.
 */
export function PorBairro() {
  const queryClient = useQueryClient();
  const [alvo, setAlvo] = useState<ResumoDoBairro | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  const resumo = useQuery({ queryKey: CHAVE_BAIRROS, queryFn: listarResumoPorBairro });

  const resolver = useMutation({
    mutationFn: (bairro: ResumoDoBairro) => resolverBairro(bairro.bairroId),
    onSuccess: ({ resolvidas }, bairro) => {
      setAlvo(null);
      setResultado(
        `${plural(resolvidas, 'denúncia resolvida', 'denúncias resolvidas')} em ${nomeDoBairro(bairro)}.`,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAVE_BAIRROS });
      void queryClient.invalidateQueries({ queryKey: CHAVE_LISTAS });
    },
  });

  const abrir = (bairro: ResumoDoBairro) => {
    resolver.reset();
    setResultado(null);
    setAlvo(bairro);
  };
  const fechar = () => {
    resolver.reset();
    setAlvo(null);
  };

  return (
    <div>
      {/* Região sempre presente: o leitor de tela anuncia o texto quando ele muda. */}
      <p className="muted" role="status" aria-live="polite">
        {resultado}
      </p>

      {resumo.isPending ? (
        <p className="estado" role="status">
          Carregando bairros…
        </p>
      ) : resumo.isError ? (
        <div className="estado" role="alert">
          <p>{resumo.error.message}</p>
          <button
            type="button"
            className="botao botao--primario"
            onClick={() => void resumo.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      ) : resumo.data.length === 0 ? (
        <p className="estado">Nenhum bairro com denúncias em aberto.</p>
      ) : (
        <ul className="bairros" aria-label="Bairros com denúncias em aberto">
          {resumo.data.map((b) => (
            <li key={b.bairroId} className="bairro">
              <h2>{nomeDoBairro(b)}</h2>
              <p>
                <strong>{plural(b.emAberto, 'denúncia em aberto', 'denúncias em aberto')}</strong>
                {b.prioritarias > 0
                  ? ` · ${plural(b.prioritarias, 'prioritária', 'prioritárias')}`
                  : ''}
              </p>
              <p className="muted">
                Sem energia: {b.porTipo.SEM_ENERGIA} · Oscilação: {b.porTipo.OSCILACAO}
              </p>
              <p className="muted">
                Recebidas: {b.porStatus.RECEBIDA} · Em atendimento: {b.porStatus.EM_ATENDIMENTO}
              </p>
              <button
                type="button"
                className="botao botao--primario bairro__acao"
                aria-label={`Resolver todas do bairro ${nomeDoBairro(b)}`}
                onClick={() => abrir(b)}
              >
                Resolver todas do bairro
              </button>
            </li>
          ))}
        </ul>
      )}

      {alvo ? (
        <DialogoConfirmacao
          titulo={`Resolver todas do bairro ${nomeDoBairro(alvo)}?`}
          rotuloConfirmar="Resolver todas"
          ocupado={resolver.isPending}
          onCancelar={fechar}
          onConfirmar={() => resolver.mutate(alvo)}
        >
          <p>
            {alvo.emAberto === 1
              ? 'A denúncia em aberto deste bairro será marcada como resolvida'
              : `As ${alvo.emAberto} denúncias em aberto deste bairro serão marcadas como resolvidas`}
            , inclusive as que ainda não foram atendidas. Os cidadãos verão a mudança no app. Esta
            ação não pode ser desfeita.
          </p>
          {resolver.isError ? (
            <p role="alert" className="muted">
              {resolver.error.message}
            </p>
          ) : null}
        </DialogoConfirmacao>
      ) : null}
    </div>
  );
}

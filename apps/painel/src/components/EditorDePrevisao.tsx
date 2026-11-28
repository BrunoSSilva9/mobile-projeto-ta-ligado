import { useState } from 'react';

import { isoParaCampoDeData, previsaoParaIso } from '../features/denuncias/acoes';
import { formatarDataHora } from '../features/denuncias/formatacao';
import { ErroDeApi } from '../services/http';

type Props = {
  /** A previsão de reparo que a denúncia tem agora (ISO 8601), ou `null`. */
  previsao: string | null;
  salvando: boolean;
  erro: Error | null;
  /** Define ou troca (ISO) ou remove (`null`) a previsão. */
  onSalvar: (previsaoReparo: string | null) => void;
};

/**
 * Previsão de reparo (P-03, RF-033, RN-009, S-60): enquanto a denúncia está em aberto, o operador
 * **define, troca ou remove** a previsão. Mostra a atual em texto, um campo de data e hora, "Salvar
 * previsão" e, havendo previsão, "Remover previsão". Data no passado é recusada na tela (e na API).
 * Cada mudança vai para o histórico da denúncia.
 */
export function EditorDePrevisao({ previsao, salvando, erro, onSalvar }: Props) {
  const [valor, setValor] = useState(isoParaCampoDeData(previsao));
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const salvar = () => {
    const iso = previsaoParaIso(valor);
    if (iso === null)
      return setErroLocal('Informe a data e a hora da previsão, ou use "Remover previsão".');
    if (iso === 'passado') return setErroLocal('A previsão de reparo precisa ser uma data futura.');
    if (iso === 'invalida') return setErroLocal('Informe a previsão como data e hora.');
    setErroLocal(null);
    onSalvar(iso);
  };

  const remover = () => {
    setErroLocal(null);
    setValor('');
    onSalvar(null);
  };

  const mensagem =
    erroLocal ??
    (erro instanceof ErroDeApi && erro.codigo === 'TRANSICAO_INVALIDA'
      ? 'O status mudou enquanto você decidia. A tela foi atualizada: confira a situação atual.'
      : (erro?.message ?? null));

  return (
    <div className="acoes">
      <p>
        <strong>Previsão atual:</strong>{' '}
        {previsao ? formatarDataHora(previsao) : 'Sem previsão de reparo'}
      </p>
      <div className="campo">
        <label htmlFor="nova-previsao">Nova previsão de reparo</label>
        <input
          id="nova-previsao"
          type="datetime-local"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-invalid={mensagem !== null}
        />
      </div>
      <div className="acoes__botoes">
        <button
          type="button"
          className="botao botao--primario"
          disabled={salvando}
          onClick={salvar}
        >
          Salvar previsão
        </button>
        {previsao ? (
          <button
            type="button"
            className="botao botao--secundario"
            disabled={salvando}
            onClick={remover}
          >
            Remover previsão
          </button>
        ) : null}
      </div>
      {salvando ? (
        <p className="muted" role="status">
          Salvando…
        </p>
      ) : null}
      {mensagem ? (
        <p className="erro" role="alert">
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}

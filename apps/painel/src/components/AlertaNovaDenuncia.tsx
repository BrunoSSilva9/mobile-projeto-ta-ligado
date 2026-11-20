import { Link } from 'react-router-dom';

import { useTempoReal } from '../providers/tempo-real-contexto';

/**
 * Alerta visual de nova denúncia (RF-027). A região `aria-live` existe sempre (mesmo vazia) para
 * que o leitor de tela anuncie o que entrar nela.
 */
export function AlertaNovaDenuncia() {
  const { alertas, dispensarAlerta } = useTempoReal();

  return (
    <div
      className="alertas"
      role="status"
      aria-live="polite"
      aria-label="Alertas de novas denúncias"
    >
      {alertas.map((a) => (
        <div key={a.id} className="alerta">
          <span className="alerta__texto">
            {a.texto} <span className="muted">({a.protocolo})</span>
          </span>
          <Link className="botao botao--primario" to={`/denuncias/${a.id}`}>
            Abrir
          </Link>
          <button
            type="button"
            className="botao botao--secundario"
            aria-label={`Dispensar alerta ${a.protocolo}`}
            onClick={() => dispensarAlerta(a.id)}
          >
            Dispensar
          </button>
        </div>
      ))}
    </div>
  );
}

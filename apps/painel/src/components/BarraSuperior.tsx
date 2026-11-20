import { encerrarSessao } from '../services/api';
import { useSessao } from '../store/sessao';

/** Barra superior: logo, operador logado e "Sair". Som e indicador de conexão entram no Passo 10. */
export function BarraSuperior() {
  const usuario = useSessao((s) => s.usuario);

  return (
    <header className="topbar">
      <div className="logo" aria-label="Tá Ligado? Painel da Operadora">
        <span className="logo__name">
          Tá Ligado<span className="logo__mark">?</span>
        </span>
        <span className="logo__tagline">Painel da Operadora</span>
      </div>
      <div className="topbar__acoes">
        <span className="muted">{usuario?.nome}</span>
        <button type="button" className="botao botao--secundario" onClick={encerrarSessao}>
          Sair
        </button>
      </div>
    </header>
  );
}

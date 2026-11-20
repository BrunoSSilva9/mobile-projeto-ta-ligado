import { useTempoReal } from '../providers/tempo-real-contexto';
import { encerrarSessao } from '../services/api';
import { useSessao } from '../store/sessao';

const ROTULOS = {
  conectando: 'Conectando…',
  conectado: 'Conectado',
  reconectando: 'Reconectando…',
} as const;

/** Barra superior: logo, conexão em tempo real, som, operador logado e "Sair". */
export function BarraSuperior() {
  const usuario = useSessao((s) => s.usuario);
  const { estado, somAtivo, alternarSom } = useTempoReal();

  return (
    <header className="topbar">
      <div className="logo" aria-label="Tá Ligado? Painel da Operadora">
        <span className="logo__name">
          Tá Ligado<span className="logo__mark">?</span>
        </span>
        <span className="logo__tagline">Painel da Operadora</span>
      </div>
      <div className="topbar__acoes">
        <span
          className={`pill ${estado === 'conectado' ? 'pill--up' : estado === 'reconectando' ? 'pill--down' : ''}`}
          role="status"
          aria-label={`Conexão em tempo real: ${ROTULOS[estado]}`}
        >
          <span className="pill__dot" aria-hidden="true" />
          {ROTULOS[estado]}
        </span>
        <button
          type="button"
          className="botao botao--secundario"
          aria-pressed={somAtivo}
          onClick={alternarSom}
        >
          {somAtivo ? 'Som ativado' : 'Ativar som'}
        </button>
        <span className="muted">{usuario?.nome}</span>
        <button type="button" className="botao botao--secundario" onClick={encerrarSessao}>
          Sair
        </button>
      </div>
    </header>
  );
}

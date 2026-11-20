import {
  filtrosSaoOsIniciais,
  FILTROS_INICIAIS,
  type Filtros as FiltrosDaTela,
  type FiltroDeStatus,
} from '../features/denuncias/consulta';
import {
  nomeDoBairro,
  ROTULOS_DE_STATUS,
  ROTULOS_DE_TIPO,
  type Bairro,
  type StatusDaDenuncia,
  type TipoDeDenuncia,
} from '../features/denuncias/tipos';

type Props = {
  filtros: FiltrosDaTela;
  bairros: readonly Bairro[];
  onAlterar: (filtros: FiltrosDaTela) => void;
};

/** Filtros por status, tipo e bairro (RF-029) e atalho de prioritárias (RF-035). */
export function Filtros({ filtros, bairros, onAlterar }: Props) {
  return (
    <form className="filtros" aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
      <div className="campo">
        <label htmlFor="filtro-status">Status</label>
        <select
          id="filtro-status"
          value={filtros.status}
          onChange={(e) => onAlterar({ ...filtros, status: e.target.value as FiltroDeStatus })}
        >
          <option value="ABERTAS">Em aberto</option>
          <option value="TODOS">Todos</option>
          {(Object.keys(ROTULOS_DE_STATUS) as StatusDaDenuncia[]).map((s) => (
            <option key={s} value={s}>
              {ROTULOS_DE_STATUS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-tipo">Tipo</label>
        <select
          id="filtro-tipo"
          value={filtros.tipo}
          onChange={(e) => onAlterar({ ...filtros, tipo: e.target.value as '' | TipoDeDenuncia })}
        >
          <option value="">Todos</option>
          {(Object.keys(ROTULOS_DE_TIPO) as TipoDeDenuncia[]).map((t) => (
            <option key={t} value={t}>
              {ROTULOS_DE_TIPO[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-bairro">Bairro</label>
        <select
          id="filtro-bairro"
          value={filtros.bairroId}
          onChange={(e) =>
            onAlterar({
              ...filtros,
              bairroId: e.target.value === '' ? '' : Number(e.target.value),
            })
          }
        >
          <option value="">Todos</option>
          {bairros.map((b) => (
            <option key={b.id} value={b.id}>
              {nomeDoBairro(b)}
            </option>
          ))}
        </select>
      </div>

      <label className="filtros__check">
        <input
          type="checkbox"
          checked={filtros.prioritarias}
          onChange={(e) => onAlterar({ ...filtros, prioritarias: e.target.checked })}
        />
        Só prioritárias
      </label>

      <button
        type="button"
        className="botao botao--secundario"
        disabled={filtrosSaoOsIniciais(filtros)}
        onClick={() => onAlterar(FILTROS_INICIAIS)}
      >
        Limpar
      </button>
    </form>
  );
}

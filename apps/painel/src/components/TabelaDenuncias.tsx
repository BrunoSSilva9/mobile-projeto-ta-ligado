import { Link } from 'react-router-dom';

import { tempoDesde } from '../features/denuncias/formatacao';
import {
  nomeDoBairro,
  rotuloDoStatus,
  rotuloDoTipo,
  type DenunciaDoPainel,
} from '../features/denuncias/tipos';

/** Tabela de denúncias (RF-028): prioritárias já vêm no topo, na ordem da API (RN-015). */
export function TabelaDenuncias({
  denuncias,
  agoraMs,
}: {
  denuncias: readonly DenunciaDoPainel[];
  /** "Agora" em ms; vem de fora para a tabela ser previsível (e testável). */
  agoraMs: number;
}) {
  if (denuncias.length === 0) {
    return (
      <p className="estado" role="status">
        Nenhuma denúncia encontrada com esses filtros.
      </p>
    );
  }

  return (
    <div className="tabela-rolagem">
      <table className="tabela">
        <caption className="sr-only">Denúncias recebidas</caption>
        <thead>
          <tr>
            <th scope="col">Prioridade</th>
            <th scope="col">Protocolo</th>
            <th scope="col">Tipo</th>
            <th scope="col">Bairro / rua</th>
            <th scope="col">Status</th>
            <th scope="col">Enviada</th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {denuncias.map((d) => (
            <tr key={d.id} className={d.prioritaria ? 'tabela__prioritaria' : undefined}>
              <td>
                {d.prioritaria ? (
                  <span className="selo selo--prioridade">Prioritária</span>
                ) : (
                  <span className="sr-only">Normal</span>
                )}
              </td>
              <td>{d.protocolo}</td>
              <td>{rotuloDoTipo(d.tipo)}</td>
              <td>
                <strong>{nomeDoBairro(d.bairro)}</strong>
                <br />
                <span className="muted">{d.logradouro}</span>
              </td>
              <td>
                <span className={`selo selo--${d.status.toLowerCase()}`}>
                  {rotuloDoStatus(d.status)}
                </span>
              </td>
              <td>{tempoDesde(d.criadoEm, agoraMs)}</td>
              <td>
                <Link
                  className="botao botao--secundario"
                  to={`/denuncias/${d.id}`}
                  aria-label={`Abrir denúncia ${d.protocolo}`}
                >
                  Abrir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

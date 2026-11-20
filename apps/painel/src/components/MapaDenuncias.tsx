import 'leaflet/dist/leaflet.css';

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';

import { CENTRO_DE_MARABA, corDoPino, temCoordenadas } from '../features/denuncias/mapa';
import {
  nomeDoBairro,
  rotuloDoStatus,
  rotuloDoTipo,
  type DenunciaDoPainel,
} from '../features/denuncias/tipos';

/**
 * Mapa Leaflet + OpenStreetMap com um pino por denúncia que tem coordenadas (RF-028). As sem
 * coordenadas (GPS negado, RN-012) aparecem só na lista.
 */
export function MapaDenuncias({ denuncias }: { denuncias: readonly DenunciaDoPainel[] }) {
  const comCoordenadas = denuncias.filter(temCoordenadas);
  const semCoordenadas = denuncias.length - comCoordenadas.length;

  return (
    <div className="mapa-bloco">
      <div className="mapa" role="region" aria-label="Mapa das denúncias">
        <MapContainer
          center={CENTRO_DE_MARABA}
          zoom={12}
          scrollWheelZoom
          style={{ height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {comCoordenadas.map((d) => (
            <CircleMarker
              key={d.id}
              center={[d.latitude, d.longitude]}
              radius={d.prioritaria ? 12 : 9}
              pathOptions={{
                color: corDoPino(d),
                fillColor: corDoPino(d),
                fillOpacity: 0.7,
                weight: d.prioritaria ? 4 : 2,
              }}
            >
              <Popup>
                <strong>{d.protocolo}</strong>
                <br />
                {rotuloDoTipo(d.tipo)} · {rotuloDoStatus(d.status)}
                <br />
                {nomeDoBairro(d.bairro)}, {d.logradouro}
                <br />
                <Link to={`/denuncias/${d.id}`}>Abrir denúncia</Link>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <ul className="legenda" aria-label="Legenda do mapa">
        <li>
          <span className="legenda__ponto" style={{ background: '#ba1a1a' }} aria-hidden="true" />
          Sem energia (em aberto)
        </li>
        <li>
          <span className="legenda__ponto" style={{ background: '#ce8300' }} aria-hidden="true" />
          Oscilação (em aberto)
        </li>
        <li>
          <span className="legenda__ponto" style={{ background: '#6e7a6d' }} aria-hidden="true" />
          Encerrada
        </li>
      </ul>
      {semCoordenadas > 0 ? (
        <p className="muted" role="status">
          {semCoordenadas === 1
            ? '1 denúncia sem coordenadas aparece só na lista.'
            : `${semCoordenadas} denúncias sem coordenadas aparecem só na lista.`}
        </p>
      ) : null}
    </div>
  );
}

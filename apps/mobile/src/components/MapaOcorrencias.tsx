import { Component, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import {
  CORES_DO_STATUS_DO_BAIRRO,
  corDaOcorrencia,
  type BairroComStatus,
  type OcorrenciaPublica,
} from '@/features/ocorrencias/tipos';
import { colors, radius, space, type } from '@/theme';

/** Centro de Marabá-PA. */
export const CENTRO_DE_MARABA = { latitude: -5.3686, longitude: -49.1178 };

/** Raio do círculo de cada bairro no mapa (aproximado: a base de bairros tem só o centro). */
export const RAIO_DO_BAIRRO_M = 700;

/** Cor translúcida do círculo, a partir do `#RRGGBB` do status. */
function comTransparencia(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

/** Se o módulo nativo do mapa falhar, a tela continua com os chips e a lista. */
class LimiteDeErro extends Component<
  { fallback: ReactNode; children: ReactNode },
  { falhou: boolean }
> {
  state = { falhou: false };
  static getDerivedStateFromError() {
    return { falhou: true };
  }
  render() {
    return this.state.falhou ? this.props.fallback : this.props.children;
  }
}

type Props = {
  bairros: readonly BairroComStatus[];
  /** Pinos das ocorrências (já anonimizadas e arredondadas). Vazio na Home. */
  ocorrencias?: readonly OcorrenciaPublica[];
  /** Mini-mapa da Home: menor, sem gestos. */
  compacto?: boolean;
  /** Centraliza o mapa neste ponto (o "Ver" da lista "Lugares com aviso"). Um novo objeto repete o movimento. */
  foco?: { latitude: number; longitude: number } | null;
};

/**
 * Mapa público de Marabá (RF-019, RF-023): um círculo por bairro na cor do status (RN-007) e,
 * na tela de Ocorrências, um pino por ocorrência que tem coordenadas. Os bairros normais ficam
 * bem discretos para destacar os afetados.
 */
export function MapaOcorrencias({
  bairros,
  ocorrencias = [],
  compacto = false,
  foco = null,
}: Props) {
  const mapa = useRef<MapView>(null);
  useEffect(() => {
    if (foco) {
      mapa.current?.animateToRegion?.({ ...foco, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
    }
  }, [foco]);

  const afetados = bairros.filter((b) => b.status !== 'NORMAL').length;
  const resumo =
    afetados === 0
      ? 'Mapa de Marabá: nenhum bairro afetado no momento.'
      : `Mapa de Marabá: ${afetados} ${afetados === 1 ? 'bairro afetado' : 'bairros afetados'}.`;

  return (
    <View style={styles.bloco}>
      <LimiteDeErro
        fallback={
          <View style={[styles.mapa, styles.alternativa]}>
            <Text style={[type.body, styles.alternativaTexto]}>{resumo}</Text>
          </View>
        }
      >
        <MapView
          ref={mapa}
          accessible
          accessibilityLabel={resumo}
          style={[styles.mapa, { height: compacto ? 180 : 280 }]}
          initialRegion={{ ...CENTRO_DE_MARABA, latitudeDelta: 0.14, longitudeDelta: 0.14 }}
          scrollEnabled={!compacto}
          zoomEnabled={!compacto}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          {bairros.map((b) => {
            const cor = CORES_DO_STATUS_DO_BAIRRO[b.status].destaque;
            return (
              <Circle
                key={b.bairroId}
                center={{ latitude: b.latitude, longitude: b.longitude }}
                radius={RAIO_DO_BAIRRO_M}
                strokeColor={cor}
                strokeWidth={b.status === 'NORMAL' ? 1 : 2}
                fillColor={comTransparencia(cor, b.status === 'NORMAL' ? 0.08 : 0.3)}
              />
            );
          })}
          {ocorrencias.map((o) =>
            o.latitude !== null && o.longitude !== null ? (
              <Marker
                key={o.id}
                coordinate={{ latitude: o.latitude, longitude: o.longitude }}
                pinColor={corDaOcorrencia(o)}
              />
            ) : null,
          )}
        </MapView>
      </LimiteDeErro>
      <View
        style={styles.legenda}
        accessible
        accessibilityLabel="Legenda do mapa: vermelho sem luz, âmbar oscilação, verde normal"
      >
        {(['SEM_LUZ', 'OSCILACAO', 'NORMAL'] as const).map((s) => (
          <View key={s} style={styles.legendaItem}>
            <View
              style={[
                styles.legendaPonto,
                { backgroundColor: CORES_DO_STATUS_DO_BAIRRO[s].destaque },
              ]}
            />
            <Text style={[type.caption, { color: colors.textSecondary }]}>
              {s === 'SEM_LUZ' ? 'Sem luz' : s === 'OSCILACAO' ? 'Oscilação' : 'Normal'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.s },
  mapa: { borderRadius: radius.card, overflow: 'hidden' },
  alternativa: {
    height: 80,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.l,
  },
  alternativaTexto: { color: colors.textSecondary, textAlign: 'center' },
  legenda: { flexDirection: 'row', gap: space.l },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legendaPonto: { width: 12, height: 12, borderRadius: radius.pill },
});

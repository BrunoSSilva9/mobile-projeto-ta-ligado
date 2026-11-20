import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type MapMarkerProps } from 'react-native-maps';

import { colors, radius, space, type } from '@/theme';

type Coordenadas = { latitude: number; longitude: number };

type Props = {
  coordenadas: Coordenadas;
  /** O usuário soltou o pino em outro ponto (decisão S-23). */
  onMover: (coordenadas: Coordenadas) => void;
};

/**
 * Se o módulo nativo do mapa falhar (ex.: Expo Go sem suporte, chave ausente), o formulário
 * continua funcionando: mostramos só as coordenadas em texto.
 */
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

const aoSoltar: (onMover: Props['onMover']) => NonNullable<MapMarkerProps['onDragEnd']> =
  (onMover) => (evento) =>
    onMover(evento.nativeEvent.coordinate);

/** Mini-mapa da T-05: pino arrastável sobre a posição do GPS. */
export function MiniMapa({ coordenadas, onMover }: Props) {
  const texto = `Local: ${coordenadas.latitude.toFixed(5)}, ${coordenadas.longitude.toFixed(5)}`;

  return (
    <View style={styles.quadro}>
      <LimiteDeErro
        fallback={
          <View style={styles.alternativa}>
            <Text style={[type.body, styles.alternativaTexto]}>{texto}</Text>
          </View>
        }
      >
        <MapView
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.mapa}
          initialRegion={{ ...coordenadas, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
          toolbarEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker coordinate={coordenadas} draggable onDragEnd={aoSoltar(onMover)} />
        </MapView>
      </LimiteDeErro>
      <Text style={[type.caption, styles.legenda]}>
        {texto}. Segure e arraste o pino para ajustar o ponto.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  quadro: { gap: space.xs },
  mapa: { height: 160, borderRadius: radius.card },
  alternativa: {
    height: 80,
    borderRadius: radius.card,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternativaTexto: { color: colors.textSecondary },
  legenda: { color: colors.textSecondary },
});

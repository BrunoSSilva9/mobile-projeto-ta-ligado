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
 * continua funcionando: avisamos em texto que o ponto foi marcado pela localização do celular.
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

/**
 * Mini-mapa do passo "Onde está faltando energia?": pino arrastável sobre a posição do celular.
 * Mover o pino é opcional (quem não consegue pode corrigir o endereço pelos campos de texto).
 */
export function MiniMapa({ coordenadas, onMover }: Props) {
  return (
    <View style={styles.quadro}>
      <LimiteDeErro
        fallback={
          <View style={[styles.mapa, styles.alternativa]}>
            <Text style={[type.body, styles.alternativaTexto]}>
              Não foi possível mostrar o mapa. O local foi marcado pela localização do celular.
            </Text>
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
        Se o pino não estiver no lugar certo, segure e arraste.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  quadro: { gap: space.xs },
  mapa: { height: 160, borderRadius: radius.botao, overflow: 'hidden' },
  alternativa: {
    backgroundColor: colors.actionSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.l,
  },
  alternativaTexto: { color: colors.textSecondary, textAlign: 'center' },
  legenda: { color: colors.textSecondary },
});

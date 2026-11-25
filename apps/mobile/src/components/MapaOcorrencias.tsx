import { Ionicons } from '@expo/vector-icons';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { MarcadorDeSituacao } from '@/components/MarcadorDeSituacao';
import type { BairroComStatus, OcorrenciaPublica } from '@/features/ocorrencias/tipos';
import { rotuloDaSituacao, situacaoDaOcorrencia, situacaoDoBairro } from '@/features/situacao';
import { colors, radius, shadow, size, space, type, type SituacaoDaEnergia } from '@/theme';

/** Centro de Marabá-PA. */
export const CENTRO_DE_MARABA = { latitude: -5.3686, longitude: -49.1178 };

/** Raio da área de cada bairro afetado no mapa (aproximado: a base de bairros tem só o centro). */
export const RAIO_DO_BAIRRO_M = 700;

/** Depois deste tempo os marcadores param de ser redesenhados (a fonte dos ícones já carregou). */
export const TEMPO_DE_RASTREIO_MS = 600;

const SITUACOES: readonly SituacaoDaEnergia[] = ['semEnergia', 'oscilando', 'normal'];

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
  /** Ocorrências (já anonimizadas e arredondadas): um marcador por uma que tem coordenadas. */
  ocorrencias?: readonly OcorrenciaPublica[];
  /** Versão menor, sem gestos. */
  compacto?: boolean;
  /** Centraliza o mapa neste ponto (o "Ver" da lista "Lugares com aviso"). Um novo objeto repete o movimento. */
  foco?: { latitude: number; longitude: number } | null;
  /** Mostra o ponto azul "você está aqui" (só com a localização do celular disponível). */
  mostrarMinhaLocalizacao?: boolean;
  /** Toque em "Onde estou". Sem esta função o botão não aparece. */
  onOndeEstou?: () => void;
};

/**
 * Mapa público de Marabá (RF-019, RF-023): **um marcador por ocorrência** com coordenadas, com o
 * ícone e o formato da situação (Sem energia e Oscilando redondos, Normal quadrado), e, como
 * **apoio** (decisão R-02, ajustada), uma **área tracejada sem preenchimento** em volta de cada
 * bairro afetado. A informação não depende da área: está nos marcadores, na legenda e na lista.
 */
export function MapaOcorrencias({
  bairros,
  ocorrencias = [],
  compacto = false,
  foco = null,
  mostrarMinhaLocalizacao = false,
  onOndeEstou,
}: Props) {
  const mapa = useRef<MapView>(null);
  // Os marcadores são `View`s: o mapa os fotografa. Rastreia só no começo, até a fonte dos ícones
  // carregar, e depois solta (`tracksViewChanges={false}`) para o mapa não gastar bateria.
  const [rastrear, setRastrear] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setRastrear(false), TEMPO_DE_RASTREIO_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (foco) {
      mapa.current?.animateToRegion?.({ ...foco, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
    }
  }, [foco]);

  const afetados = bairros.filter((b) => b.status !== 'NORMAL');
  const resumo =
    afetados.length === 0
      ? 'Mapa de Marabá: nenhum bairro afetado no momento.'
      : `Mapa de Marabá: ${afetados.length} ${afetados.length === 1 ? 'bairro afetado' : 'bairros afetados'}.`;

  return (
    <View style={styles.bloco}>
      <LimiteDeErro
        fallback={
          <View style={[styles.mapa, styles.alternativa]}>
            <Text style={[type.body, styles.alternativaTexto]}>{resumo}</Text>
          </View>
        }
      >
        <View>
          <MapView
            ref={mapa}
            accessible
            accessibilityLabel={`${resumo} A lista abaixo tem as mesmas informações.`}
            style={[styles.mapa, { height: compacto ? 180 : 320 }]}
            initialRegion={{ ...CENTRO_DE_MARABA, latitudeDelta: 0.14, longitudeDelta: 0.14 }}
            scrollEnabled={!compacto}
            zoomEnabled={!compacto}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            showsUserLocation={mostrarMinhaLocalizacao}
            showsMyLocationButton={false}
          >
            {afetados.map((b) => (
              <Circle
                key={b.bairroId}
                center={{ latitude: b.latitude, longitude: b.longitude }}
                radius={RAIO_DO_BAIRRO_M}
                strokeColor={colors.situacao[situacaoDoBairro(b.status)].texto}
                strokeWidth={2}
                fillColor="transparent"
                // Tracejado só no iOS; no Android a linha é contínua (limite da biblioteca).
                lineDashPattern={Platform.OS === 'ios' ? [8, 6] : undefined}
              />
            ))}
            {ocorrencias.map((o) => {
              if (o.latitude === null || o.longitude === null) return null;
              const situacao = situacaoDaOcorrencia(o);
              return (
                <Marker
                  key={o.id}
                  coordinate={{ latitude: o.latitude, longitude: o.longitude }}
                  title={rotuloDaSituacao(situacao)}
                  description={o.bairro}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={rastrear}
                >
                  <MarcadorDeSituacao situacao={situacao} />
                </Marker>
              );
            })}
          </MapView>
          {onOndeEstou && !compacto ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Onde estou"
              accessibilityHint="Mostra a sua localização no mapa"
              onPress={onOndeEstou}
              style={styles.ondeEstou}
            >
              <Ionicons name="locate" size={22} color={colors.action} />
              <Text style={[type.label, { color: colors.action }]}>Onde estou</Text>
            </Pressable>
          ) : null}
        </View>
      </LimiteDeErro>
      <View
        style={styles.legenda}
        accessible
        accessibilityLabel={`Legenda do mapa: ${SITUACOES.map(rotuloDaSituacao).join(', ')}. A linha em volta de um bairro mostra a área aproximada de um bairro afetado.`}
      >
        {SITUACOES.map((s) => (
          <View key={s} style={styles.legendaItem}>
            <MarcadorDeSituacao situacao={s} tamanho={28} />
            <Text style={[type.bodySmall, { color: colors.textPrimary }]}>
              {rotuloDaSituacao(s)}
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
  /** Botão flutuante: a única sombra do app (precisa se destacar do mapa). */
  ondeEstou: {
    position: 'absolute',
    right: space.s,
    bottom: space.s,
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.m,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.action,
    ...shadow.flutuante,
  },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { rotuloDaSituacao } from '@/features/situacao';

import { colors, type SituacaoDaEnergia } from '@/theme';

/** Largura do contorno externo (na cor de texto da situação) e da borda branca (R-14). */
export const CONTORNO_DO_MARCADOR = 2;
export const BORDA_DO_MARCADOR = 3;

type Props = {
  situacao: SituacaoDaEnergia;
  /** Lado total, contorno e borda incluídos. 40 no mapa; menor na legenda. */
  tamanho?: number;
};

/**
 * Marcador de situação do mapa (design system v2): ícone da situação sobre a cor do marcador, com
 * **borda branca de 3** e **contorno externo de 2** na cor de texto da situação, para ter 3:1
 * contra o mapa (WCAG 1.4.11). Sem energia e Oscilando são **redondos**; Normal é **quadrado**: o
 * formato também diz a situação, a cor nunca é a única pista (WCAG 1.4.1).
 */
export function MarcadorDeSituacao({ situacao, tamanho = 40 }: Props) {
  const visual = colors.situacao[situacao];
  const quadrado = situacao === 'normal';
  const raio = quadrado ? 8 : tamanho / 2;
  const miolo = tamanho - 2 * (CONTORNO_DO_MARCADOR + BORDA_DO_MARCADOR);
  return (
    <View
      testID={`marcador-${situacao}`}
      accessibilityLabel={rotuloDaSituacao(situacao)}
      style={[
        styles.contorno,
        {
          width: tamanho,
          height: tamanho,
          borderRadius: raio,
          borderColor: visual.texto,
        },
      ]}
    >
      <View
        style={[
          styles.miolo,
          {
            borderRadius: Math.max(raio - CONTORNO_DO_MARCADOR - BORDA_DO_MARCADOR, 3),
            backgroundColor: visual.marcador,
          },
        ]}
      >
        <Ionicons
          name={visual.icone}
          size={Math.round(miolo * 0.75)}
          color={visual.iconeNoMarcador}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contorno: {
    borderWidth: CONTORNO_DO_MARCADOR,
    backgroundColor: colors.surface,
    padding: BORDA_DO_MARCADOR,
  },
  miolo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

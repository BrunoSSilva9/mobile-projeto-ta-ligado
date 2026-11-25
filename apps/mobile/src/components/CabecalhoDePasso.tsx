import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, size, space, type } from '@/theme';

type Props = {
  /** Passo atual, de 1 até `total`. */
  passo: number;
  total?: number;
  onVoltar: () => void;
};

/**
 * Cabeçalho de cada passo da denúncia: "Voltar" (ícone + texto), "Passo X de 3" e uma barra de
 * progresso em segmentos. A barra é decorativa para quem enxerga; o leitor de tela recebe o valor.
 */
export function CabecalhoDePasso({ passo, total = 3, onVoltar }: Props) {
  const texto = `Passo ${passo} de ${total}`;
  return (
    <View style={styles.bloco}>
      <View style={styles.linha}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onVoltar}
          style={styles.voltar}
        >
          <Ionicons name="arrow-back" size={24} color={colors.action} />
          <Text style={[type.button, styles.textoDoVoltar]}>Voltar</Text>
        </Pressable>
        <Text style={[type.label, { color: colors.textSecondary }]}>{texto}</Text>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={texto}
        accessibilityValue={{ min: 1, max: total, now: passo, text: texto }}
        style={styles.barra}
      >
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            testID={`segmento-${i + 1}`}
            style={[styles.segmento, i < passo ? styles.cheio : styles.vazio]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.s },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  voltar: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingRight: space.m,
  },
  textoDoVoltar: { color: colors.action, textDecorationLine: 'underline' },
  barra: { flexDirection: 'row', gap: space.xs },
  segmento: { flex: 1, height: 8, borderRadius: radius.pilula },
  cheio: { backgroundColor: colors.action },
  vazio: { backgroundColor: colors.borderSubtle },
});

import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, size, space, type } from '@/theme';

type Props = { rotulo: string; total?: number; selecionado: boolean; onPress: () => void };

/** Chip de filtro com a contagem ("Sem luz (9)"). Alvo de 48 dp, estado lido pelo leitor de tela. */
export function FilterChip({ rotulo, total, selecionado, onPress }: Props) {
  const texto = total === undefined ? rotulo : `${rotulo} (${total})`;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={texto}
      accessibilityState={{ selected: selecionado }}
      onPress={onPress}
      style={[styles.chip, selecionado && styles.chipSelecionado]}
    >
      <Text style={[type.button, { color: selecionado ? colors.white : colors.textPrimary }]}>
        {texto}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: size.touchMin,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelecionado: { backgroundColor: colors.action },
});

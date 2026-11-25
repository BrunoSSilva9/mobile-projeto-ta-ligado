import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, size, space, type } from '@/theme';

type Props = {
  rotulo: string;
  total?: number;
  selecionado: boolean;
  onPress: () => void;
  /** Ícone Ionicons ao lado do texto (todo ícone tem texto). */
  icone?: ComponentProps<typeof Ionicons>['name'];
};

/**
 * Chip de filtro com a contagem ("Sem energia (9)"). 48 dp de altura. Selecionado: azul cheio com
 * texto branco; não selecionado: branco com borda `borderField`. O estado é lido pelo leitor de tela.
 */
export function FilterChip({ rotulo, total, selecionado, onPress, icone }: Props) {
  const texto = total === undefined ? rotulo : `${rotulo} (${total})`;
  const cor = selecionado ? colors.onAction : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={texto}
      accessibilityState={{ selected: selecionado }}
      onPress={onPress}
      style={[styles.chip, selecionado && styles.chipSelecionado]}
    >
      {icone ? <Ionicons name={icone} size={20} color={cor} /> : null}
      <Text style={[type.label, { color: cor }]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.l,
    borderRadius: radius.pilula,
    borderWidth: 2,
    borderColor: colors.borderField,
    backgroundColor: colors.surface,
  },
  chipSelecionado: { backgroundColor: colors.action, borderColor: colors.action },
});

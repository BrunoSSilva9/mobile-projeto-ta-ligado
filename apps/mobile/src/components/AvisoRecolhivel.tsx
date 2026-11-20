import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, size, space, type } from '@/theme';

type Props = { titulo: string; itens: readonly string[]; inicialmenteAberto?: boolean };

/** Cartão de orientações que o usuário pode recolher (aviso de responsabilidade da T-05). */
export function AvisoRecolhivel({ titulo, itens, inicialmenteAberto = true }: Props) {
  const [aberto, setAberto] = useState(inicialmenteAberto);

  return (
    <View style={styles.cartao}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={titulo}
        accessibilityState={{ expanded: aberto }}
        onPress={() => setAberto((a) => !a)}
        style={styles.cabecalho}
      >
        <Ionicons name="information-circle-outline" size={20} color={colors.action} />
        <Text style={[type.subtitle, styles.titulo]}>{titulo}</Text>
        <Ionicons
          name={aberto ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
      {aberto ? (
        <View style={styles.itens}>
          {itens.map((item) => (
            <Text key={item} style={[type.body, styles.item]}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: { backgroundColor: colors.bgCard, borderRadius: radius.card, paddingHorizontal: space.l },
  cabecalho: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
  },
  titulo: { flex: 1, color: colors.textPrimary },
  itens: { gap: space.xs, paddingBottom: space.m },
  item: { color: colors.textSecondary },
});

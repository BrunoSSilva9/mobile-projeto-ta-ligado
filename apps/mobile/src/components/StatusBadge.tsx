import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { andamentoDe, rotuloDoAndamento } from '@/features/situacao';
import { colors, radius, space, type } from '@/theme';

/**
 * Selo do andamento da denúncia: **ícone + texto** em caixa normal ("Recebida"). A cor nunca é a
 * única pista (WCAG 1.4.1). Um status desconhecido aparece com o visual neutro de "Recebida".
 */
export function StatusBadge({ status }: { status: string }) {
  const visual = colors.andamento[andamentoDe(status) ?? 'RECEBIDA'];
  const rotulo = rotuloDoAndamento(status);
  return (
    <View
      accessible
      accessibilityLabel={`Status: ${rotulo}`}
      style={[styles.selo, { backgroundColor: visual.fundo }]}
    >
      <Ionicons name={visual.icone} size={18} color={visual.texto} />
      <Text style={[type.label, { color: visual.texto }]}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.m,
    paddingVertical: space.xs,
    borderRadius: radius.pilula,
  },
});

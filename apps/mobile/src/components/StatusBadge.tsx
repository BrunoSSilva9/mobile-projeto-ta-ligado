import { StyleSheet, Text, View } from 'react-native';

import { corDoStatus, rotuloDoStatus } from '@/features/acompanhamento/status';
import { colors, radius, space, type } from '@/theme';

/** Selo de status da denúncia: ponto colorido + nome (a cor nunca é a única pista, RNF-018). */
export function StatusBadge({ status }: { status: string }) {
  return (
    <View accessible accessibilityLabel={`Status: ${rotuloDoStatus(status)}`} style={styles.selo}>
      <View style={[styles.ponto, { backgroundColor: corDoStatus(status) }]} />
      <Text style={[type.label, styles.texto]}>{rotuloDoStatus(status).toUpperCase()}</Text>
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
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
  },
  ponto: { width: 10, height: 10, borderRadius: radius.pill },
  texto: { color: colors.textPrimary },
});

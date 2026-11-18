import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme';

/** Logo textual "Tá Ligado?" (versão fundo claro). O símbolo (lupa com raio) vem do Figma depois. */
export function Logo() {
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Tá Ligado? Marabá em tempo real">
      <View style={styles.row}>
        <Text style={[type.logo, { color: colors.brand900 }]}>Tá Ligado</Text>
        <Text style={[type.logo, { color: colors.lime }]}>?</Text>
      </View>
      <Text style={[type.tagline, { color: colors.tagline }]}>MARABÁ • EM TEMPO REAL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
});

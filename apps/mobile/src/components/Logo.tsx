import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme';

/** Tamanho do quadrado da marca. */
const LADO = 36;

/**
 * Logo "Tá Ligado?": quadrado azul-noite com o raio lima e o nome. O azul-noite e o lima são **só da
 * marca** (nunca em botões ou textos). Sem subtítulo: o antigo ("MARABÁ • EM TEMPO REAL", 8,5 dp,
 * em maiúsculas) saiu do design.
 */
export function Logo() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Tá Ligado?" style={styles.linha}>
      <View style={styles.quadrado}>
        <Ionicons name="flash" size={22} color={colors.lime} />
      </View>
      <Text style={[type.title3, { color: colors.brandNavy }]}>Tá Ligado?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  quadrado: {
    width: LADO,
    height: LADO,
    borderRadius: radius.botao,
    backgroundColor: colors.brandNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

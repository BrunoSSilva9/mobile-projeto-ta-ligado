import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, shadow, size } from '@/theme';

/**
 * Botão central "Denunciar" da barra inferior (componente C-01).
 * Abre o modal T-05. Tem 56 dp (acima do mínimo de 48 dp, decisão D-02).
 */
export function ReportFab() {
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Denunciar falta de luz"
        onPress={() => router.push('/denunciar')}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Ionicons name="notifications" size={24} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: size.fab,
    height: size.fab,
    borderRadius: size.fab / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    ...shadow.fab,
  },
  pressed: { opacity: 0.85 },
});

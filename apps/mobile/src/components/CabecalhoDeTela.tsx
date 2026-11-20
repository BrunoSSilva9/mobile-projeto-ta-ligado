import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, size, space, type } from '@/theme';

/** Volta para a tela anterior, ou para o início se a tela foi aberta direto (link ou push). */
export function voltar() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Cabeçalho das telas empilhadas: botão voltar (48 dp) e título. */
export function CabecalhoDeTela({ titulo }: { titulo: string }) {
  return (
    <View style={styles.cabecalho}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={voltar}
        style={styles.voltar}
      >
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <Text accessibilityRole="header" style={[type.title, styles.titulo]}>
        {titulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: {
    height: size.header,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.s,
    gap: space.s,
  },
  voltar: {
    width: size.touchMin,
    height: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { color: colors.textPrimary, flexShrink: 1 },
});

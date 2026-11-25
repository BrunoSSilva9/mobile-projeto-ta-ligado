import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, size, space, type } from '@/theme';

/** Volta para a tela anterior, ou para o início se a tela foi aberta direto (link ou push). */
export function voltar() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Cabeçalho das telas empilhadas: "Voltar" (ícone **e texto**, 48 dp) e o título abaixo.
 * Nenhum botão do app é só ícone.
 */
export function CabecalhoDeTela({ titulo }: { titulo: string }) {
  return (
    <View style={styles.cabecalho}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={voltar}
        style={styles.voltar}
      >
        <Ionicons name="arrow-back" size={24} color={colors.action} />
        <Text style={[type.button, styles.textoDoVoltar]}>Voltar</Text>
      </Pressable>
      <Text accessibilityRole="header" style={[type.title2, styles.titulo]}>
        {titulo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { paddingHorizontal: space.l, paddingTop: space.xs, gap: space.xs },
  voltar: {
    minHeight: size.touchMin,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingRight: space.m,
  },
  textoDoVoltar: { color: colors.action, textDecorationLine: 'underline' },
  titulo: { color: colors.textPrimary, paddingBottom: space.s },
});

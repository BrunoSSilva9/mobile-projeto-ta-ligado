import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, radius, space, type } from '@/theme';

/** Chamada para denunciar (Home e Ocorrências): leva ao formulário T-05. */
export function BannerDenunciar({ titulo, botao }: { titulo: string; botao: string }) {
  return (
    <View style={styles.banner}>
      <Text accessibilityRole="header" style={[type.title, styles.titulo]}>
        {titulo}
      </Text>
      <Button titulo={botao} variante="claro" onPress={() => router.push('/denunciar')} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.brand900,
    borderRadius: radius.cardLarge,
    padding: space.xl,
    gap: space.l,
  },
  titulo: { color: colors.white },
});

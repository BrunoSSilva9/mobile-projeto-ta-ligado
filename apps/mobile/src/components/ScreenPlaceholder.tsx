import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { colors, radius, space, type } from '@/theme';

type Props = {
  /** ID da tela em docs/05-telas-e-fluxos.md (ex.: "T-03"). */
  id: string;
  title: string;
  description: string;
};

/** Tela vazia da Fase 0: mostra o ID e o objetivo até a implementação real (Fase 1). */
export function ScreenPlaceholder({ id, title, description }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Logo />
      </View>
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={[type.label, styles.badge]}>{id} · EM CONSTRUÇÃO</Text>
          <Text accessibilityRole="header" style={[type.h1, styles.title]}>
            {title}
          </Text>
          <Text style={[type.body, styles.description]}>{description}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  header: { height: 64, justifyContent: 'center', paddingHorizontal: space.l },
  body: { flex: 1, padding: space.l },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.cardLarge,
    padding: space.xl,
    gap: space.s,
  },
  badge: { color: colors.action },
  title: { color: colors.textPrimary },
  description: { color: colors.textSecondary },
});

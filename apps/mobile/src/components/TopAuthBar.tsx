import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { colors, radius, size, space, type } from '@/theme';

type Props = {
  /** Qual modo está ativo: o botão correspondente fica em destaque. */
  ativo: 'entrar' | 'cadastrar';
};

/**
 * Barra superior das telas de acesso (T-01 e T-02): a marca e os botões "Entrar" e "Cadastrar",
 * que alternam entre os dois modos. O ativo é azul cheio; o outro tem borda azul. Alvo de 48 dp.
 */
export function TopAuthBar({ ativo }: Props) {
  return (
    <View style={styles.barra}>
      <Logo />
      <View style={styles.botoes}>
        <Alternar
          titulo="Entrar"
          ativo={ativo === 'entrar'}
          onPress={() => router.replace('/login')}
        />
        <Alternar
          titulo="Cadastrar"
          ativo={ativo === 'cadastrar'}
          onPress={() => router.replace('/cadastro')}
        />
      </View>
    </View>
  );
}

function Alternar({
  titulo,
  ativo,
  onPress,
}: {
  titulo: string;
  ativo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={[styles.alternar, ativo ? styles.ativo : styles.inativo]}
    >
      <Text style={[type.label, { color: ativo ? colors.onAction : colors.action }]}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barra: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.s,
    paddingHorizontal: space.l,
    paddingVertical: space.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDivider,
  },
  botoes: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  alternar: {
    minHeight: size.touchMin,
    paddingHorizontal: space.m,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ativo: { backgroundColor: colors.action, borderColor: colors.action },
  inativo: { backgroundColor: colors.surface, borderColor: colors.action },
});

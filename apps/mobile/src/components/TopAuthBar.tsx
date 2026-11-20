import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { colors, hitSlopFor, radius, space, type } from '@/theme';

type Props = {
  /** Qual modo está ativo: o botão correspondente fica em destaque. */
  ativo: 'entrar' | 'cadastrar';
};

const ALTURA_VISUAL = 36;

/**
 * Barra superior das telas de acesso (T-01 e T-02): logo e os botões "Entrar" e "Cadastrar",
 * que alternam entre os dois modos. O visual tem 36 dp e a área de toque chega a 48 dp (D-02).
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
      hitSlop={hitSlopFor(ALTURA_VISUAL)}
      onPress={onPress}
      style={[styles.alternar, ativo ? styles.ativo : styles.inativo]}
    >
      <Text style={[type.button, { color: ativo ? colors.white : colors.textSecondary }]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barra: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
    backgroundColor: colors.bgCard,
  },
  botoes: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  alternar: {
    height: ALTURA_VISUAL,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ativo: { backgroundColor: colors.action },
  inativo: { backgroundColor: colors.bgSoft },
});

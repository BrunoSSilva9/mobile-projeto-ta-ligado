import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, size, space, type } from '@/theme';

type Props = {
  marcado: boolean;
  onAlterar: (marcado: boolean) => void;
  /** Texto lido pelo leitor de tela (o `children` pode ter links e não ser lido por inteiro). */
  rotuloAcessivel: string;
  children: ReactNode;
  erro?: string;
  superficie?: 'clara' | 'escura';
  testID?: string;
};

/** Caixa de seleção com rótulo livre (pode ter links). A linha toda tem 48 dp ou mais. */
export function Checkbox({
  marcado,
  onAlterar,
  rotuloAcessivel,
  children,
  erro,
  superficie = 'clara',
  testID,
}: Props) {
  const escura = superficie === 'escura';

  return (
    <View style={styles.bloco}>
      <Pressable
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityLabel={rotuloAcessivel}
        accessibilityState={{ checked: marcado }}
        onPress={() => onAlterar(!marcado)}
        style={styles.linha}
      >
        <View style={[styles.caixa, marcado && styles.caixaMarcada]}>
          {marcado && <Ionicons name="checkmark" size={18} color={colors.white} />}
        </View>
        <Text
          style={[
            type.caption,
            styles.rotulo,
            { color: escura ? colors.surfaceMint : colors.textSecondary },
          ]}
        >
          {children}
        </Text>
      </Pressable>
      {erro ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[
            type.caption,
            { color: escura ? colors.status.noPowerBg : colors.status.noPowerText },
          ]}
        >
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.xs },
  linha: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
  },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: radius.item - 2,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: { backgroundColor: colors.action, borderColor: colors.surfaceMint },
  rotulo: { flex: 1 },
});

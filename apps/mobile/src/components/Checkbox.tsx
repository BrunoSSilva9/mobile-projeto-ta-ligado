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
  /**
   * @deprecated Só existe enquanto login e cadastro têm o cartão escuro (etapa R9 os deixa
   * brancos). `escura` clareia o texto para ler sobre o azul-noite.
   */
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
  const corDoErro = escura ? colors.situacao.semEnergia.fundo : colors.danger;

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
          {marcado && <Ionicons name="checkmark" size={20} color={colors.onAction} />}
        </View>
        <Text
          style={[
            type.bodySmall,
            styles.rotulo,
            { color: escura ? colors.actionTabPill : colors.textPrimary },
          ]}
        >
          {children}
        </Text>
      </Pressable>
      {erro ? (
        <View style={styles.mensagem}>
          <Ionicons name="warning" size={18} color={corDoErro} />
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[type.bodySmall, styles.textoDaMensagem, { color: corDoErro }]}
          >
            {erro}
          </Text>
        </View>
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
    width: 28,
    height: 28,
    borderRadius: radius.campo - 2,
    borderWidth: 2,
    borderColor: colors.borderField,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: { backgroundColor: colors.action, borderColor: colors.action },
  rotulo: { flex: 1 },
  mensagem: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  textoDaMensagem: { flex: 1 },
});

import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, size, space, type } from '@/theme';

/**
 * - `primario`: fundo `#006E2C` com texto branco (D-01).
 * - `claro`: fundo branco com texto verde; é o botão para usar sobre cartões escuros.
 * - `secundario`: fundo verde-claro com texto escuro.
 * - `texto`: sem fundo (links de ação).
 */
export type VarianteDoBotao = 'primario' | 'claro' | 'secundario' | 'texto';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: VarianteDoBotao;
  carregando?: boolean;
  desabilitado?: boolean;
  icone?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const CORES: Record<VarianteDoBotao, { fundo: string; texto: string }> = {
  primario: { fundo: colors.action, texto: colors.white },
  claro: { fundo: colors.white, texto: colors.action },
  secundario: { fundo: colors.bgSoft, texto: colors.textSecondary },
  texto: { fundo: 'transparent', texto: colors.action },
};

/** Botão do app. Altura mínima de 48 dp (decisão D-02). */
export function Button({
  titulo,
  onPress,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  icone,
  accessibilityLabel,
  style,
  testID,
}: Props) {
  const inativo = desabilitado || carregando;
  const cor = CORES[variante];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: cor.fundo },
        inativo && styles.inativo,
        pressed && styles.pressionado,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={cor.texto} />
      ) : (
        <View style={styles.conteudo}>
          {icone}
          <Text style={[type.button, styles.titulo, { color: cor.texto }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: size.touchMin,
    borderRadius: radius.card,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  titulo: { textAlign: 'center', fontSize: 16 },
  inativo: { opacity: 0.55 },
  pressionado: { opacity: 0.85 },
});

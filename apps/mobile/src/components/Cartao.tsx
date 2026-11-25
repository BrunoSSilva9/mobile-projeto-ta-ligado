import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme';

type Props = {
  children: ReactNode;
  /** Cartão da ação principal da tela: borda azul de 2. */
  destaque?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Cartão do design system v2: branco, canto de 16, **sem sombra**, sobre o fundo `bgPage`. A borda
 * fina é decorativa; `destaque` usa a borda azul de 2 para a ação principal.
 */
export function Cartao({ children, destaque = false, style, testID }: Props) {
  return (
    <View testID={testID} style={[styles.cartao, destaque && styles.destaque, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderColor: colors.borderDivider,
    padding: space.l,
    gap: space.s,
  },
  destaque: { borderWidth: 2, borderColor: colors.action },
});

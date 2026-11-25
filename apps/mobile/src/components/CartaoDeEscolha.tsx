import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme';

type Props = {
  titulo: string;
  descricao: string;
  /** Ícone no quadrado da esquerda (todo ícone tem texto: o título está ao lado). */
  icone: ComponentProps<typeof Ionicons>['name'];
  selecionado: boolean;
  onPress: () => void;
  /** Cor do quadrado do ícone e do próprio ícone (a cor da situação, por exemplo). */
  fundoDoIcone?: string;
  corDoIcone?: string;
  testID?: string;
};

/** Altura mínima do cartão: um alvo grande para quem tem pouca precisão no toque. */
export const ALTURA_DO_CARTAO_DE_ESCOLHA = 104;

/**
 * Cartão grande de escolha (rádio), como as duas opções do passo 1 da denúncia. Coloque os cartões
 * dentro de um `View` com `accessibilityRole="radiogroup"` e um rótulo. Selecionado: borda azul de 3,
 * fundo `actionSoft` e o rádio marcado.
 */
export function CartaoDeEscolha({
  titulo,
  descricao,
  icone,
  selecionado,
  onPress,
  fundoDoIcone = colors.actionSoft,
  corDoIcone = colors.action,
  testID,
}: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={`${titulo}. ${descricao}`}
      accessibilityState={{ checked: selecionado }}
      onPress={onPress}
      style={[styles.cartao, selecionado ? styles.selecionado : styles.normal]}
    >
      <View style={[styles.icone, { backgroundColor: fundoDoIcone }]}>
        <Ionicons name={icone} size={28} color={corDoIcone} />
      </View>
      <View style={styles.textos}>
        <Text style={[type.title3, { color: colors.textPrimary }]}>{titulo}</Text>
        <Text style={[type.bodySmall, { color: colors.textSecondary }]}>{descricao}</Text>
      </View>
      <View style={[styles.radio, selecionado && styles.radioMarcado]}>
        {selecionado ? <View style={styles.miolo} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    minHeight: ALTURA_DO_CARTAO_DE_ESCOLHA,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    padding: space.l,
    borderRadius: radius.cartao,
  },
  normal: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderField },
  selecionado: { backgroundColor: colors.actionSoft, borderWidth: 3, borderColor: colors.action },
  icone: {
    width: 56,
    height: 56,
    borderRadius: radius.botao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: space.xs },
  radio: {
    width: 28,
    height: 28,
    borderRadius: radius.pilula,
    borderWidth: 2,
    borderColor: colors.borderField,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioMarcado: { borderColor: colors.action },
  miolo: { width: 14, height: 14, borderRadius: radius.pilula, backgroundColor: colors.action },
});

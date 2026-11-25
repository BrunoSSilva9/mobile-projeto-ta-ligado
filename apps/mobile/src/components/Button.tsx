import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
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
 * - `primario`: azul cheio, 56 dp, largura total. **Um por tela**: é sempre o próximo passo.
 * - `secundario`: fundo branco com borda azul de 2, 56 dp, largura total.
 * - `texto`: sem fundo, azul, negrito e **sublinhado** (links de ação).
 * - `claro`: **obsoleto**, igual ao `secundario` (existia para cartões escuros; some na etapa R10).
 */
export type VarianteDoBotao = 'primario' | 'secundario' | 'texto' | 'claro';

type NomeDoIcone = ComponentProps<typeof Ionicons>['name'];

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: VarianteDoBotao;
  carregando?: boolean;
  desabilitado?: boolean;
  /** Ícone pronto (a cor é de quem passa). Prefira `nomeDoIcone`, que já usa a cor certa. */
  icone?: ReactNode;
  /** Ícone Ionicons, na cor do texto do botão. Todo ícone tem texto ao lado. */
  nomeDoIcone?: NomeDoIcone;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type Cores = { fundo: string; texto: string; borda: string };

/** Cores de cada variante e estado (pressionado, desativado). Exportada para ser testada. */
export function coresDoBotao(
  variante: VarianteDoBotao,
  pressionado: boolean,
  inativo: boolean,
): Cores {
  if (inativo && variante !== 'texto') {
    // Desativado: texto legível (6,2:1), nunca transparente.
    return { fundo: colors.disabledBg, texto: colors.disabledText, borda: colors.disabledBg };
  }
  switch (variante) {
    case 'primario':
      return {
        fundo: pressionado ? colors.actionPressed : colors.action,
        texto: colors.onAction,
        borda: pressionado ? colors.actionPressed : colors.action,
      };
    case 'texto':
      return {
        fundo: 'transparent',
        texto: inativo ? colors.disabledText : pressionado ? colors.actionPressed : colors.action,
        borda: 'transparent',
      };
    default: // secundario e claro
      return {
        fundo: pressionado ? colors.actionSoft : colors.surface,
        texto: pressionado ? colors.actionPressed : colors.action,
        borda: pressionado ? colors.actionPressed : colors.action,
      };
  }
}

/** Botão do app. Primário e secundário têm 56 dp de altura; o de texto, 48 dp (D-02). */
export function Button({
  titulo,
  onPress,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  icone,
  nomeDoIcone,
  accessibilityLabel,
  style,
  testID,
}: Props) {
  const inativo = desabilitado || carregando;
  const ehTexto = variante === 'texto';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => {
        const cor = coresDoBotao(variante, pressed, desabilitado);
        return [
          ehTexto ? styles.texto : styles.cheio,
          !ehTexto && { backgroundColor: cor.fundo, borderColor: cor.borda },
          style,
        ];
      }}
    >
      {({ pressed }) => {
        const cor = coresDoBotao(variante, pressed, desabilitado);
        return carregando ? (
          <ActivityIndicator color={cor.texto} />
        ) : (
          <View style={styles.conteudo}>
            {icone}
            {nomeDoIcone ? <Ionicons name={nomeDoIcone} size={22} color={cor.texto} /> : null}
            <Text
              style={[
                type.button,
                styles.titulo,
                { color: cor.texto },
                ehTexto && styles.sublinhado,
              ]}
            >
              {titulo}
            </Text>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cheio: {
    minHeight: size.button,
    alignSelf: 'stretch',
    borderRadius: radius.botao,
    borderWidth: 2,
    paddingHorizontal: space.l,
    paddingVertical: space.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    minHeight: size.touchMin,
    alignSelf: 'flex-start',
    paddingHorizontal: space.s,
    justifyContent: 'center',
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  titulo: { textAlign: 'center' },
  sublinhado: { textDecorationLine: 'underline' },
});

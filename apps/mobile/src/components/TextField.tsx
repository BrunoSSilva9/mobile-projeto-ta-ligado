import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, hitSlopFor, radius, size, space, type } from '@/theme';

type Props = {
  rotulo: string;
  value: string;
  onChangeText: (texto: string) => void;
  onBlur?: () => void;
  erro?: string;
  ajuda?: string;
  /** `escura`: o campo está sobre um cartão verde-escuro (rótulos claros). */
  superficie?: 'clara' | 'escura';
  /** Campo de senha: mostra o botão de mostrar/ocultar. */
  senha?: boolean;
  testID?: string;
} & Pick<
  TextInputProps,
  | 'placeholder'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'textContentType'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'maxLength'
  | 'multiline'
>;

/** Campo de texto com rótulo visível, erro e ajuda. Altura de 48 dp (decisão D-02). */
export function TextField({
  rotulo,
  value,
  onChangeText,
  onBlur,
  erro,
  ajuda,
  superficie = 'clara',
  senha = false,
  testID,
  ...entrada
}: Props) {
  const [oculta, setOculta] = useState(true);
  const escura = superficie === 'escura';

  return (
    <View style={styles.bloco}>
      <Text style={[type.label, { color: escura ? colors.surfaceMint : colors.textSecondary }]}>
        {rotulo}
      </Text>
      <View style={[styles.campo, !!erro && styles.campoComErro]}>
        <TextInput
          testID={testID}
          accessibilityLabel={rotulo}
          accessibilityHint={ajuda}
          style={[type.body, styles.entrada, entrada.multiline && styles.multilinha]}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          secureTextEntry={senha && oculta}
          {...entrada}
        />
        {senha && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={oculta ? 'Mostrar senha' : 'Ocultar senha'}
            hitSlop={hitSlopFor(size.touchMin)}
            onPress={() => setOculta((anterior) => !anterior)}
            style={styles.olho}
          >
            <Ionicons
              name={oculta ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
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
      ) : ajuda ? (
        <Text style={[type.caption, { color: escura ? colors.surfaceMint : colors.textMuted }]}>
          {ajuda}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.xs },
  campo: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  campoComErro: { borderColor: colors.status.noPower },
  entrada: {
    flex: 1,
    minHeight: size.touchMin,
    paddingHorizontal: space.m,
    color: colors.textPrimary,
  },
  multilinha: { minHeight: 96, paddingVertical: space.m, textAlignVertical: 'top' },
  olho: {
    width: size.touchMin,
    height: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

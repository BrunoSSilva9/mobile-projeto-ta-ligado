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
  /**
   * @deprecated Só existe enquanto login e cadastro têm o cartão escuro (etapa R9 os deixa
   * brancos). `escura` clareia o rótulo e a mensagem de erro para ler sobre o azul-noite.
   */
  superficie?: 'clara' | 'escura';
  /** Campo de senha: mostra o botão "Mostrar" / "Ocultar". */
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

/**
 * Campo de texto do design system v2: 56 dp de altura, borda de 2, **rótulo sempre visível acima**
 * (nunca só placeholder). No erro: borda vermelha, ícone de aviso e uma frase dizendo como resolver.
 */
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
  const corDoErro = escura ? colors.situacao.semEnergia.fundo : colors.danger;

  return (
    <View style={styles.bloco}>
      <Text style={[type.label, { color: escura ? colors.actionTabPill : colors.textPrimary }]}>
        {rotulo}
      </Text>
      <View style={[styles.campo, !!erro && styles.campoComErro]}>
        <TextInput
          testID={testID}
          accessibilityLabel={rotulo}
          accessibilityHint={ajuda}
          style={[type.body, styles.entrada, entrada.multiline && styles.multilinha]}
          placeholderTextColor={colors.textSecondary}
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
            <Text style={[type.caption, { color: colors.textSecondary }]}>
              {oculta ? 'Mostrar' : 'Ocultar'}
            </Text>
          </Pressable>
        )}
      </View>
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
      ) : ajuda ? (
        <Text
          style={[type.bodySmall, { color: escura ? colors.actionTabPill : colors.textSecondary }]}
        >
          {ajuda}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.xs },
  campo: {
    minHeight: size.field,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.campo,
    borderWidth: 2,
    borderColor: colors.borderField,
  },
  campoComErro: { borderColor: colors.danger },
  entrada: {
    flex: 1,
    minHeight: size.field - 4, // a borda de 2 dp de cada lado completa os 56 dp
    paddingHorizontal: space.m,
    color: colors.textPrimary,
  },
  multilinha: { minHeight: 120, paddingVertical: space.m, textAlignVertical: 'top' },
  olho: {
    minWidth: size.touchMin,
    minHeight: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  mensagem: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  textoDaMensagem: { flex: 1 },
});

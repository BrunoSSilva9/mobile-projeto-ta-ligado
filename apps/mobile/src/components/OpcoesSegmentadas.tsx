import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, size, space, type } from '@/theme';

type Opcao<T extends string> = { valor: T; rotulo: string };

type Props<T extends string> = {
  rotulo: string;
  opcoes: readonly Opcao<T>[];
  valor: T | undefined;
  onAlterar: (valor: T) => void;
  erro?: string;
};

/** Escolha de uma opção entre poucas (ex.: tipo da denúncia). Cada opção tem 48 dp ou mais. */
export function OpcoesSegmentadas<T extends string>({
  rotulo,
  opcoes,
  valor,
  onAlterar,
  erro,
}: Props<T>) {
  return (
    <View style={styles.bloco} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      <Text style={[type.label, styles.rotulo]}>{rotulo}</Text>
      <View style={styles.linha}>
        {opcoes.map((opcao) => {
          const marcada = opcao.valor === valor;
          return (
            <Pressable
              key={opcao.valor}
              accessibilityRole="radio"
              accessibilityLabel={opcao.rotulo}
              accessibilityState={{ selected: marcada }}
              onPress={() => onAlterar(opcao.valor)}
              style={[styles.opcao, marcada && styles.opcaoMarcada]}
            >
              <Text style={[type.button, { color: marcada ? colors.white : colors.textPrimary }]}>
                {opcao.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {erro ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[type.caption, { color: colors.status.noPowerBg }]}
        >
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.xs },
  rotulo: { color: colors.surfaceMint },
  linha: { flexDirection: 'row', gap: space.s },
  opcao: {
    flex: 1,
    minHeight: size.touchMin,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.s,
  },
  opcaoMarcada: { backgroundColor: colors.action, borderColor: colors.surfaceMint },
});

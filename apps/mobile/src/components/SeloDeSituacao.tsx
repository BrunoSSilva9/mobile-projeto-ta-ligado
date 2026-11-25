import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { iconeDaSituacao, rotuloDaSituacao } from '@/features/situacao';
import { colors, radius, space, type, type SituacaoDaEnergia } from '@/theme';

type Props = {
  situacao: SituacaoDaEnergia;
  /** `grande`: para o cartão "Energia no seu bairro agora" (texto em `title3`). */
  tamanho?: 'normal' | 'grande';
};

/**
 * Selo da situação da energia: Sem energia, Oscilando ou Normal. **A cor nunca aparece sozinha:**
 * sempre vem com um ícone de formato diferente (`flash-off`, `pulse`, `checkmark-circle`) e o texto.
 */
export function SeloDeSituacao({ situacao, tamanho = 'normal' }: Props) {
  const visual = colors.situacao[situacao];
  const rotulo = rotuloDaSituacao(situacao);
  const grande = tamanho === 'grande';
  return (
    <View
      accessible
      accessibilityLabel={`Situação da energia: ${rotulo}`}
      style={[styles.selo, { backgroundColor: visual.fundo }, grande && styles.grande]}
    >
      <Ionicons name={iconeDaSituacao(situacao)} size={grande ? 24 : 18} color={visual.texto} />
      <Text style={[grande ? type.title3 : type.label, { color: visual.texto }]}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.m,
    paddingVertical: space.xs,
    borderRadius: radius.pilula,
  },
  grande: { gap: space.s, paddingHorizontal: space.l, paddingVertical: space.s },
});

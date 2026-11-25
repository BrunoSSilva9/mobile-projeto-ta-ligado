import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ListaDeBairrosModal,
  rotuloDoBairro as rotuloDo,
  type ItemDeBairro,
} from '@/components/ListaDeBairrosModal';
import { colors, radius, size, space, type } from '@/theme';

export type { ItemDeBairro };

type Props = {
  rotulo: string;
  bairros: readonly ItemDeBairro[];
  valor: number | undefined;
  onAlterar: (id: number) => void;
  erro?: string;
  carregando?: boolean;
};

/** Seletor de bairro/folha em tela cheia com busca (a lista é fixa, RN-021). */
export function SeletorDeBairro({ rotulo, bairros, valor, onAlterar, erro, carregando }: Props) {
  const [aberto, setAberto] = useState(false);

  const atual = bairros.find((b) => b.id === valor);

  return (
    <View style={styles.bloco}>
      <Text style={[type.label, styles.rotulo]}>{rotulo}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${atual ? rotuloDo(atual) : 'não escolhido'}`}
        accessibilityHint="Abre a lista de bairros"
        disabled={carregando}
        onPress={() => setAberto(true)}
        style={[styles.campo, !!erro && styles.campoComErro]}
      >
        <Text
          numberOfLines={1}
          style={[type.body, { flex: 1, color: atual ? colors.textPrimary : colors.textMuted }]}
        >
          {carregando ? 'Carregando bairros…' : atual ? rotuloDo(atual) : 'Escolha o bairro'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>
      {erro ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[type.caption, { color: colors.status.noPowerBg }]}
        >
          {erro}
        </Text>
      ) : null}

      <ListaDeBairrosModal
        visivel={aberto}
        bairros={bairros}
        valor={valor}
        carregando={carregando}
        onEscolher={onAlterar}
        onFechar={() => setAberto(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.xs },
  rotulo: { color: colors.surfaceMint },
  campo: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.m,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  campoComErro: { borderColor: colors.status.noPower },
});

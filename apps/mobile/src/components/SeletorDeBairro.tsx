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

/**
 * Seletor de bairro/folha (a lista é fixa, RN-021). Mesmo visual de um campo de texto do design
 * system v2: rótulo visível acima, 56 dp, borda de 2 e, no erro, borda vermelha, ícone e frase.
 * Toca para abrir a lista em tela cheia, com busca.
 */
export function SeletorDeBairro({ rotulo, bairros, valor, onAlterar, erro, carregando }: Props) {
  const [aberto, setAberto] = useState(false);

  const atual = bairros.find((b) => b.id === valor);

  return (
    <View style={styles.bloco}>
      <Text style={[type.label, { color: colors.textPrimary }]}>{rotulo}</Text>
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
          style={[type.body, { flex: 1, color: atual ? colors.textPrimary : colors.textSecondary }]}
        >
          {carregando ? 'Carregando bairros…' : atual ? rotuloDo(atual) : 'Escolha o bairro'}
        </Text>
        <Ionicons name="chevron-down" size={22} color={colors.textSecondary} />
      </Pressable>
      {erro ? (
        <View style={styles.mensagem}>
          <Ionicons name="warning" size={18} color={colors.danger} />
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[type.bodySmall, styles.textoDaMensagem]}
          >
            {erro}
          </Text>
        </View>
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
  campo: {
    minHeight: size.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingHorizontal: space.m,
    backgroundColor: colors.surface,
    borderRadius: radius.campo,
    borderWidth: 2,
    borderColor: colors.borderField,
  },
  campoComErro: { borderColor: colors.danger },
  mensagem: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  textoDaMensagem: { flex: 1, color: colors.danger },
});

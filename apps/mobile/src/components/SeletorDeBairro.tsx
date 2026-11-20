import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, size, space, type } from '@/theme';

export type ItemDeBairro = { id: number; nome: string; folha: string | null };

const rotuloDo = (b: ItemDeBairro) => (b.folha ? `${b.nome} (${b.folha})` : b.nome);

/** Tira acentos e caixa para a busca ("marabá" acha "Marabá Pioneira"). */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
  const [busca, setBusca] = useState('');

  const atual = bairros.find((b) => b.id === valor);
  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return termo === '' ? bairros : bairros.filter((b) => normalizar(rotuloDo(b)).includes(termo));
  }, [bairros, busca]);

  const fechar = () => {
    setAberto(false);
    setBusca('');
  };

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

      <Modal visible={aberto} animationType="slide" onRequestClose={fechar}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.cabecalho}>
            <Text accessibilityRole="header" style={[type.title, { color: colors.textPrimary }]}>
              Escolha o bairro
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={fechar}
              style={styles.fechar}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="Buscar bairro ou folha"
            placeholder="Buscar bairro ou folha (ex.: Folha 28)"
            placeholderTextColor={colors.textMuted}
            value={busca}
            onChangeText={setBusca}
            autoCorrect={false}
            style={[type.body, styles.busca]}
          />
          <FlatList
            data={filtrados}
            keyExtractor={(b) => String(b.id)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[type.body, styles.vazio]}>Nenhum bairro encontrado.</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={rotuloDo(item)}
                accessibilityState={{ selected: item.id === valor }}
                onPress={() => {
                  onAlterar(item.id);
                  fechar();
                }}
                style={styles.item}
              >
                <Text style={[type.body, { flex: 1, color: colors.textPrimary }]}>
                  {rotuloDo(item)}
                </Text>
                {item.id === valor ? (
                  <Ionicons name="checkmark" size={20} color={colors.action} />
                ) : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
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
  modal: { flex: 1, backgroundColor: colors.bgPage },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.l,
  },
  fechar: {
    width: size.touchMin,
    height: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busca: {
    minHeight: size.touchMin,
    marginHorizontal: space.l,
    marginBottom: space.s,
    paddingHorizontal: space.m,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    color: colors.textPrimary,
  },
  item: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bgMuted,
  },
  vazio: { padding: space.xl, textAlign: 'center', color: colors.textSecondary },
});

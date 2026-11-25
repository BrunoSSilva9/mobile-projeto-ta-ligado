import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, size, space, type } from '@/theme';

export type ItemDeBairro = { id: number; nome: string; folha: string | null };

export const rotuloDoBairro = (b: Pick<ItemDeBairro, 'nome' | 'folha'>) =>
  b.folha ? `${b.nome} (${b.folha})` : b.nome;

/** Tira acentos e caixa para a busca ("marabá" acha "Marabá Pioneira"). */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

type Props = {
  visivel: boolean;
  bairros: readonly ItemDeBairro[];
  /** Bairro marcado na lista. */
  valor: number | undefined;
  onEscolher: (id: number) => void;
  onFechar: () => void;
  /** Mostra "Carregando…" no lugar da lista vazia enquanto a lista de bairros chega. */
  carregando?: boolean;
};

/**
 * Lista de bairros em tela cheia, com busca por bairro ou folha (a lista é fixa, RN-021). Usada pelo
 * seletor do formulário e pelo "Trocar" da Início. "Fechar" tem ícone **e** texto.
 */
export function ListaDeBairrosModal({
  visivel,
  bairros,
  valor,
  onEscolher,
  onFechar,
  carregando = false,
}: Props) {
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return termo === ''
      ? bairros
      : bairros.filter((b) => normalizar(rotuloDoBairro(b)).includes(termo));
  }, [bairros, busca]);

  const fechar = () => {
    setBusca('');
    onFechar();
  };

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={fechar}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.cabecalho}>
          <Text accessibilityRole="header" style={[type.title2, styles.titulo]}>
            Escolha o bairro
          </Text>
          <Button variante="texto" titulo="Fechar" nomeDoIcone="close" onPress={fechar} />
        </View>
        <View style={styles.busca}>
          <TextField
            rotulo="Buscar bairro ou folha"
            placeholder="Ex.: Folha 28"
            autoCorrect={false}
            value={busca}
            onChangeText={setBusca}
          />
        </View>
        <FlatList
          data={filtrados}
          keyExtractor={(b) => String(b.id)}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[type.body, styles.vazio]}>
              {carregando ? 'Carregando bairros…' : 'Nenhum bairro encontrado.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={rotuloDoBairro(item)}
              accessibilityState={{ selected: item.id === valor }}
              onPress={() => {
                onEscolher(item.id);
                fechar();
              }}
              style={styles.item}
            >
              <Text style={[type.body, styles.nome]}>{rotuloDoBairro(item)}</Text>
              {item.id === valor ? (
                <Ionicons name="checkmark" size={24} color={colors.action} />
              ) : null}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: colors.bgPage },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.l,
    paddingRight: space.s,
  },
  titulo: { flex: 1, color: colors.textPrimary },
  busca: { paddingHorizontal: space.l, paddingBottom: space.s },
  item: {
    minHeight: size.button,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDivider,
  },
  nome: { flex: 1, color: colors.textPrimary },
  vazio: { padding: space.xl, textAlign: 'center', color: colors.textSecondary },
});

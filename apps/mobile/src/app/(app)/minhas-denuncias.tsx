import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoDeConexao } from '@/components/AvisoDeConexao';
import { CabecalhoDeTela } from '@/components/CabecalhoDeTela';
import { ComplaintListItem } from '@/components/ComplaintListItem';
import { EmptyState, ErrorState, LoadingState } from '@/components/Estados';
import { useMinhasDenuncias } from '@/features/acompanhamento/hooks';
import { colors, space } from '@/theme';

/** T-09: minhas denúncias (RF-013). Atualiza sozinha quando a operadora muda um status. */
export default function MinhasDenunciasScreen() {
  const consulta = useMinhasDenuncias();

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <CabecalhoDeTela titulo="Minhas denúncias" />
      <View style={styles.aviso}>
        <AvisoDeConexao />
      </View>

      {consulta.isPending ? (
        <LoadingState mensagem="Carregando suas denúncias…" />
      ) : consulta.isError ? (
        <ErrorState
          mensagem={consulta.error.message}
          onTentarDeNovo={() => void consulta.refetch()}
        />
      ) : (
        <FlatList
          data={consulta.data.itens}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.lista}
          ItemSeparatorComponent={() => <View style={{ height: space.m }} />}
          refreshControl={
            <RefreshControl
              refreshing={consulta.isRefetching}
              onRefresh={() => void consulta.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              titulo="Você ainda não fez denúncias"
              descricao="Quando faltar energia, registre aqui e acompanhe o andamento."
              acao="Fazer denúncia"
              onAcao={() => router.push('/denunciar')}
            />
          }
          renderItem={({ item }) => (
            <ComplaintListItem
              denuncia={item}
              onPress={() => router.push({ pathname: '/denuncia/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  aviso: { paddingHorizontal: space.l },
  lista: { padding: space.l, flexGrow: 1 },
});

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoDeConexao } from '@/components/AvisoDeConexao';
import { BannerDenunciar } from '@/components/BannerDenunciar';
import { ContatosDeAtendimento } from '@/components/ContatosDeAtendimento';
import { EmptyState, ErrorState, MENSAGEM_SEM_DADOS_OFFLINE } from '@/components/Estados';
import { FilterChip } from '@/components/FilterChip';
import { LocationStatusCard } from '@/components/LocationStatusCard';
import { Logo } from '@/components/Logo';
import { MapaOcorrencias } from '@/components/MapaOcorrencias';
import { OccurrenceListItem } from '@/components/OccurrenceListItem';
import { TextField } from '@/components/TextField';
import {
  useOcorrencias,
  useAgora,
  useStatusDosBairros,
  useValorComAtraso,
} from '@/features/ocorrencias/hooks';
import { CHIPS, type FiltroPublico } from '@/features/ocorrencias/tipos';
import { colors, space, type } from '@/theme';

/**
 * T-04: ocorrências. Situação do seu bairro, chips com contagem, mapa e lista pública anonimizada
 * (RF-019 a RF-023, RN-014). Muda sozinha quando o painel atualiza um status (RF-024).
 */
export default function OcorrenciasScreen() {
  const [filtro, setFiltro] = useState<FiltroPublico>(undefined);
  const [busca, setBusca] = useState('');
  const buscaAtrasada = useValorComAtraso(busca);

  const bairros = useStatusDosBairros();
  const lista = useOcorrencias({ status: filtro, q: buscaAtrasada });
  const agora = useAgora();

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <View style={styles.cabecalho}>
        <Logo />
      </View>

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <AvisoDeConexao />
        <LocationStatusCard titulo="Localização atual" selo="status" />

        <TextField
          rotulo="Buscar bairro ou folha"
          placeholder="Ex.: Folha 28"
          autoCorrect={false}
          value={busca}
          onChangeText={setBusca}
        />

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Filtrar por situação"
          style={styles.chips}
        >
          {CHIPS.map((c) => (
            <FilterChip
              key={c.rotulo}
              rotulo={c.rotulo}
              total={lista.data?.totais[c.total]}
              selecionado={filtro === c.valor}
              onPress={() => setFiltro(c.valor)}
            />
          ))}
        </View>

        {bairros.data ? (
          <MapaOcorrencias bairros={bairros.data.bairros} ocorrencias={lista.data?.itens ?? []} />
        ) : null}

        <Text accessibilityRole="header" style={[type.title, styles.tituloDaSecao]}>
          Lista dos lugares
        </Text>
        {lista.isPending ? (
          <Text accessibilityRole="progressbar" style={[type.body, styles.texto]}>
            {lista.fetchStatus === 'paused'
              ? MENSAGEM_SEM_DADOS_OFFLINE
              : 'Carregando ocorrências…'}
          </Text>
        ) : lista.isError ? (
          <ErrorState mensagem={lista.error.message} onTentarDeNovo={() => void lista.refetch()} />
        ) : lista.data.itens.length === 0 ? (
          <EmptyState
            titulo="Nenhuma ocorrência no momento"
            descricao={
              buscaAtrasada.trim() !== ''
                ? 'Nenhum resultado para essa busca.'
                : 'Quando houver, elas aparecem aqui.'
            }
          />
        ) : (
          <View style={styles.lista}>
            {lista.data.itens.map((o) => (
              <OccurrenceListItem key={o.id} ocorrencia={o} agoraMs={agora} />
            ))}
            {lista.data.total > lista.data.itens.length ? (
              <Text style={[type.caption, styles.texto]}>
                Mostrando as {lista.data.itens.length} mais recentes de {lista.data.total}.
              </Text>
            ) : null}
          </View>
        )}

        <BannerDenunciar
          titulo="Deu falta de energia? Avise seus vizinhos e a concessionária"
          botao="Denunciar"
        />
        <ContatosDeAtendimento />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  cabecalho: { height: 64, justifyContent: 'center', paddingHorizontal: space.l },
  conteudo: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  tituloDaSecao: { color: colors.textPrimary },
  texto: { color: colors.textSecondary },
  lista: { gap: space.m },
});

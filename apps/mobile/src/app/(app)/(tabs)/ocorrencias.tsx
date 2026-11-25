import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoDeConexao } from '@/components/AvisoDeConexao';
import { EmptyState, ErrorState, MENSAGEM_SEM_DADOS_OFFLINE } from '@/components/Estados';
import { FilterChip } from '@/components/FilterChip';
import { LugarComAviso } from '@/components/LugarComAviso';
import { MapaOcorrencias } from '@/components/MapaOcorrencias';
import { TextField } from '@/components/TextField';
import { tempoDesde } from '@/features/acompanhamento/formatacao';
import { agruparPorBairro, type LugarComAviso as Lugar } from '@/features/ocorrencias/agrupar';
import {
  useAgora,
  useOcorrencias,
  useStatusDosBairros,
  useValorComAtraso,
} from '@/features/ocorrencias/hooks';
import { CHIPS, type FiltroPublico } from '@/features/ocorrencias/tipos';
import { colors, space, type } from '@/theme';

/** "Marabá · atualizado agora" / "… há 5 min": o horário vem da própria resposta da lista. */
export function textoDeAtualizacao(atualizadoEm: string | undefined, agoraMs: number): string {
  const quando = atualizadoEm ? tempoDesde(atualizadoEm, agoraMs) : '';
  if (!quando) return 'Marabá';
  return `Marabá · atualizado ${quando.charAt(0).toLowerCase()}${quando.slice(1)}`;
}

/**
 * Aba **Mapa** (rota `/ocorrencias`, T-04): "Onde falta energia". Busca por bairro ou folha, chips
 * com ícone e contagem, o mapa e a lista **"Lugares com aviso"** agrupada por bairro (RF-019 a
 * RF-023, RN-014). Muda sozinha quando o painel atualiza um status (RF-024).
 */
export default function OcorrenciasScreen() {
  const [filtro, setFiltro] = useState<FiltroPublico>(undefined);
  const [busca, setBusca] = useState('');
  const [foco, setFoco] = useState<{ latitude: number; longitude: number } | null>(null);
  const buscaAtrasada = useValorComAtraso(busca);
  const rolagem = useRef<ScrollViewInstance>(null);
  const alturaDoMapa = useRef(0);

  const bairros = useStatusDosBairros();
  const lista = useOcorrencias({ status: filtro, q: buscaAtrasada });
  const agora = useAgora();

  const lugares = useMemo(
    () => agruparPorBairro(lista.data?.itens ?? [], bairros.data?.bairros ?? []),
    [lista.data, bairros.data],
  );

  /** "Ver": centraliza o mapa no bairro e leva a tela até ele. */
  const ver = (lugar: Lugar) => {
    if (!lugar.centro) return;
    setFoco({ ...lugar.centro }); // objeto novo: repete o movimento mesmo no mesmo bairro
    rolagem.current?.scrollTo({ y: alturaDoMapa.current, animated: true });
  };

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <View style={styles.cabecalho}>
        <Text accessibilityRole="header" style={[type.title1, styles.titulo]}>
          Onde falta energia
        </Text>
        <Text style={[type.bodySmall, styles.apoio]}>
          {textoDeAtualizacao(lista.data?.atualizadoEm, agora)}
        </Text>
        <TextField
          rotulo="Procurar bairro ou folha"
          placeholder="Ex.: Folha 28"
          autoCorrect={false}
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <ScrollView
        ref={rolagem}
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
      >
        <AvisoDeConexao />

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Filtrar por situação"
          style={styles.chips}
        >
          {CHIPS.map((c) => (
            <FilterChip
              key={c.rotulo}
              rotulo={c.rotulo}
              icone={c.icone}
              total={lista.data?.totais[c.total]}
              selecionado={filtro === c.valor}
              onPress={() => setFiltro(c.valor)}
            />
          ))}
        </View>

        {bairros.data ? (
          <View
            onLayout={(e) => {
              alturaDoMapa.current = e.nativeEvent.layout.y;
            }}
          >
            <MapaOcorrencias
              bairros={bairros.data.bairros}
              ocorrencias={lista.data?.itens ?? []}
              foco={foco}
            />
          </View>
        ) : null}

        <Text accessibilityRole="header" style={[type.title2, styles.tituloDaSecao]}>
          {lista.data ? `Lugares com aviso (${lugares.length})` : 'Lugares com aviso'}
        </Text>
        {lista.isPending ? (
          <Text accessibilityRole="progressbar" style={[type.body, styles.texto]}>
            {lista.fetchStatus === 'paused'
              ? MENSAGEM_SEM_DADOS_OFFLINE
              : 'Carregando os lugares com aviso…'}
          </Text>
        ) : lista.isError ? (
          <ErrorState mensagem={lista.error.message} onTentarDeNovo={() => void lista.refetch()} />
        ) : lugares.length === 0 ? (
          <EmptyState
            titulo="Nenhum lugar com aviso"
            descricao={
              buscaAtrasada.trim() !== ''
                ? 'Nenhum resultado para essa busca.'
                : 'Quando houver, eles aparecem aqui.'
            }
          />
        ) : (
          <View style={styles.lista}>
            {lugares.map((l) => (
              <LugarComAviso
                key={l.chave}
                lugar={l}
                agoraMs={agora}
                onVer={l.centro ? () => ver(l) : undefined}
              />
            ))}
            {lista.data && lista.data.total > lista.data.itens.length ? (
              <Text style={[type.caption, styles.texto]}>
                Mostrando os {lista.data.itens.length} avisos mais recentes de {lista.data.total}.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  cabecalho: {
    gap: space.xs,
    padding: space.l,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDivider,
  },
  titulo: { color: colors.textPrimary },
  apoio: { color: colors.textSecondary, marginBottom: space.s },
  conteudo: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  tituloDaSecao: { color: colors.textPrimary },
  texto: { color: colors.textSecondary },
  lista: { gap: space.m },
});

import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/components/Aviso';
import { AvisoDeConexao } from '@/components/AvisoDeConexao';
import { Cartao } from '@/components/Cartao';
import { CabecalhoDeTela } from '@/components/CabecalhoDeTela';
import { CarregandoOuOffline, EmptyState, ErrorState } from '@/components/Estados';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusTimeline } from '@/components/StatusTimeline';
import type { DenunciaDetalhe } from '@/features/acompanhamento/api';
import { formatarDataHora } from '@/features/acompanhamento/formatacao';
import { useDenuncia } from '@/features/acompanhamento/hooks';
import { statusEmAberto } from '@/features/acompanhamento/status';
import { rotuloDoTipo } from '@/features/denuncia/schemas';
import { ErroDeApi } from '@/services/http';
import { colors, space, type } from '@/theme';

/**
 * T-07: detalhe da denúncia (RF-014, RF-024, RF-036). Só o autor vê. O status e o histórico mudam
 * sozinhos quando o evento do painel chega (o cache é atualizado pelo SocketProvider).
 * O botão "Cancelar" entra na Fase 2 (B-036).
 */
export default function DetalheDaDenunciaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const consulta = useDenuncia(id);
  const d = consulta.data;

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <CabecalhoDeTela titulo={d?.protocolo ?? 'Denúncia'} />

      {!d && consulta.isPending ? (
        <CarregandoOuOffline
          pausada={consulta.fetchStatus === 'paused'}
          mensagem="Carregando a denúncia…"
          onTentarDeNovo={() => void consulta.refetch()}
        />
      ) : !d && consulta.error instanceof ErroDeApi && consulta.error.status === 404 ? (
        <EmptyState titulo="Denúncia não encontrada" descricao="Ela não existe ou não é sua." />
      ) : !d ? (
        <ErrorState
          mensagem={consulta.error?.message ?? 'Não foi possível carregar a denúncia.'}
          onTentarDeNovo={() => void consulta.refetch()}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.conteudo}
          refreshControl={
            <RefreshControl
              refreshing={consulta.isRefetching}
              onRefresh={() => void consulta.refetch()}
            />
          }
        >
          <AvisoDeConexao />
          <Conteudo d={d} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Conteudo({ d }: { d: DenunciaDetalhe }) {
  const bairro = d.bairro.folha ? `${d.bairro.nome} (${d.bairro.folha})` : d.bairro.nome;
  const aberta = statusEmAberto(d.status);

  return (
    <>
      <Cartao>
        <StatusBadge status={d.status} />
        <Text style={[type.title2, styles.titulo]}>{rotuloDoTipo(d.tipo)}</Text>
        <Text style={[type.caption, styles.muted]}>Enviada em {formatarDataHora(d.criadoEm)}</Text>
      </Cartao>

      {d.status === 'IMPROCEDENTE' && d.justificativa ? (
        <Cartao>
          <Text accessibilityRole="header" style={[type.label, styles.rotulo]}>
            Justificativa da operadora
          </Text>
          <Aviso tom="atencao" icone="chatbox-ellipses-outline" anunciar={false}>
            {d.justificativa}
          </Aviso>
        </Cartao>
      ) : null}

      {aberta && d.previsaoReparo ? (
        <Cartao>
          <Text style={[type.label, styles.rotulo]}>Previsão de reparo</Text>
          <Text style={[type.title3, styles.texto]}>{formatarDataHora(d.previsaoReparo)}</Text>
        </Cartao>
      ) : null}

      <Cartao>
        <Text style={[type.label, styles.rotulo]}>Local</Text>
        <Text style={[type.title3, styles.texto]}>{d.logradouro}</Text>
        <Text style={[type.body, styles.muted]}>{bairro}</Text>
        {d.cep ? <Text style={[type.body, styles.muted]}>CEP {d.cep}</Text> : null}
        {d.pontoReferencia ? (
          <Text style={[type.body, styles.muted]}>Referência: {d.pontoReferencia}</Text>
        ) : null}
      </Cartao>

      {d.descricao ? (
        <Cartao>
          <Text style={[type.label, styles.rotulo]}>Descrição</Text>
          <Text style={[type.body, styles.texto]}>{d.descricao}</Text>
        </Cartao>
      ) : null}

      <Cartao>
        <Text accessibilityRole="header" style={[type.label, styles.rotulo]}>
          Histórico
        </Text>
        <StatusTimeline historico={d.historico} />
      </Cartao>
    </>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  conteudo: { padding: space.l, gap: space.m, paddingBottom: space.xxl },
  rotulo: { color: colors.textSecondary },
  titulo: { color: colors.textPrimary },
  texto: { color: colors.textPrimary },
  muted: { color: colors.textSecondary },
});

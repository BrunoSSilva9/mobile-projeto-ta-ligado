import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { formatarDataHora } from '@/features/acompanhamento/formatacao';
import { nomeDoBairro } from '@/features/denuncia/api';
import { useStatusDosBairros } from '@/features/ocorrencias/hooks';
import {
  CORES_DO_STATUS_DO_BAIRRO,
  redeEstavel,
  ROTULOS_DO_STATUS_DO_BAIRRO,
  type StatusDoBairro,
} from '@/features/ocorrencias/tipos';
import { useLocalizacaoAtual } from '@/providers/LocalizacaoProvider';
import { colors, radius, space, type } from '@/theme';

type Props = {
  /** "Olá, Maria!" na Home; "Localização atual" em Ocorrências. */
  titulo: string;
  /** `rede`: "Rede Estável / Instável" (Home, RN-008). `status`: Sem luz / Oscilação / Normal (T-04). */
  selo: 'rede' | 'status';
};

/** Selo colorido do status do bairro. A cor nunca é a única pista: o texto diz o mesmo. */
export function SeloDoBairro({ status, tipo }: { status: StatusDoBairro; tipo: Props['selo'] }) {
  const cor = CORES_DO_STATUS_DO_BAIRRO[status];
  const rotulo =
    tipo === 'rede'
      ? redeEstavel(status)
        ? 'Rede Estável'
        : 'Rede Instável'
      : ROTULOS_DO_STATUS_DO_BAIRRO[status];
  return (
    <View
      accessible
      accessibilityLabel={`Situação do bairro: ${rotulo}`}
      style={[styles.selo, { backgroundColor: cor.fundo }]}
    >
      <View style={[styles.ponto, { backgroundColor: cor.destaque }]} />
      <Text style={[type.label, { color: cor.texto }]}>{rotulo.toUpperCase()}</Text>
    </View>
  );
}

/**
 * Cartão com o bairro do usuário (RN-025) e a situação dele (RN-007). Cuida dos estados: buscando
 * o GPS, GPS indisponível, fora de Marabá e erro ao carregar o status.
 */
export function LocationStatusCard({ titulo, selo }: Props) {
  const gps = useLocalizacaoAtual();
  const status = useStatusDosBairros();

  const bairro = gps.bairroSugerido;
  const atual = bairro ? status.data?.bairros.find((b) => b.bairroId === bairro.id) : undefined;

  let corpo;
  if (gps.estado === 'buscando') {
    corpo = (
      <Text accessibilityRole="progressbar" style={[type.body, styles.texto]}>
        Buscando sua localização…
      </Text>
    );
  } else if (gps.estado !== 'ok') {
    corpo = (
      <>
        <Text style={[type.body, styles.texto]}>
          Não foi possível identificar o seu bairro. Ative a localização para ver a situação da sua
          rede.
        </Text>
        <View style={styles.acao}>
          <Button titulo="Tentar de novo" variante="secundario" onPress={gps.tentarDeNovo} />
        </View>
      </>
    );
  } else if (!bairro) {
    corpo = (
      <Text style={[type.body, styles.texto]}>
        Você parece estar fora da área de Marabá. A situação dos bairros aparece em Ocorrências.
      </Text>
    );
  } else if (status.isError && !atual) {
    corpo = (
      <>
        <Text accessibilityRole="alert" style={[type.body, styles.texto]}>
          {status.error.message}
        </Text>
        <View style={styles.acao}>
          <Button
            titulo="Tentar de novo"
            variante="secundario"
            onPress={() => void status.refetch()}
          />
        </View>
      </>
    );
  } else if (!atual) {
    corpo = (
      <Text accessibilityRole="progressbar" style={[type.body, styles.texto]}>
        Carregando a situação do bairro…
      </Text>
    );
  } else {
    corpo = (
      <>
        <SeloDoBairro status={atual.status} tipo={selo} />
        <Text style={[type.subtitle, styles.bairro]}>{nomeDoBairro(atual)}</Text>
        <Text style={[type.body, styles.texto]}>
          {atual.emAberto === 0
            ? 'Nenhuma denúncia em aberto no seu bairro.'
            : atual.emAberto === 1
              ? '1 denúncia em aberto no seu bairro.'
              : `${atual.emAberto} denúncias em aberto no seu bairro.`}
        </Text>
        {atual.previsaoReparo ? (
          <Text style={[type.body, styles.texto]}>
            Previsão de reparo: {formatarDataHora(atual.previsaoReparo)}
          </Text>
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.cartao}>
      <Text accessibilityRole="header" style={[type.h1, styles.titulo]}>
        {titulo}
      </Text>
      {corpo}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.cardLarge,
    padding: space.l,
    gap: space.s,
  },
  titulo: { color: colors.textPrimary },
  bairro: { color: colors.textPrimary },
  texto: { color: colors.textSecondary },
  acao: { alignItems: 'flex-start' },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.m,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  ponto: { width: 10, height: 10, borderRadius: radius.pill },
});

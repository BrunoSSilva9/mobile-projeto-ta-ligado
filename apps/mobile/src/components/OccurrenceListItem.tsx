import { StyleSheet, Text, View } from 'react-native';

import { formatarDataHora, tempoDesde } from '@/features/acompanhamento/formatacao';
import {
  corDaOcorrencia,
  rotuloDaOcorrencia,
  type OcorrenciaPublica,
} from '@/features/ocorrencias/tipos';
import { colors, radius, space, type } from '@/theme';

/**
 * Item da lista pública (RF-019, RN-014): só bairro, rua, descrição e horário. Não mostra
 * protocolo nem autor, e a ocorrência não abre detalhe (esse é só do autor, decisão S-24).
 */
export function OccurrenceListItem({
  ocorrencia: o,
  agoraMs,
}: {
  ocorrencia: OcorrenciaPublica;
  /** "Agora" em ms, vindo de fora para o texto "Há 5 min" ser previsível. */
  agoraMs: number;
}) {
  const bairro = o.folha ? `${o.bairro} (${o.folha})` : o.bairro;
  const rotulo = rotuloDaOcorrencia(o);
  return (
    <View
      accessible
      accessibilityLabel={`${rotulo}, ${bairro}, ${o.logradouro}, ${tempoDesde(o.criadoEm, agoraMs)}`}
      style={[styles.item, { borderLeftColor: corDaOcorrencia(o) }]}
    >
      <Text style={[type.label, styles.rotulo]}>{rotulo.toUpperCase()}</Text>
      <Text style={[type.subtitle, styles.bairro]}>{bairro}</Text>
      <Text style={[type.body, styles.texto]}>{o.logradouro}</Text>
      {o.descricao ? (
        <Text numberOfLines={2} style={[type.body, styles.texto]}>
          {o.descricao}
        </Text>
      ) : null}
      <Text style={[type.caption, styles.data]}>
        {formatarDataHora(o.criadoEm)} · {tempoDesde(o.criadoEm, agoraMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.card,
    borderLeftWidth: 6,
    padding: space.l,
    gap: space.half,
  },
  rotulo: { color: colors.textSecondary },
  bairro: { color: colors.textPrimary },
  texto: { color: colors.textSecondary },
  data: { color: colors.textMuted },
});

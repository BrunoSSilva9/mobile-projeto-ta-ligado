import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { EntradaDoHistorico } from '@/features/acompanhamento/api';
import { formatarDataHora } from '@/features/acompanhamento/formatacao';
import { rotuloDoStatus } from '@/features/acompanhamento/status';
import { andamentoDe } from '@/features/situacao';
import { colors, space, type } from '@/theme';

/** Lado do círculo com o ícone do andamento. */
const LADO = 32;

/**
 * O texto de uma entrada do histórico (RN-011): o nome do status ou, quando só a previsão de
 * reparo mudou (S-60), a previsão definida ou "Previsão de reparo removida".
 */
export function tituloDoHistorico(h: EntradaDoHistorico): string {
  if (h.evento !== 'PREVISAO') return rotuloDoStatus(h.statusNovo);
  return h.previsaoReparo
    ? `Previsão de reparo: ${formatarDataHora(h.previsaoReparo)}`
    : 'Previsão de reparo removida';
}

/**
 * Histórico de status em linha do tempo, do mais antigo ao mais recente (RF-036). Cada passo tem o
 * **ícone do andamento** (e o texto ao lado): a cor nunca é a única pista. As mudanças só da
 * previsão de reparo aparecem com um ícone de calendário e o texto da previsão.
 */
export function StatusTimeline({ historico }: { historico: readonly EntradaDoHistorico[] }) {
  return (
    <View accessibilityRole="list" style={styles.lista}>
      {historico.map((h, i) => {
        const ultimo = i === historico.length - 1;
        const previsao = h.evento === 'PREVISAO';
        const visual = colors.andamento[andamentoDe(h.statusNovo) ?? 'RECEBIDA'];
        const titulo = tituloDoHistorico(h);
        const descricao = `${titulo}, por ${h.por}, em ${formatarDataHora(h.criadoEm)}`;
        return (
          <View
            key={`${h.evento ?? 'STATUS'}-${h.statusNovo}-${h.criadoEm}-${i}`}
            accessible
            accessibilityLabel={descricao}
            style={styles.linha}
          >
            <View style={styles.coluna}>
              <View style={[styles.ponto, { backgroundColor: visual.fundo }]}>
                <Ionicons
                  name={previsao ? 'calendar-outline' : visual.icone}
                  size={18}
                  color={visual.texto}
                />
              </View>
              {!ultimo ? <View style={styles.fio} /> : null}
            </View>
            <View style={styles.texto}>
              <Text style={[type.label, { color: colors.textPrimary }]}>{titulo}</Text>
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {h.por} · {formatarDataHora(h.criadoEm)}
              </Text>
              {/* A previsão informada junto com a mudança de status (ex.: "Em atendimento"). */}
              {!previsao && h.previsaoReparo ? (
                <Text style={[type.body, { color: colors.textSecondary }]}>
                  {`Previsão de reparo: ${formatarDataHora(h.previsaoReparo)}`}
                </Text>
              ) : null}
              {h.justificativa ? (
                <Text style={[type.body, { color: colors.textSecondary }]}>{h.justificativa}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: 0 },
  linha: { flexDirection: 'row', gap: space.m },
  coluna: { alignItems: 'center', width: LADO },
  ponto: {
    width: LADO,
    height: LADO,
    borderRadius: LADO / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fio: { flex: 1, width: 2, backgroundColor: colors.borderSubtle, marginVertical: 2 },
  texto: { flex: 1, paddingBottom: space.l, gap: space.xs },
});

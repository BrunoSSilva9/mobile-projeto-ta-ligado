import { StyleSheet, Text, View } from 'react-native';

import type { EntradaDoHistorico } from '@/features/acompanhamento/api';
import { formatarDataHora } from '@/features/acompanhamento/formatacao';
import { corDoStatus, rotuloDoStatus } from '@/features/acompanhamento/status';
import { colors, space, type } from '@/theme';

/** Histórico de status em linha do tempo, do mais antigo ao mais recente (RF-036). */
export function StatusTimeline({ historico }: { historico: readonly EntradaDoHistorico[] }) {
  return (
    <View accessibilityRole="list" style={styles.lista}>
      {historico.map((h, i) => {
        const ultimo = i === historico.length - 1;
        const descricao = `${rotuloDoStatus(h.statusNovo)}, por ${h.por}, em ${formatarDataHora(h.criadoEm)}`;
        return (
          <View
            key={`${h.statusNovo}-${h.criadoEm}`}
            accessible
            accessibilityLabel={descricao}
            style={styles.linha}
          >
            <View style={styles.coluna}>
              <View style={[styles.ponto, { backgroundColor: corDoStatus(h.statusNovo) }]} />
              {!ultimo ? <View style={styles.fio} /> : null}
            </View>
            <View style={styles.texto}>
              <Text style={[type.subtitle, { color: colors.textPrimary }]}>
                {rotuloDoStatus(h.statusNovo)}
              </Text>
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {h.por} · {formatarDataHora(h.criadoEm)}
              </Text>
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
  coluna: { alignItems: 'center', width: 16 },
  ponto: { width: 14, height: 14, borderRadius: 7, marginTop: 4 },
  fio: { flex: 1, width: 2, backgroundColor: colors.bgMuted, marginVertical: 2 },
  texto: { flex: 1, paddingBottom: space.l, gap: space.half },
});

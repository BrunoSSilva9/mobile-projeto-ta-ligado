import { StyleSheet, Text } from 'react-native';

import { useEstadoDaConexao } from '@/providers/SocketProvider';
import { colors, radius, space, type } from '@/theme';

/** Faixa "Reconectando…" quando o tempo real caiu: o que está na tela pode estar desatualizado. */
export function AvisoDeConexao() {
  if (useEstadoDaConexao() !== 'reconectando') return null;
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[type.caption, styles.faixa]}
    >
      Reconectando… as atualizações em tempo real estão pausadas.
    </Text>
  );
}

const styles = StyleSheet.create({
  faixa: {
    backgroundColor: colors.status.flickerBg,
    color: colors.status.flickerText,
    borderRadius: radius.item,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
  },
});

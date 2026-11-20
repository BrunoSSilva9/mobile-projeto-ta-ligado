import { StyleSheet, Text } from 'react-native';

import { formatarDataHora } from '@/features/acompanhamento/formatacao';
import { useEstadoDaConexao } from '@/providers/SocketProvider';
import { useConectado, useUltimaAtualizacao } from '@/services/conectividade';
import { colors, radius, space, type } from '@/theme';

/**
 * Faixa de aviso de conexão (ADR-0005):
 * - sem rede no aparelho: "Sem conexão", com a data da última atualização (o que está na tela
 *   vem do cache). Em telas de formulário (`escrita`) lembra que o envio precisa de internet;
 * - rede ok, mas o tempo real caiu: "Reconectando…".
 */
export function AvisoDeConexao({ escrita = false }: { escrita?: boolean }) {
  const conectado = useConectado();
  const estado = useEstadoDaConexao();
  const ultima = useUltimaAtualizacao();

  let mensagem: string | null = null;
  if (!conectado) {
    mensagem = escrita
      ? 'Sem conexão. Você pode preencher: o rascunho fica salvo no aparelho, mas o envio precisa de internet.'
      : `Sem conexão. Você está vendo a última atualização${ultima ? `, de ${formatarDataHora(new Date(ultima).toISOString())}` : ''}.`;
  } else if (estado === 'reconectando') {
    mensagem = 'Reconectando… as atualizações em tempo real estão pausadas.';
  }
  if (!mensagem) return null;

  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[type.caption, styles.faixa]}
    >
      {mensagem}
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

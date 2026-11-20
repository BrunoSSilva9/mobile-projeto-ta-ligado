import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DenunciaResumo } from '@/features/acompanhamento/api';
import { formatarData } from '@/features/acompanhamento/formatacao';
import { rotuloDoStatus } from '@/features/acompanhamento/status';
import { rotuloDoTipo } from '@/features/denuncia/schemas';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, radius, size, space, type } from '@/theme';

/** Cartão de uma denúncia na lista "Minhas denúncias". Toda a área é um botão de 48 dp ou mais. */
export function ComplaintListItem({
  denuncia,
  onPress,
}: {
  denuncia: DenunciaResumo;
  onPress: () => void;
}) {
  const bairro = denuncia.folha ? `${denuncia.bairro} (${denuncia.folha})` : denuncia.bairro;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Protocolo ${denuncia.protocolo}, ${rotuloDoTipo(denuncia.tipo)}, ${bairro}, ${rotuloDoStatus(denuncia.status)}`}
      onPress={onPress}
      style={styles.cartao}
    >
      <View style={styles.topo}>
        <Text style={[type.subtitle, styles.protocolo]}>{denuncia.protocolo}</Text>
        <StatusBadge status={denuncia.status} />
      </View>
      <Text style={[type.body, styles.linha]}>
        {rotuloDoTipo(denuncia.tipo)} · {bairro}
      </Text>
      <Text style={[type.caption, styles.data]}>Enviada em {formatarData(denuncia.criadoEm)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    minHeight: size.touchMin,
    backgroundColor: colors.bgCard,
    borderRadius: radius.card,
    padding: space.l,
    gap: space.xs,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s,
  },
  protocolo: { color: colors.textPrimary, flexShrink: 1 },
  linha: { color: colors.textSecondary },
  data: { color: colors.textMuted },
});

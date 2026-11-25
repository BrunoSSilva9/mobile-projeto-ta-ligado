import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Cartao } from '@/components/Cartao';
import { StatusBadge } from '@/components/StatusBadge';
import type { DenunciaResumo } from '@/features/acompanhamento/api';
import { formatarData } from '@/features/acompanhamento/formatacao';
import { rotuloDoStatus } from '@/features/acompanhamento/status';
import { rotuloDoTipo } from '@/features/denuncia/schemas';
import { colors, size, space, type } from '@/theme';

/**
 * Cartão de uma denúncia na lista "Minhas denúncias": número, selo do andamento (ícone + texto),
 * tipo e bairro, data e "Ver" com seta. Toda a área é um botão de 48 dp ou mais.
 */
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
      accessibilityHint="Abre os detalhes da denúncia"
      onPress={onPress}
      style={styles.botao}
    >
      <Cartao style={styles.cartao}>
        <View style={styles.topo}>
          <Text style={[type.title3, styles.protocolo]}>{denuncia.protocolo}</Text>
          <StatusBadge status={denuncia.status} />
        </View>
        <Text style={[type.body, styles.linha]}>
          {rotuloDoTipo(denuncia.tipo)} · {bairro}
        </Text>
        <View style={styles.rodape}>
          <Text style={[type.caption, styles.data]}>
            Enviada em {formatarData(denuncia.criadoEm)}
          </Text>
          <View style={styles.ver}>
            <Text style={[type.label, { color: colors.action }]}>Ver</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.action} />
          </View>
        </View>
      </Cartao>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: { minHeight: size.touchMin },
  cartao: { gap: space.xs },
  topo: { gap: space.xs },
  protocolo: { color: colors.textPrimary },
  linha: { color: colors.textSecondary },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  data: { color: colors.textSecondary },
  ver: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});

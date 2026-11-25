import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SeloDeSituacao } from '@/components/SeloDeSituacao';
import { tempoDesde } from '@/features/acompanhamento/formatacao';
import type { LugarComAviso as Lugar } from '@/features/ocorrencias/agrupar';
import { rotuloDaSituacao } from '@/features/situacao';
import { colors, radius, size, space, type } from '@/theme';

/** "1 aviso" / "3 avisos". */
export const textoDosAvisos = (n: number) => (n === 1 ? '1 aviso' : `${n} avisos`);

type Props = {
  lugar: Lugar;
  /** "Agora" em ms, vindo de fora para o texto "Há 5 min" ser previsível. */
  agoraMs: number;
  /** Toque no cartão: centraliza o mapa no bairro. Sem ele, o cartão é só de leitura. */
  onVer?: () => void;
};

/**
 * Um item da lista "Lugares com aviso": o **cartão inteiro** é clicável. Selo da situação (ícone +
 * texto), nome do lugar em negrito, "Há X min · N avisos" e, à direita, "Ver" com seta. Só dados
 * públicos (RN-014): nada de protocolo nem de autor.
 */
export function LugarComAviso({ lugar, agoraMs, onVer }: Props) {
  const nome = lugar.folha ? `${lugar.nome} (${lugar.folha})` : lugar.nome;
  const quando = tempoDesde(lugar.maisRecente, agoraMs);
  const resumo = `${quando} · ${textoDosAvisos(lugar.avisos)}`;

  const conteudo = (
    <>
      <View style={styles.textos}>
        <SeloDeSituacao situacao={lugar.situacao} />
        <Text style={[type.title3, styles.nome]}>{nome}</Text>
        <Text style={[type.bodySmall, styles.resumo]}>{resumo}</Text>
      </View>
      {onVer ? (
        <View style={styles.ver}>
          <Text style={[type.label, { color: colors.action }]}>Ver</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.action} />
        </View>
      ) : null}
    </>
  );

  if (!onVer) {
    return (
      <View
        accessible
        accessibilityLabel={`${nome}, ${rotuloDaSituacao(lugar.situacao)}, ${resumo}`}
        style={styles.cartao}
      >
        {conteudo}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nome}, ${rotuloDaSituacao(lugar.situacao)}, ${resumo}`}
      accessibilityHint="Mostra o bairro no mapa"
      onPress={onVer}
      style={({ pressed }) => [styles.cartao, pressed && styles.pressionado]}
    >
      {conteudo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    minHeight: size.button + space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    padding: space.l,
    backgroundColor: colors.surface,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderColor: colors.borderDivider,
  },
  pressionado: { backgroundColor: colors.actionSoft },
  textos: { flex: 1, gap: space.xs },
  nome: { color: colors.textPrimary },
  resumo: { color: colors.textSecondary },
  ver: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});

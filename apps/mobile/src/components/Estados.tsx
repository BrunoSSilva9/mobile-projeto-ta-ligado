import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, space, type } from '@/theme';

/** Estados de tela que se repetem em todo o app (RNF-006): carregando, vazio e erro. */

export function LoadingState({ mensagem = 'Carregando…' }: { mensagem?: string }) {
  return (
    <View
      accessible
      style={styles.centro}
      accessibilityRole="progressbar"
      accessibilityLabel={mensagem}
    >
      <ActivityIndicator size="large" color={colors.action} />
      <Text style={[type.body, styles.texto]}>{mensagem}</Text>
    </View>
  );
}

export function EmptyState({
  titulo,
  descricao,
  acao,
  onAcao,
}: {
  titulo: string;
  descricao?: string;
  acao?: string;
  onAcao?: () => void;
}) {
  return (
    <View style={styles.centro}>
      <Ionicons name="file-tray-outline" size={40} color={colors.textMuted} />
      <Text accessibilityRole="header" style={[type.subtitle, styles.titulo]}>
        {titulo}
      </Text>
      {descricao ? <Text style={[type.body, styles.texto]}>{descricao}</Text> : null}
      {acao && onAcao ? <Button titulo={acao} onPress={onAcao} variante="secundario" /> : null}
    </View>
  );
}

export function ErrorState({
  mensagem,
  onTentarDeNovo,
}: {
  mensagem: string;
  onTentarDeNovo?: () => void;
}) {
  return (
    <View style={styles.centro}>
      <Ionicons name="alert-circle-outline" size={40} color={colors.status.noPower} />
      {/* O papel de alerta fica no texto: assim o botão abaixo continua sendo um elemento à parte. */}
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[type.body, styles.texto]}
      >
        {mensagem}
      </Text>
      {onTentarDeNovo ? <Button titulo="Tentar novamente" onPress={onTentarDeNovo} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center', gap: space.m, padding: space.xl },
  titulo: { color: colors.textPrimary, textAlign: 'center' },
  texto: { color: colors.textSecondary, textAlign: 'center' },
});

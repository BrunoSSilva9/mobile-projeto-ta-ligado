import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme';

/** Os 3 passos de "Como funciona", em frases curtas (Início e Ajuda). */
export const PASSOS_DO_COMO_FUNCIONA = [
  'Você avisa que a energia caiu.',
  'A Equatorial recebe o aviso na hora.',
  'Você acompanha aqui até a energia voltar.',
] as const;

/** "Como funciona": 3 passos numerados. Cada passo é lido como uma frase só ("Passo 1: …"). */
export function ComoFunciona() {
  return (
    <View style={styles.bloco}>
      <Text accessibilityRole="header" style={[type.title2, styles.titulo]}>
        Como funciona
      </Text>
      {PASSOS_DO_COMO_FUNCIONA.map((texto, i) => (
        <View
          key={texto}
          accessible
          accessibilityLabel={`Passo ${i + 1}: ${texto}`}
          style={styles.passo}
        >
          <View style={styles.numero}>
            <Text style={[type.button, { color: colors.onAction }]}>{i + 1}</Text>
          </View>
          <Text style={[type.body, styles.texto]}>{texto}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: space.m },
  titulo: { color: colors.textPrimary },
  passo: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  numero: {
    width: 36,
    height: 36,
    borderRadius: radius.pilula,
    backgroundColor: colors.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1, color: colors.textPrimary },
});

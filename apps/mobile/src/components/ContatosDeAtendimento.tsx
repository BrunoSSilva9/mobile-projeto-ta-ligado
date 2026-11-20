import { StyleSheet, Text, View } from 'react-native';

import { CONTATOS } from '@/config/constants';
import { colors, radius, space, type } from '@/theme';

/** Horário da Central e telefones (valores PLACEHOLDER, PEN-02: trocar em `constants.ts`). */
export function ContatosDeAtendimento() {
  return (
    <View style={styles.cartao}>
      <Text accessibilityRole="header" style={[type.subtitle, styles.titulo]}>
        Atendimento
      </Text>
      <Text style={[type.body, styles.texto]}>Central: {CONTATOS.centralHorario}</Text>
      <Text style={[type.body, styles.texto]}>Ouvidoria: {CONTATOS.ouvidoriaTelefone}</Text>
      <Text style={[type.body, styles.texto]}>
        Concessionária: {CONTATOS.concessionariaTelefone}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.cardLarge,
    padding: space.l,
    gap: space.xs,
  },
  titulo: { color: colors.textPrimary },
  texto: { color: colors.textSecondary },
});

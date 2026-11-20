import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { colors, radius, space, type } from '@/theme';

/** T-06: denúncia enviada. Mostra o protocolo (RF-012) e leva ao acompanhamento. */
export default function DenunciaEnviadaScreen() {
  const { id, protocolo } = useLocalSearchParams<{ id?: string; protocolo?: string }>();
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!protocolo) return;
    await Clipboard.setStringAsync(protocolo);
    setCopiado(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centro}>
        <View style={styles.icone}>
          <Ionicons name="checkmark" size={40} color={colors.white} />
        </View>
        <Text accessibilityRole="header" style={[type.h1Large, styles.titulo]}>
          Denúncia enviada!
        </Text>
        <Text style={[type.body, styles.texto]}>
          A operadora já recebeu sua denúncia. Guarde o número do protocolo para acompanhar.
        </Text>

        {protocolo ? (
          <View style={styles.cartao} accessible accessibilityLabel={`Protocolo ${protocolo}`}>
            <Text style={[type.label, styles.rotuloDoProtocolo]}>PROTOCOLO</Text>
            <Text selectable style={[type.h1, styles.protocolo]}>
              {protocolo}
            </Text>
          </View>
        ) : null}

        {protocolo ? (
          <Button
            titulo={copiado ? 'Protocolo copiado' : 'Copiar protocolo'}
            variante="secundario"
            icone={<Ionicons name="copy-outline" size={18} color={colors.textSecondary} />}
            onPress={() => void copiar()}
          />
        ) : null}
      </View>

      <View style={styles.acoes}>
        {id ? (
          <Button
            titulo="Acompanhar denúncia"
            onPress={() => router.replace({ pathname: '/denuncia/[id]', params: { id } })}
          />
        ) : null}
        <Button titulo="Voltar ao início" variante="texto" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage, padding: space.l },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.l },
  icone: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: colors.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { color: colors.textPrimary, textAlign: 'center' },
  texto: { color: colors.textSecondary, textAlign: 'center' },
  cartao: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: space.xs,
    padding: space.xl,
    borderRadius: radius.cardLarge,
    backgroundColor: colors.bgCard,
  },
  rotuloDoProtocolo: { color: colors.action },
  protocolo: { color: colors.textPrimary },
  acoes: { gap: space.s },
});

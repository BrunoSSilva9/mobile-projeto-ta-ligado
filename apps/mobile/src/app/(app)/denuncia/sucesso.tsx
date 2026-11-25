import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Cartao } from '@/components/Cartao';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, space, type } from '@/theme';

/**
 * T-06 · Denúncia enviada (RF-012). Confirma o envio, mostra o número da denúncia (protocolo), o
 * selo "Recebida" e o local, e leva ao acompanhamento. O local vem pela rota (`bairro` e
 * `logradouro`, que o app já tem ao enviar); sem eles o cartão mostra só o número.
 */
export default function DenunciaEnviadaScreen() {
  const { id, protocolo, bairro, logradouro } = useLocalSearchParams<{
    id?: string;
    protocolo?: string;
    bairro?: string;
    logradouro?: string;
  }>();
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!protocolo) return;
    await Clipboard.setStringAsync(protocolo);
    setCopiado(true);
  };

  const local = [logradouro, bairro].filter(Boolean).join(', ');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.centro}>
        <View style={styles.icone}>
          <Ionicons name="checkmark" size={48} color={colors.situacao.normal.texto} />
        </View>
        <Text accessibilityRole="header" style={[type.title1, styles.titulo]}>
          Denúncia enviada!
        </Text>
        <Text style={[type.body, styles.texto]}>
          A Equatorial já recebeu seu aviso. Vamos te avisar aqui quando a equipe estiver a caminho.
        </Text>

        {protocolo ? (
          <Cartao style={styles.cartao}>
            <View accessible accessibilityLabel={`Protocolo ${protocolo}`} style={styles.numero}>
              <Text style={[type.label, styles.apoio]}>Número da denúncia</Text>
              <Text selectable style={[type.title2, styles.protocolo]}>
                {protocolo}
              </Text>
            </View>
            <StatusBadge status="RECEBIDA" />
            {local ? (
              <View style={styles.local}>
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                <Text style={[type.body, styles.localTexto]}>{local}</Text>
              </View>
            ) : null}
            <Button
              titulo={copiado ? 'Protocolo copiado' : 'Copiar protocolo'}
              variante="secundario"
              nomeDoIcone="copy-outline"
              onPress={() => void copiar()}
            />
          </Cartao>
        ) : null}
      </ScrollView>

      <View style={styles.acoes}>
        {id ? (
          <Button
            titulo="Acompanhar minha denúncia"
            onPress={() => router.replace({ pathname: '/denuncia/[id]', params: { id } })}
          />
        ) : null}
        <Button
          titulo="Voltar ao início"
          variante="secundario"
          onPress={() => router.replace('/')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPage },
  centro: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.l,
    padding: space.l,
  },
  icone: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.situacao.normal.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { color: colors.textPrimary, textAlign: 'center' },
  texto: { color: colors.textSecondary, textAlign: 'center' },
  apoio: { color: colors.textSecondary },
  cartao: { alignSelf: 'stretch', gap: space.m },
  numero: { gap: space.xs },
  protocolo: { color: colors.textPrimary },
  local: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  localTexto: { flex: 1, color: colors.textPrimary },
  acoes: {
    gap: space.s,
    padding: space.l,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});

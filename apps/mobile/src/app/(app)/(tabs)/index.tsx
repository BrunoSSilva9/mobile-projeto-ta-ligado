import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BannerDenunciar } from '@/components/BannerDenunciar';
import { ContatosDeAtendimento } from '@/components/ContatosDeAtendimento';
import { LocationStatusCard } from '@/components/LocationStatusCard';
import { Logo } from '@/components/Logo';
import { MapaOcorrencias } from '@/components/MapaOcorrencias';
import { useStatusDosBairros } from '@/features/ocorrencias/hooks';
import { useSessao } from '@/store/session';
import { colors, hitSlopFor, radius, size, space, type } from '@/theme';

const PASSOS = [
  { titulo: 'Notifique a queda em 2 cliques', texto: 'Escolha o tipo e confirme o local.' },
  { titulo: 'Mapeamos a área afetada', texto: 'Sua denúncia aparece no mapa, sem seus dados.' },
  {
    titulo: 'Cobramos a concessionária',
    texto: 'O protocolo chega ao painel da operadora na hora.',
  },
] as const;

/** T-03: início. Situação da rede do bairro, chamada para denunciar e mini-mapa (RF-016, RF-023). */
export default function InicioScreen() {
  const nome = useSessao((s) => s.usuario?.nome ?? '');
  const primeiroNome = nome.trim().split(/\s+/)[0] ?? '';
  const status = useStatusDosBairros();

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <View style={styles.cabecalho}>
        <Logo />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Meu perfil"
          hitSlop={hitSlopFor(size.touchMin)}
          onPress={() => router.push('/perfil')}
          style={styles.perfil}
        >
          <Ionicons name="person" size={22} color={colors.brand900} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <LocationStatusCard titulo={`Olá, ${primeiroNome}!`} selo="rede" />

        <BannerDenunciar
          titulo="Faltou energia? Denuncie agora e ajude a resolver mais rápido!"
          botao="Registre sua denúncia"
        />

        <View style={styles.secao}>
          <Text accessibilityRole="header" style={[type.title, styles.tituloDaSecao]}>
            Descubra onde pode estar sem energia
          </Text>
          {status.data ? (
            <MapaOcorrencias bairros={status.data.bairros} compacto />
          ) : status.isError ? (
            <Text accessibilityRole="alert" style={[type.body, styles.texto]}>
              {status.error.message}
            </Text>
          ) : (
            <Text accessibilityRole="progressbar" style={[type.body, styles.texto]}>
              Carregando o mapa…
            </Text>
          )}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Ver mapa ampliado"
            onPress={() => router.push('/ocorrencias')}
            style={styles.link}
          >
            <Text style={[type.button, { color: colors.action }]}>Ver mapa ampliado</Text>
          </Pressable>
        </View>

        <View style={styles.secao}>
          <Text accessibilityRole="header" style={[type.title, styles.tituloDaSecao]}>
            Como funciona
          </Text>
          {PASSOS.map((p, i) => (
            <View
              key={p.titulo}
              accessible
              accessibilityLabel={`Passo ${i + 1}: ${p.titulo}. ${p.texto}`}
              style={styles.passo}
            >
              <View style={styles.numero}>
                <Text style={[type.button, { color: colors.white }]}>{i + 1}</Text>
              </View>
              <View style={styles.passoTexto}>
                <Text style={[type.subtitle, { color: colors.textPrimary }]}>{p.titulo}</Text>
                <Text style={[type.body, styles.texto]}>{p.texto}</Text>
              </View>
            </View>
          ))}
        </View>

        <ContatosDeAtendimento />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  cabecalho: {
    height: size.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
  },
  perfil: {
    width: size.touchMin,
    height: size.touchMin,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
  secao: { gap: space.m },
  tituloDaSecao: { color: colors.textPrimary },
  texto: { color: colors.textSecondary },
  link: { minHeight: size.touchMin, justifyContent: 'center', alignSelf: 'flex-start' },
  passo: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start' },
  numero: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoTexto: { flex: 1, gap: space.half },
});

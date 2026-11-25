import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoDeConexao } from '@/components/AvisoDeConexao';
import { BotaoLigar } from '@/components/BotaoLigar';
import { Button } from '@/components/Button';
import { Cartao } from '@/components/Cartao';
import { CartaoEnergiaDoBairro } from '@/components/CartaoEnergiaDoBairro';
import { ComoFunciona } from '@/components/ComoFunciona';
import { Logo } from '@/components/Logo';
import { CONTATOS } from '@/config/constants';
import { useSessao } from '@/store/session';
import { colors, radius, size, space, type } from '@/theme';

/**
 * T-03: início (design system v2). Uma ação principal ("Fazer denúncia"), a energia do bairro agora,
 * dois atalhos, "Como funciona" e o contato por telefone. O mapa fica só na aba Mapa.
 */
export default function InicioScreen() {
  const nome = useSessao((s) => s.usuario?.nome ?? '');
  const primeiroNome = nome.trim().split(/\s+/)[0] ?? '';

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <View style={styles.cabecalho}>
        <Logo />
        <Button
          titulo="Ajuda"
          variante="texto"
          nomeDoIcone="help-circle-outline"
          onPress={() => router.push('/ajuda')}
        />
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <AvisoDeConexao />

        <Text accessibilityRole="header" style={[type.title1, styles.ola]}>
          {`Olá, ${primeiroNome}`}
        </Text>

        <CartaoEnergiaDoBairro />

        <Cartao destaque style={styles.acaoPrincipal}>
          <Text accessibilityRole="header" style={[type.title2, styles.titulo]}>
            Ficou sem energia?
          </Text>
          <Text style={[type.body, styles.texto]}>
            Avise a Equatorial por aqui. Leva menos de 1 minuto.
          </Text>
          <Button
            titulo="Fazer denúncia"
            nomeDoIcone="flash-off"
            onPress={() => router.push('/denunciar')}
          />
        </Cartao>

        <View style={styles.atalhos}>
          <Atalho
            icone="map-outline"
            titulo="Ver onde falta energia"
            onPress={() => router.push('/ocorrencias')}
          />
          <Atalho
            icone="document-text-outline"
            titulo="Minhas denúncias"
            onPress={() => router.push('/minhas-denuncias')}
          />
        </View>

        <ComoFunciona />

        <Cartao>
          <Text accessibilityRole="header" style={[type.title3, styles.titulo]}>
            Prefere falar com alguém?
          </Text>
          <Text style={[type.body, styles.texto]}>Central: {CONTATOS.centralHorario}</Text>
          <BotaoLigar />
        </Cartao>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Atalho: cartão branco inteiro tocável, com o ícone num quadrado `actionSoft` e o texto em negrito. */
function Atalho({
  icone,
  titulo,
  onPress,
}: {
  icone: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      onPress={onPress}
      style={({ pressed }) => [styles.atalho, pressed && styles.atalhoPressionado]}
    >
      <View style={styles.iconeDoAtalho}>
        <Ionicons name={icone} size={28} color={colors.action} />
      </View>
      <Text style={[type.label, styles.textoDoAtalho]}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  cabecalho: {
    minHeight: size.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
  },
  conteudo: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
  ola: { color: colors.textPrimary },
  titulo: { color: colors.textPrimary },
  texto: { color: colors.textSecondary },
  acaoPrincipal: { gap: space.m },
  atalhos: { flexDirection: 'row', gap: space.m },
  atalho: {
    flex: 1,
    minHeight: size.button + space.xl,
    gap: space.s,
    padding: space.l,
    backgroundColor: colors.surface,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderColor: colors.borderDivider,
  },
  atalhoPressionado: { backgroundColor: colors.actionSoft },
  iconeDoAtalho: {
    width: 48,
    height: 48,
    borderRadius: radius.botao,
    backgroundColor: colors.actionSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoDoAtalho: { color: colors.textPrimary },
});

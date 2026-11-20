import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopAuthBar } from '@/components/TopAuthBar';
import { APP } from '@/config/constants';
import { colors, radius, space, type } from '@/theme';

type Props = {
  ativo: 'entrar' | 'cadastrar';
  titulo: string;
  subtitulo: string;
  tituloDoCartao: string;
  children: ReactNode;
  /** Conteúdo logo abaixo do cartão (ex.: o link para trocar entre entrar e cadastrar). */
  rodapeDoCartao?: ReactNode;
};

/** Estrutura compartilhada de T-01 (cadastro) e T-02 (login): barra, título, cartão verde e rodapé. */
export function AuthLayout({
  ativo,
  titulo,
  subtitulo,
  tituloDoCartao,
  children,
  rodapeDoCartao,
}: Props) {
  return (
    <SafeAreaView style={styles.tela} edges={['top', 'bottom']}>
      <TopAuthBar ativo={ativo} />
      <KeyboardAvoidingView
        style={styles.fluxo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cabecalho}>
            <Text accessibilityRole="header" style={[type.h1, styles.titulo]}>
              {titulo}
            </Text>
            <Text style={[type.body, styles.subtitulo]}>{subtitulo}</Text>
          </View>

          <View style={styles.cartao}>
            <View style={styles.cartaoCabecalho}>
              <Text accessibilityRole="header" style={[type.subtitle, styles.cartaoTitulo]}>
                {tituloDoCartao}
              </Text>
              <View style={styles.selo}>
                <Text style={[type.label, styles.seloTexto]}>
                  {APP.cidade} • {APP.uf}
                </Text>
              </View>
            </View>
            {children}
          </View>

          {rodapeDoCartao}

          <Text style={[type.caption, styles.rodape]}>{APP.rodape}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: colors.bgPage },
  fluxo: { flex: 1 },
  conteudo: { padding: space.l, gap: space.l },
  cabecalho: { gap: space.s, alignItems: 'center' },
  titulo: { color: colors.textPrimary, textAlign: 'center' },
  subtitulo: { color: colors.textSecondary, textAlign: 'center' },
  cartao: {
    backgroundColor: colors.brand900,
    borderRadius: radius.cardLarge,
    padding: space.l,
    gap: space.m,
  },
  cartaoCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartaoTitulo: { color: colors.white },
  selo: {
    backgroundColor: 'rgba(218,229,220,0.2)',
    borderRadius: radius.pill,
    paddingHorizontal: space.s,
    paddingVertical: space.half,
  },
  seloTexto: { color: colors.surfaceMint },
  rodape: { color: colors.textMuted, textAlign: 'center', paddingBottom: space.m },
});

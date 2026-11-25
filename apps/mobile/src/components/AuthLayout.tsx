import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cartao } from '@/components/Cartao';
import { TopAuthBar } from '@/components/TopAuthBar';
import { APP } from '@/config/constants';
import { colors, space, type } from '@/theme';

type Props = {
  ativo: 'entrar' | 'cadastrar';
  titulo: string;
  subtitulo: string;
  tituloDoCartao: string;
  children: ReactNode;
  /** Conteúdo logo abaixo do cartão (ex.: o link para trocar entre entrar e cadastrar). */
  rodapeDoCartao?: ReactNode;
};

/**
 * Estrutura compartilhada de T-01 (cadastro) e T-02 (login), no design system v2: fundo `bgPage`,
 * barra com a marca, título, **cartão branco** com o formulário e rodapé. O azul-noite fica só no
 * logo (decisão R-10).
 */
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
            <Text accessibilityRole="header" style={[type.title1, styles.titulo]}>
              {titulo}
            </Text>
            <Text style={[type.body, styles.subtitulo]}>{subtitulo}</Text>
          </View>

          <Cartao style={styles.cartao}>
            <Text accessibilityRole="header" style={[type.title3, styles.tituloDoCartao]}>
              {tituloDoCartao}
            </Text>
            {children}
          </Cartao>

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
  cabecalho: { gap: space.s },
  titulo: { color: colors.textPrimary },
  subtitulo: { color: colors.textSecondary },
  cartao: { gap: space.m },
  tituloDoCartao: { color: colors.textPrimary },
  rodape: { color: colors.textSecondary, textAlign: 'center', paddingBottom: space.m },
});

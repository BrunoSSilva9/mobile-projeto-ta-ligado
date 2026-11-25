import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, size, space, type } from '@/theme';

type NomeDoIcone = ComponentProps<typeof Ionicons>['name'];

/** Pílula do ícone de cada item da barra: 56 × 32 dp. */
const PILULA = { largura: 56, altura: 32 } as const;

/** Estilo do texto dos itens da barra: 14, negrito (o menor texto do app, nunca menos). */
export const ESTILO_DO_TEXTO_DA_BARRA = {
  ...type.caption,
  fontFamily: fontFamily.bold,
} as const;

/** Cores e medidas da barra inferior: branco sólido, borda superior, sem sombra. */
export const ESTILO_DA_BARRA = {
  backgroundColor: colors.surface,
  borderTopWidth: 1,
  borderTopColor: colors.borderSubtle,
  elevation: 0,
  shadowOpacity: 0,
} as const;

/** Altura da barra sem a área segura: pílula de 32 + texto de 20 + respiros. Cresce com a fonte. */
export const ALTURA_DA_BARRA = 80;

/**
 * Ícone de um item da barra. **Ativo:** o ícone fica numa pílula `actionTabPill` (a cor do texto e
 * do ícone vem da barra: `actionPressed`). **Inativo:** sem pílula, na cor de apoio. O item sempre
 * tem texto ao lado (a barra mostra o rótulo de cada aba).
 */
export function IconeDaAba({
  ativo,
  inativo,
  focado,
  cor,
}: {
  ativo: NomeDoIcone;
  inativo: NomeDoIcone;
  focado: boolean;
  cor: string;
}) {
  return (
    <View testID="pilula-da-aba" style={[styles.pilula, focado && styles.pilulaAtiva]}>
      <Ionicons name={focado ? ativo : inativo} size={24} color={cor} />
    </View>
  );
}

/**
 * Item "Denunciar" da barra: um item normal, **sem botão flutuante**. O ícone fica numa pílula azul
 * cheia (56 × 32) e o texto, em azul. Abre o formulário (modal), não troca de aba.
 */
export function ItemDenunciarDaBarra() {
  return (
    <View style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Denunciar"
        accessibilityHint="Abre o formulário para avisar que faltou energia"
        onPress={() => router.push('/denunciar')}
        style={styles.toque}
      >
        {({ pressed }) => (
          <>
            <View style={[styles.pilula, styles.pilulaAzul, pressed && styles.pilulaPressionada]}>
              <Ionicons name="flash-off" size={24} color={colors.onAction} />
            </View>
            <Text style={[ESTILO_DO_TEXTO_DA_BARRA, { color: colors.action }]}>Denunciar</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toque: {
    minHeight: size.touchMin,
    minWidth: size.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  pilula: {
    width: PILULA.largura,
    height: PILULA.altura,
    borderRadius: radius.pilula,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilulaAtiva: { backgroundColor: colors.actionTabPill },
  pilulaAzul: { backgroundColor: colors.action },
  pilulaPressionada: { backgroundColor: colors.actionPressed },
});

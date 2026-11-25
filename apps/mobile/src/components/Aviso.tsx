import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme';

export type TomDoAviso = 'erro' | 'atencao' | 'info';

type Props = {
  tom: TomDoAviso;
  /** Texto do aviso: uma frase dizendo o que houve e como resolver. */
  children: string;
  /** Troca o ícone padrão do tom. */
  icone?: ComponentProps<typeof Ionicons>['name'];
  /** `false` para avisos que já estão na tela ao abrir (não são anunciados como alerta). */
  anunciar?: boolean;
  testID?: string;
};

const VISUAL = {
  erro: { ...colors.situacao.semEnergia, icone: 'warning' },
  atencao: { ...colors.situacao.oscilando, icone: 'alert-circle' },
  info: { texto: colors.actionPressed, fundo: colors.actionSoft, icone: 'information-circle' },
} as const;

/**
 * Faixa de aviso com **ícone e texto** (a cor nunca é a única pista): erro, atenção ou informação.
 * O papel de alerta fica no `Text`, não no `View` (um `View` acessível agruparia os filhos).
 */
export function Aviso({ tom, children, icone, anunciar = true, testID }: Props) {
  const visual = VISUAL[tom];
  return (
    <View testID={testID} style={[styles.faixa, { backgroundColor: visual.fundo }]}>
      <Ionicons
        name={icone ?? visual.icone}
        size={22}
        color={visual.texto}
        importantForAccessibility="no"
      />
      <Text
        accessibilityRole={anunciar ? 'alert' : undefined}
        accessibilityLiveRegion={anunciar ? 'polite' : undefined}
        style={[type.bodySmall, styles.texto, { color: visual.texto }]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s,
    padding: space.m,
    borderRadius: radius.campo,
  },
  texto: { flex: 1 },
});

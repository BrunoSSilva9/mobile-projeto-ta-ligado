import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ALTURA_DA_BARRA,
  ESTILO_DA_BARRA,
  ESTILO_DO_TEXTO_DA_BARRA,
  IconeDaAba,
  ItemDenunciarDaBarra,
} from '@/components/BarraInferior';
import { colors, size, space } from '@/theme';

function icone(ativo: React.ComponentProps<typeof IconeDaAba>['ativo'], inativo: typeof ativo) {
  // eslint-disable-next-line react/display-name
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <IconeDaAba ativo={ativo} inativo={inativo} focado={focused} cor={color as string} />
  );
}

/**
 * Barra inferior (componente C-01, design system v2): **Início, Mapa, Denunciar e Perfil**, todos
 * com ícone e texto (14, negrito). Sem botão flutuante. A aba "Mapa" é a rota `/ocorrencias`: só o
 * texto mudou. Fundo branco sólido com borda superior; aba ativa com pílula e texto `actionPressed`.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.actionPressed,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: ESTILO_DO_TEXTO_DA_BARRA,
        tabBarStyle: {
          ...ESTILO_DA_BARRA,
          height: ALTURA_DA_BARRA + insets.bottom,
          paddingTop: space.s,
          paddingBottom: Math.max(insets.bottom, space.s),
        },
        tabBarItemStyle: { minHeight: size.touchMin, gap: space.xs },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarAccessibilityLabel: 'Início',
          tabBarIcon: icone('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="ocorrencias"
        options={{
          title: 'Mapa',
          tabBarAccessibilityLabel: 'Mapa',
          tabBarIcon: icone('map', 'map-outline'),
        }}
      />
      {/* "Denunciar": item normal que abre o modal T-05. O arquivo fab.tsx é só um marcador. */}
      <Tabs.Screen
        name="fab"
        options={{
          title: 'Denunciar',
          tabBarButton: () => <ItemDenunciarDaBarra />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarAccessibilityLabel: 'Perfil',
          tabBarIcon: icone('person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReportFab } from '@/components/ReportFab';
import { colors, size, type } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  // eslint-disable-next-line react/display-name
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={22} color={color as string} />
  );
}

/**
 * Barra inferior (componente C-01): Início, Ocorrências, Denunciar (FAB) e Perfil.
 * Cada item tem altura mínima de 48 dp (decisão D-02).
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.action,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { ...type.label, fontSize: 12 },
        tabBarStyle: {
          height: size.tabBar + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderTopWidth: 0,
          elevation: 8,
        },
        tabBarItemStyle: { minHeight: size.touchMin },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarAccessibilityLabel: 'Início',
          tabBarIcon: tabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="ocorrencias"
        options={{
          title: 'Ocorrências',
          tabBarAccessibilityLabel: 'Ocorrências',
          tabBarIcon: tabIcon('map', 'map-outline'),
        }}
      />
      {/* Botão central: abre o modal T-05. O arquivo fab.tsx desta pasta é só um marcador. */}
      <Tabs.Screen
        name="fab"
        options={{
          title: 'Denunciar',
          tabBarButton: () => <ReportFab />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarAccessibilityLabel: 'Perfil',
          tabBarIcon: tabIcon('person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}

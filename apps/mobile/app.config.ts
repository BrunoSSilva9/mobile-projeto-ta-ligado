import type { ExpoConfig } from 'expo/config';

/**
 * Configuração do app. Variáveis sensíveis vêm do ambiente (ver .env.example).
 * - GOOGLE_MAPS_API_KEY: só é necessária em builds próprios (development build/produção).
 *   No Expo Go o mapa funciona sem chave.
 */
const config: ExpoConfig = {
  name: 'Tá Ligado?',
  slug: 'ta-ligado',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'taligado',
  userInterfaceStyle: 'light', // sem modo escuro no MVP (backlog B-107)
  icon: './assets/images/icon.png', // PEN-09: ícone final pendente
  ios: {
    bundleIdentifier: 'br.edu.unifesspa.taligado',
    supportsTablet: false,
  },
  android: {
    package: 'br.edu.unifesspa.taligado',
    adaptiveIcon: {
      backgroundColor: '#16382B',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    ...(process.env.GOOGLE_MAPS_API_KEY
      ? { config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY } } }
      : {}),
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        // Só "ao usar o app": a localização é usada apenas para marcar o local da denúncia (LGPD).
        locationWhenInUsePermission:
          'O Tá Ligado? usa sua localização apenas para marcar o local da denúncia de falta de energia.',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#16382B',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;

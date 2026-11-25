import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ProvedorDeCache } from '@/providers/ProvedorDeCache';
import { configurarConectividade } from '@/services/conectividade';
import { useSessao } from '@/store/session';
import { colors, type } from '@/theme';

SplashScreen.preventAutoHideAsync();

const CABECALHO_LEGAL = {
  headerShown: true,
  headerBackTitle: 'Voltar',
  headerTintColor: colors.action,
  headerStyle: { backgroundColor: colors.bgPage },
  headerTitleStyle: { ...type.subtitle, color: colors.textPrimary },
} as const;

export default function RootLayout() {
  const [fontesProntas, erroNasFontes] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });
  const sessaoPronta = useSessao((s) => s.hidratada);
  const logado = useSessao((s) => s.token !== null);

  // Lê a sessão salva no aparelho e liga as consultas à rede e ao primeiro plano (uma vez, ao abrir).
  useEffect(() => {
    configurarConectividade();
    void useSessao.getState().hidratar();
  }, []);

  const pronto = (fontesProntas || erroNasFontes !== null) && sessaoPronta;

  useEffect(() => {
    if (pronto) void SplashScreen.hideAsync();
  }, [pronto]);

  // Mantém a tela de abertura até saber se há sessão: evita piscar o login para quem já entrou.
  if (!pronto) return null;

  return (
    <ProvedorDeCache>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgPage } }}
      >
        {/* Sem sessão: só as telas de acesso. Com sessão, elas deixam de existir. */}
        <Stack.Protected guard={!logado} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        {/* Com sessão: o app. Sem sessão, qualquer rota daqui leva ao login. */}
        <Stack.Protected guard={logado} redirectTo="/login">
          <Stack.Screen name="(app)" />
        </Stack.Protected>

        {/* Textos legais: abertos em qualquer situação (o cadastro precisa deles). */}
        <Stack.Screen name="termos" options={{ ...CABECALHO_LEGAL, title: 'Termos de Uso' }} />
        <Stack.Screen
          name="privacidade"
          options={{ ...CABECALHO_LEGAL, title: 'Política de Privacidade' }}
        />
      </Stack>
    </ProvedorDeCache>
  );
}

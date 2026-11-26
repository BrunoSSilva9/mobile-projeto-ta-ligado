import { Stack } from 'expo-router';

import { LocalizacaoProvider } from '@/providers/LocalizacaoProvider';
import { SocketProvider } from '@/providers/SocketProvider';

/**
 * Área logada: as abas, o formulário de denúncia (T-05, modal), o acompanhamento (T-07, T-09) e a
 * conexão em tempo real, que existe só enquanto há sessão.
 */
export default function AppLayout() {
  return (
    <SocketProvider>
      <LocalizacaoProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="denunciar" options={{ presentation: 'modal' }} />
          <Stack.Screen name="denuncia/sucesso" options={{ gestureEnabled: false }} />
          <Stack.Screen name="denuncia/[id]" />
          <Stack.Screen name="minhas-denuncias" />
          <Stack.Screen name="ajuda" />
          <Stack.Screen name="perfil/editar" />
          <Stack.Screen name="perfil/excluir" />
        </Stack>
      </LocalizacaoProvider>
    </SocketProvider>
  );
}

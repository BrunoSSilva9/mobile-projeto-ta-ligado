import { Stack } from 'expo-router';

/** Área logada: as abas e o formulário de denúncia (T-05), aberto como modal pelo botão central. */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="denunciar" options={{ presentation: 'modal' }} />
      <Stack.Screen name="denuncia/sucesso" options={{ gestureEnabled: false }} />
      <Stack.Screen name="denuncia/[id]" />
    </Stack>
  );
}

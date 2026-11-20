import { Stack } from 'expo-router';

/** Telas de acesso (sem sessão): login (T-02) e cadastro (T-01). */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}

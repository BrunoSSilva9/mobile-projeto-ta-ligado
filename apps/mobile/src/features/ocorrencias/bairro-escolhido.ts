import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bairro que o usuário escolheu em "Trocar" (cartão "Energia no seu bairro agora"). Fica salvo
 * **só no aparelho** (AsyncStorage): não vai para o cadastro nem para a API. Uma chave por usuário,
 * como o rascunho, para uma conta não ver a escolha de outra.
 */
export const chaveDoBairroEscolhido = (usuarioId: string) =>
  `taligado.bairro-escolhido.${usuarioId}`;

/** Aceita só um id de bairro válido (inteiro positivo); qualquer outra coisa lida do disco é descartada. */
function sanear(bruto: unknown): number | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const id = (bruto as Record<string, unknown>).bairroId;
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
}

export async function lerBairroEscolhido(usuarioId: string): Promise<number | null> {
  try {
    const texto = await AsyncStorage.getItem(chaveDoBairroEscolhido(usuarioId));
    return texto ? sanear(JSON.parse(texto)) : null;
  } catch {
    return null; // disco com problema ou JSON corrompido: volta a usar a localização
  }
}

export async function salvarBairroEscolhido(usuarioId: string, bairroId: number): Promise<void> {
  try {
    if (sanear({ bairroId }) === null) return;
    await AsyncStorage.setItem(chaveDoBairroEscolhido(usuarioId), JSON.stringify({ bairroId }));
  } catch {
    // Falhar ao guardar a escolha nunca atrapalha: ela vale até fechar o app.
  }
}

export async function limparBairroEscolhido(usuarioId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(chaveDoBairroEscolhido(usuarioId));
  } catch {
    // Sem efeito: a escolha antiga será sobrescrita na próxima.
  }
}

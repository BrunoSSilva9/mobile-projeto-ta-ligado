import { act } from '@testing-library/react';
import { vi } from 'vitest';

/** Socket falso criado por `tests/setup.ts`. */
export type SocketFalso = {
  url: string | undefined;
  opcoes: { auth: { token: string }; transports: string[] };
  disconnect: ReturnType<typeof vi.fn>;
  __emitir: (evento: string, ...args: unknown[]) => void;
};

const todos = async () =>
  ((await import('socket.io-client')) as unknown as { __sockets: SocketFalso[] }).__sockets;

export async function socketsCriados() {
  return todos();
}

export async function ultimoSocket() {
  return (await todos()).at(-1);
}

export async function limparSockets() {
  (await todos()).length = 0;
}

/** Dispara um evento do servidor dentro do `act` (o React atualiza a tela). */
export async function emitir(evento: string, ...args: unknown[]) {
  const socket = await ultimoSocket();
  if (!socket) throw new Error('Nenhum socket aberto');
  await act(async () => socket.__emitir(evento, ...args));
}

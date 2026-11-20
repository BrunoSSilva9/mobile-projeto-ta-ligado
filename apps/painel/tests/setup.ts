import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

// Socket.IO: cliente falso e controlável (ver `tests/socket.ts`). Nenhum teste abre conexão de rede.
vi.mock('socket.io-client', () => {
  const sockets: unknown[] = [];
  const io = (url: string | undefined, opcoes: unknown) => {
    const ouvintes: Record<string, Array<(...a: unknown[]) => void>> = {};
    const socket = {
      url,
      opcoes,
      connected: false,
      on(evento: string, fn: (...a: unknown[]) => void) {
        (ouvintes[evento] ??= []).push(fn);
        return socket;
      },
      removeAllListeners() {
        for (const k of Object.keys(ouvintes)) delete ouvintes[k];
        return socket;
      },
      disconnect: vi.fn(() => {
        socket.connected = false;
      }),
      __emitir(evento: string, ...args: unknown[]) {
        (ouvintes[evento] ?? []).forEach((fn) => fn(...args));
      },
    };
    sockets.push(socket);
    return socket;
  };
  return { io, __sockets: sockets };
});

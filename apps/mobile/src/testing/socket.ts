/** Socket falso criado por `jest.setup.js`. */
export type SocketFalso = {
  url: string;
  opcoes: { auth: { token: string }; transports: string[] };
  connected: boolean;
  disconnect: jest.Mock;
  __emitir: (evento: string, ...args: unknown[]) => void;
};

const sockets = () =>
  (jest.requireMock('socket.io-client') as { __sockets: SocketFalso[] }).__sockets;

/** Todos os sockets abertos desde o último `limparSockets()`. */
export const socketsCriados = (): SocketFalso[] => sockets();

export const ultimoSocket = (): SocketFalso | undefined => sockets().at(-1);

export function limparSockets() {
  sockets().length = 0;
}

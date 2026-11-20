import { io, type Socket } from 'socket.io-client';

import { API_URL } from '@/config/constants';

export type EstadoDaConexao = 'conectando' | 'conectado' | 'reconectando';

export type OpcoesDoSocket = {
  token: string;
  /** Primeira conexão e reconexões: `reconectou` é `true` a partir da segunda. */
  aoConectar: (reconectou: boolean) => void;
  aoCair: () => void;
  /** O servidor recusou o token (expirado, conta removida). */
  aoSerRecusado: () => void;
  /** Para testes. */
  url?: string;
};

/**
 * Conexão em tempo real do cidadão (ADR-0002). O servidor valida o token no handshake e decide as
 * salas; o app só escuta eventos (as ações continuam sendo chamadas REST).
 */
export function conectarSocket(opcoes: OpcoesDoSocket): Socket {
  const socket = io(opcoes.url ?? API_URL, {
    auth: { token: opcoes.token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });

  let jaConectou = false;
  socket.on('connect', () => {
    opcoes.aoConectar(jaConectou);
    jaConectou = true;
  });
  socket.on('disconnect', () => opcoes.aoCair());
  socket.on('connect_error', (erro: Error & { data?: { codigo?: string } }) => {
    if (erro.message === 'NAO_AUTENTICADO' || erro.data?.codigo === 'NAO_AUTENTICADO') {
      socket.disconnect(); // token ruim não melhora tentando de novo
      opcoes.aoSerRecusado();
    } else {
      opcoes.aoCair();
    }
  });

  return socket;
}

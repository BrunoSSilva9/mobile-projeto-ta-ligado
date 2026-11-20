import { io, type Socket } from 'socket.io-client';

import { API_URL } from './api';

export type EstadoDaConexao = 'conectando' | 'conectado' | 'reconectando';

export type OpcoesDoSocket = {
  token: string;
  /** `reconectou` é `true` a partir da segunda conexão. */
  aoConectar: (reconectou: boolean) => void;
  aoCair: () => void;
  /** O servidor recusou o token (expirado, conta removida). */
  aoSerRecusado: () => void;
};

/**
 * Conexão em tempo real do operador (ADR-0002). O servidor valida o token no handshake e coloca o
 * operador na sala `papel:OPERADOR`; o painel só escuta (as ações continuam sendo chamadas REST).
 */
export function conectarSocket(opcoes: OpcoesDoSocket): Socket {
  const socket = io(API_URL || undefined, {
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

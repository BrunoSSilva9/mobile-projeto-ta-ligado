import type { AddressInfo } from 'node:net';

import { io as criarCliente, type Socket } from 'socket.io-client';

import { criarServidor } from '../../src/servidor';
import { prisma, SEGREDO_JWT } from './banco';

export type EventoRecebido = { nome: string; payload: unknown };

/**
 * Sobe o servidor de verdade (Express + Socket.IO + publicador) numa porta livre, ligado ao
 * banco de teste. `app` serve para chamar a API REST com o Supertest; `url` serve ao Socket.IO.
 */
export async function iniciarServidorDeTeste() {
  const servidor = criarServidor({
    prisma,
    segredoJwt: SEGREDO_JWT,
    bcryptCost: 4,
    limites: { geral: 10_000, login: 10_000 },
  });
  await new Promise<void>((resolver) => servidor.httpServer.listen(0, resolver));
  const porta = (servidor.httpServer.address() as AddressInfo).port;

  const clientes = new Set<Socket>();

  /** Conecta um cliente com o token; falha com o erro do handshake se a conexão for recusada. */
  async function conectar(token: string | undefined): Promise<Socket> {
    const cliente = criarCliente(`http://localhost:${porta}`, {
      auth: token === undefined ? {} : { token },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    clientes.add(cliente);
    await new Promise<void>((resolver, rejeitar) => {
      cliente.once('connect', () => resolver());
      cliente.once('connect_error', (erro) => rejeitar(erro));
    });
    return cliente;
  }

  /** Derruba os clientes e espera o servidor perceber, para um teste não influenciar o próximo. */
  async function desconectarClientes() {
    for (const cliente of clientes) cliente.disconnect();
    clientes.clear();
    const limite = Date.now() + 2000;
    while ((await servidor.io.fetchSockets()).length > 0 && Date.now() < limite) await pausa(10);
  }

  async function fechar() {
    await desconectarClientes();
    await new Promise<void>((resolver) => servidor.io.close(() => resolver()));
  }

  return { ...servidor, url: `http://localhost:${porta}`, conectar, desconectarClientes, fechar };
}

/** Guarda, em ordem, tudo o que o cliente receber (para conferir depois, inclusive o que NÃO chegou). */
export function gravarEventos(cliente: Socket): EventoRecebido[] {
  const recebidos: EventoRecebido[] = [];
  cliente.onAny((nome, payload) => recebidos.push({ nome, payload }));
  return recebidos;
}

export const pausa = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/** Espera até a condição ficar verdadeira (consulta a cada 10 ms) ou estoura o tempo. */
export async function aguardar(condicao: () => boolean, limiteMs = 3000): Promise<void> {
  const inicio = Date.now();
  while (!condicao()) {
    if (Date.now() - inicio > limiteMs) throw new Error('Tempo esgotado esperando o evento.');
    await pausa(10);
  }
}

/** Payloads de um tipo de evento. São dinâmicos de propósito: cada teste confere os campos que importam. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Payload = Record<string, any>;

export const doTipo = (eventos: EventoRecebido[], nome: string) =>
  eventos.filter((e) => e.nome === nome).map((e) => e.payload as Payload);

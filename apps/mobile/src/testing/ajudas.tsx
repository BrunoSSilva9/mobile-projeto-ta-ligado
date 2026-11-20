import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/services/query-client';
import type { DadosDeSessao } from '@/store/session';

/**
 * O TanStack Query agenda um temporizador de coleta de lixo (5 min) quando uma mutação ou consulta
 * perde o último observador. No app isso é o desejado, mas nos testes mantém o Jest "pendurado".
 * Com `gcTime: 0` o cache é descartado na hora e o processo encerra.
 */
export function configurarCacheParaTestes() {
  const padrao = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...padrao,
    queries: { ...padrao.queries, gcTime: 0 },
    mutations: { ...padrao.mutations, gcTime: 0 },
  });
}

/** Renderiza uma tela com o cache de dados e as áreas seguras, como no app. */
export async function renderizarTela(tela: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={queryClient}>{tela}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

export async function digitar(rotulo: string, texto: string) {
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
}

export async function tocar(nome: string) {
  await fireEvent.press(screen.getByRole('button', { name: nome }));
}

/** Resposta simulada do `fetch`. */
export function resposta(status: number, corpo: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as unknown as Response;
}

export const erroDaApi = (
  codigo: string,
  mensagem: string,
  extra: Record<string, unknown> = {},
) => ({ erro: { codigo, mensagem, ...extra } });

export const SESSAO_DE_CIDADAO: DadosDeSessao = {
  token: 'token.do.cidadao',
  usuario: {
    id: 'u1',
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    telefone: null,
    papel: 'CIDADAO',
  },
};

export const SESSAO_DE_OPERADOR: DadosDeSessao = {
  token: 'token.do.operador',
  usuario: {
    id: 'u2',
    nome: 'Carlos',
    email: 'carlos@equatorial.com',
    telefone: null,
    papel: 'OPERADOR',
  },
};

/** Armazenamento seguro falso em memória, compartilhado pelos testes de telas. */
export const armazenamentoEmMemoria = new Map<string, string>();

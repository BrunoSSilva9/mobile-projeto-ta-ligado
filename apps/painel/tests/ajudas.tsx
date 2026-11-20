import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { App } from '../src/App';
import { queryClient } from '../src/services/api';
import { useSessao, type DadosDeSessao } from '../src/store/sessao';

/** JWT de mentira com `exp` no futuro (o painel só lê o `exp`; quem valida é o servidor). */
export function tokenFalso(expEmSegundos = Math.floor(Date.now() / 1000) + 3600) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, '');
  return `${b64({ alg: 'HS256' })}.${b64({ sub: 'u2', exp: expEmSegundos })}.assinatura`;
}

export const SESSAO_DE_OPERADOR: DadosDeSessao = {
  token: tokenFalso(),
  usuario: {
    id: 'u2',
    nome: 'Carlos Operador',
    email: 'operador@taligado.local',
    papel: 'OPERADOR',
  },
};

export const SESSAO_DE_CIDADAO: DadosDeSessao = {
  token: tokenFalso(),
  usuario: { id: 'u1', nome: 'Maria', email: 'maria@exemplo.com', papel: 'CIDADAO' },
};

export function limparTudo() {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
  useSessao.setState({ token: null, usuario: null });
  queryClient.clear();
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false, gcTime: Infinity },
  });
}

export function renderizar(rota = '/', elemento: ReactElement = <App />) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[rota]}>{elemento}</MemoryRouter>
    </QueryClientProvider>,
  );
}

export function resposta(status: number, corpo: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response;
}

export const erroDaApi = (codigo: string, mensagem: string) => ({ erro: { codigo, mensagem } });

export const BAIRROS = [
  { id: 1, nome: 'Cidade Nova', folha: null, latitude: -5.35, longitude: -49.1 },
  { id: 2, nome: 'Nova Marabá', folha: 'Folha 28', latitude: -5.37, longitude: -49.12 },
];

export const DENUNCIA_A = {
  id: 'd1',
  protocolo: 'TL-2026-000002',
  prioritaria: true,
  tipo: 'SEM_ENERGIA',
  status: 'RECEBIDA',
  bairro: { id: 2, nome: 'Nova Marabá', folha: 'Folha 28' },
  logradouro: 'Rua das Flores, 10',
  latitude: -5.37,
  longitude: -49.12,
  previsaoReparo: null,
  criadoEm: new Date(Date.now() - 5 * 60_000).toISOString(),
};

export const DENUNCIA_B = {
  id: 'd0',
  protocolo: 'TL-2026-000001',
  prioritaria: false,
  tipo: 'OSCILACAO',
  status: 'EM_ATENDIMENTO',
  bairro: { id: 1, nome: 'Cidade Nova', folha: null },
  logradouro: 'Av. VP-3',
  latitude: null,
  longitude: null,
  previsaoReparo: null,
  criadoEm: new Date(Date.now() - 3 * 3_600_000).toISOString(),
};

type Rotas = {
  denuncias?: (url: string) => Response;
  bairros?: () => Response;
  login?: (corpo: unknown) => Response;
};

/** Simula a API por endereço e devolve o `fetch` falso (para conferir as chamadas). */
export function simularApi(rotas: Rotas = {}) {
  const fetchFalso = vi.fn(async (url: string, init?: { body?: string }) => {
    if (url.includes('/auth/login')) {
      return (rotas.login ?? (() => resposta(200, SESSAO_DE_OPERADOR)))(
        init?.body ? JSON.parse(init.body) : null,
      );
    }
    if (url.includes('/painel/denuncias')) {
      return (
        rotas.denuncias ??
        (() => resposta(200, { itens: [DENUNCIA_A, DENUNCIA_B], pagina: 1, total: 2 }))
      )(url);
    }
    if (url.endsWith('/bairros')) {
      return (rotas.bairros ?? (() => resposta(200, { bairros: BAIRROS })))();
    }
    throw new Error(`Chamada inesperada: ${url}`);
  });
  vi.stubGlobal('fetch', fetchFalso);
  return fetchFalso;
}

export const urlsDeDenuncias = (f: ReturnType<typeof vi.fn>) =>
  f.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/painel/denuncias'));

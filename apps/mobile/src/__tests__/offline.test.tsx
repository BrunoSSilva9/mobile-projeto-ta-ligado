import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react-native';

import MinhasDenunciasScreen from '@/app/(app)/minhas-denuncias';
import DetalheScreen from '@/app/(app)/denuncia/[id]';
import { CHAVE_MINHAS, chaveDoDetalhe } from '@/features/acompanhamento/cache';
import { queryClient } from '@/services/query-client';
import { useSessao } from '@/store/session';
import {
  armazenamentoEmMemoria,
  renderizarTela,
  resposta,
  SESSAO_DE_CIDADAO,
} from '@/testing/ajudas';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'd1' }),
}));

jest.mock('@/services/armazenamento', () => {
  const { armazenamentoEmMemoria } = jest.requireActual('@/testing/ajudas');
  return {
    armazenamentoSeguro: {
      ler: async (chave: string) => armazenamentoEmMemoria.get(chave) ?? null,
      gravar: async (chave: string, valor: string) => void armazenamentoEmMemoria.set(chave, valor),
      remover: async (chave: string) => void armazenamentoEmMemoria.delete(chave),
    },
  };
});

const netinfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockFetch = jest.fn();

type Estado = { isConnected: boolean; isInternetReachable: boolean };
const COM_REDE: Estado = { isConnected: true, isInternetReachable: true };
const SEM_REDE: Estado = { isConnected: false, isInternetReachable: false };
let ouvintes: ((estado: Estado) => void)[] = [];

/** Simula o aparelho ficando sem (ou com) rede: o NetInfo avisa o app e o TanStack Query. */
async function mudarRede(estado: Estado) {
  onlineManager.setOnline(estado.isConnected);
  await act(async () => ouvintes.forEach((cb) => cb(estado)));
}

const RESUMO = {
  id: 'd1',
  protocolo: 'TL-2026-000002',
  tipo: 'SEM_ENERGIA',
  status: 'EM_ATENDIMENTO',
  bairro: 'Nova Marabá',
  folha: 'Folha 28',
  criadoEm: '2026-11-19T17:00:00.000Z',
  previsaoReparo: null,
};
const LISTA = { itens: [RESUMO], pagina: 1, total: 1 };
/** 19/11/2026 às 14:30 (horário de Marabá). */
const ATUALIZADO_EM = Date.parse('2026-11-19T17:30:00.000Z');

const DETALHE = {
  ...RESUMO,
  logradouro: 'Rua das Flores, 10',
  cep: null,
  pontoReferencia: null,
  bairro: { id: 2, nome: 'Nova Marabá', folha: 'Folha 28' },
  descricao: null,
  latitude: null,
  longitude: null,
  justificativa: null,
  historico: [
    {
      statusAnterior: null,
      statusNovo: 'RECEBIDA',
      por: 'Você',
      criadoEm: '2026-11-19T17:00:00.000Z',
    },
  ],
  atualizadoEm: '2026-11-19T17:00:00.000Z',
};

beforeAll(() => {
  // Aqui o cache é preenchido à mão: `Infinity` evita que os dados sumam e não cria temporizador.
  const padrao = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({ ...padrao, queries: { ...padrao.queries, gcTime: Infinity } });
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockFetch.mockImplementation(async () => resposta(200, LISTA));
  global.fetch = mockFetch as unknown as typeof fetch;
  ouvintes = [];
  netinfo.addEventListener.mockImplementation(((cb: (e: Estado) => void) => {
    ouvintes.push(cb);
    return jest.fn();
  }) as never);
  netinfo.fetch.mockResolvedValue(COM_REDE as never);
  onlineManager.setOnline(true);
  armazenamentoEmMemoria.clear();
  queryClient.clear();
  await useSessao.getState().entrar(SESSAO_DE_CIDADAO);
});

afterAll(() => onlineManager.setOnline(true));

describe('sem internet, com dados salvos (ADR-0005)', () => {
  beforeEach(async () => {
    queryClient.setQueryData([...CHAVE_MINHAS], LISTA, { updatedAt: ATUALIZADO_EM });
    netinfo.fetch.mockResolvedValue(SEM_REDE as never);
    onlineManager.setOnline(false);
  });

  it('mostra a lista salva e avisa "Sem conexão" com a data da última atualização', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);

    expect(await screen.findByText('TL-2026-000002')).toBeTruthy();
    expect(
      await screen.findByText(
        'Sem conexão. Você está vendo a última atualização, de 19/11/2026 às 14:30.',
      ),
    ).toBeTruthy();
  });

  it('não tenta buscar na rede enquanto está offline', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);
    await screen.findByText('TL-2026-000002');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('o aviso é lido pelo leitor de tela como alerta', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);

    const aviso = await screen.findByRole('alert');
    expect(aviso.props.accessibilityLiveRegion).toBe('polite');
  });

  it('ao voltar a internet: o aviso some e a lista é atualizada', async () => {
    mockFetch.mockImplementation(async () =>
      resposta(200, { ...LISTA, itens: [{ ...RESUMO, status: 'RESOLVIDA' }] }),
    );
    await renderizarTela(<MinhasDenunciasScreen />);
    await screen.findByText('EM ATENDIMENTO');

    await mudarRede(COM_REDE);

    await waitFor(() => expect(screen.queryByText(/Sem conexão/)).toBeNull());
    expect(await screen.findByText('RESOLVIDA')).toBeTruthy();
    expect(mockFetch).toHaveBeenCalled();
  });

  it('o detalhe salvo também aparece sem internet', async () => {
    queryClient.setQueryData([...chaveDoDetalhe('d1')], DETALHE, { updatedAt: ATUALIZADO_EM });

    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByText('Rua das Flores, 10')).toBeTruthy();
    expect(screen.getByText(/Sem conexão. Você está vendo a última atualização/)).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('sem internet e sem dados salvos', () => {
  beforeEach(() => {
    netinfo.fetch.mockResolvedValue(SEM_REDE as never);
    onlineManager.setOnline(false);
  });

  it('em vez de um carregamento infinito, explica e oferece tentar de novo', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);

    expect(
      await screen.findByText(
        'Sem conexão e nenhum dado salvo para mostrar. Conecte-se à internet e tente de novo.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('ao voltar a internet, carrega sozinho', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);
    await screen.findByText(/nenhum dado salvo/);

    await mudarRede(COM_REDE);

    expect(await screen.findByText('TL-2026-000002')).toBeTruthy();
    expect(screen.queryByText(/nenhum dado salvo/)).toBeNull();
  });
});

describe('com internet', () => {
  it('não mostra nenhum aviso de conexão', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);

    expect(await screen.findByText('TL-2026-000002')).toBeTruthy();
    expect(screen.queryByText(/Sem conexão/)).toBeNull();
    expect(screen.queryByText(/Reconectando/)).toBeNull();
  });

  it('sinal sem internet (conectado ao Wi-Fi, mas sem acesso) conta como sem conexão', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);
    await screen.findByText('TL-2026-000002');

    await mudarRede({ isConnected: true, isInternetReachable: false });

    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
  });
});

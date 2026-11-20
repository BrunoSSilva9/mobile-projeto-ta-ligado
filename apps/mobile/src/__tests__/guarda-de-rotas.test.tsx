import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { http } from '@/services/api';
import { queryClient } from '@/services/query-client';
import { CHAVE_DA_SESSAO, useSessao } from '@/store/session';
import {
  armazenamentoEmMemoria,
  configurarCacheParaTestes,
  erroDaApi,
  resposta,
  SESSAO_DE_CIDADAO,
} from '@/testing/ajudas';

/**
 * Navegação protegida (decisão S-41): testa o layout raiz REAL (`src/app/_layout.tsx`) e as
 * pastas `(auth)` e `(app)` com o `renderRouter` do Expo Router. É o que garante que, sem sessão,
 * só existe o login, e com sessão, só existe o app (RF-003, RF-004).
 */

jest.mock('@expo-google-fonts/plus-jakarta-sans', () => ({
  useFonts: () => [true, null],
  PlusJakartaSans_400Regular: 1,
  PlusJakartaSans_400Regular_Italic: 2,
  PlusJakartaSans_600SemiBold: 3,
  PlusJakartaSans_700Bold: 4,
  PlusJakartaSans_800ExtraBold: 5,
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
  hasServicesEnabledAsync: async () => false,
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
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

const mockFetch = jest.fn();

function abrirApp(rota = '/') {
  return renderRouter('src/app', { initialUrl: rota });
}

/** Simula um app que já foi aberto antes: a sessão está salva no aparelho. */
function salvarSessaoNoAparelho() {
  armazenamentoEmMemoria.set(CHAVE_DA_SESSAO, JSON.stringify(SESSAO_DE_CIDADAO));
}

beforeAll(configurarCacheParaTestes);
beforeEach(async () => {
  mockFetch.mockReset();
  // Padrão: a lista de denúncias do Perfil vem vazia; os testes de 401 trocam a resposta.
  mockFetch.mockImplementation(async (url: string) => {
    if (url.endsWith('/bairros')) return resposta(200, { bairros: [] });
    if (url.includes('/bairros/status')) return resposta(200, { atualizadoEm: '', bairros: [] });
    if (url.includes('/ocorrencias')) {
      return resposta(200, {
        itens: [],
        pagina: 1,
        total: 0,
        totais: { todos: 0, semLuz: 0, oscilacao: 0, restabelecidos: 0 },
        atualizadoEm: '',
      });
    }
    return resposta(200, { itens: [], pagina: 1, total: 0 });
  });
  global.fetch = mockFetch as unknown as typeof fetch;
  armazenamentoEmMemoria.clear();
  queryClient.clear();
  // Estado de "app recém-aberto": sem sessão em memória e ainda não hidratada.
  useSessao.setState({ token: null, usuario: null, hidratada: false });
});

describe('sem sessão', () => {
  it('ao abrir o app, mostra o login (T-02)', async () => {
    await abrirApp();

    expect(await screen.findByText('Entre na sua conta')).toBeTruthy();
    expect(screen).toHavePathname('/login');
  });

  it.each(['/perfil', '/ocorrencias', '/denunciar', '/denuncia/sucesso', '/denuncia/d1', '/'])(
    'um link direto para %s leva ao login e não mostra o conteúdo do app',
    async (rota) => {
      await abrirApp(rota);

      expect(await screen.findByText('Entre na sua conta')).toBeTruthy();
      expect(screen).toHavePathname('/login');
      expect(screen.queryByText(/EM CONSTRUÇÃO/)).toBeNull();
      expect(screen.queryByText('Olá, Maria!')).toBeNull();
      expect(screen.queryByText('Onde faltou luz?')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull();
    },
  );

  it('o cadastro é acessível', async () => {
    await abrirApp('/cadastro');

    expect(await screen.findByText('Crie sua conta cidadã')).toBeTruthy();
    expect(screen).toHavePathname('/cadastro');
  });

  it('os Termos de Uso e a Política de Privacidade abrem sem login', async () => {
    await abrirApp('/termos');
    expect(await screen.findByText('Versão 2026-11')).toBeTruthy();
    expect(screen).toHavePathname('/termos');
  });

  it('a Política de Privacidade abre sem login', async () => {
    await abrirApp('/privacidade');

    expect(await screen.findByText('Versão 2026-11')).toBeTruthy();
    expect(screen).toHavePathname('/privacidade');
  });

  it('alterna entre login e cadastro pela barra superior', async () => {
    await abrirApp('/login');

    await fireEvent.press(await screen.findByRole('button', { name: 'Cadastrar' }));
    expect(await screen.findByText('Crie sua conta cidadã')).toBeTruthy();
    expect(screen).toHavePathname('/cadastro');

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Entre na sua conta')).toBeTruthy();
    expect(screen).toHavePathname('/login');
  });
});

describe('com sessão salva no aparelho', () => {
  beforeEach(salvarSessaoNoAparelho);

  it('ao abrir o app, vai direto às abas (sem passar pelo login)', async () => {
    await abrirApp();

    expect(await screen.findByText('Olá, Maria!')).toBeTruthy();
    expect(screen).toHavePathname('/');
    expect(screen.queryByText('Entre na sua conta')).toBeNull();
  });

  it('abrir o login leva às abas', async () => {
    await abrirApp('/login');

    expect(await screen.findByText('Olá, Maria!')).toBeTruthy();
    expect(screen).not.toHavePathname('/login');
  });

  it('abrir o cadastro leva às abas', async () => {
    await abrirApp('/cadastro');

    expect(await screen.findByText('Olá, Maria!')).toBeTruthy();
    expect(screen).not.toHavePathname('/cadastro');
  });

  it('tem as abas Início, Ocorrências e Perfil e o botão central Denunciar', async () => {
    await abrirApp();
    await screen.findByText('Olá, Maria!');

    for (const nome of ['Início', 'Ocorrências', 'Perfil', 'Denunciar falta de luz']) {
      expect(screen.getByRole('button', { name: nome })).toBeTruthy();
    }
  });

  it('o botão central abre o formulário de denúncia (T-05)', async () => {
    await abrirApp();
    await screen.findByText('Olá, Maria!');

    await fireEvent.press(screen.getByRole('button', { name: 'Denunciar falta de luz' }));

    expect(await screen.findByText('Onde faltou luz?')).toBeTruthy();
    expect(screen).toHavePathname('/denunciar');
  });

  it('os Termos de Uso também abrem com sessão', async () => {
    await abrirApp('/termos');

    expect(await screen.findByText('Versão 2026-11')).toBeTruthy();
    expect(screen).toHavePathname('/termos');
  });

  it('um token salvo mas inválido (corrompido) leva ao login', async () => {
    armazenamentoEmMemoria.set(CHAVE_DA_SESSAO, '{corrompido');

    await abrirApp();

    expect(await screen.findByText('Entre na sua conta')).toBeTruthy();
  });
});

describe('mudanças de sessão com o app aberto', () => {
  it('entrar leva às abas sozinho, sem nenhuma navegação manual', async () => {
    await abrirApp('/login');
    await screen.findByText('Entre na sua conta');

    await act(async () => {
      await useSessao.getState().entrar(SESSAO_DE_CIDADAO);
    });

    expect(await screen.findByText('Olá, Maria!')).toBeTruthy();
    expect(screen.queryByText('Entre na sua conta')).toBeNull();
  });

  it('Sair (Perfil) volta ao login e apaga a sessão do aparelho', async () => {
    salvarSessaoNoAparelho();
    await abrirApp('/perfil');
    await screen.findByText('maria@exemplo.com');

    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Entre na sua conta')).toBeTruthy();
    expect(screen).toHavePathname('/login');
    expect(armazenamentoEmMemoria.has(CHAVE_DA_SESSAO)).toBe(false);
  });

  it('depois de sair, o botão "voltar" não revela o app (o app deixou de existir)', async () => {
    salvarSessaoNoAparelho();
    await abrirApp('/perfil');
    await screen.findByText('maria@exemplo.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Sair' }));
    await screen.findByText('Entre na sua conta');

    await act(async () => {
      await useSessao.getState().sair();
    });

    expect(screen.queryByText('maria@exemplo.com')).toBeNull();
    expect(screen).toHavePathname('/login');
  });

  it('sessão expirada: um 401 do servidor derruba a sessão e leva ao login', async () => {
    salvarSessaoNoAparelho();
    await abrirApp();
    await screen.findByText('Olá, Maria!');
    mockFetch.mockResolvedValue(
      resposta(401, erroDaApi('NAO_AUTENTICADO', 'Sessão inválida ou expirada. Entre novamente.')),
    );

    await act(async () => {
      await http.get('/me').catch(() => undefined);
    });

    expect(await screen.findByText('Entre na sua conta')).toBeTruthy();
    expect(useSessao.getState().token).toBeNull();
    expect(armazenamentoEmMemoria.has(CHAVE_DA_SESSAO)).toBe(false);
  });

  it('o 401 envia o token da sessão no cabeçalho antes de derrubá-la', async () => {
    salvarSessaoNoAparelho();
    await abrirApp();
    await screen.findByText('Olá, Maria!');
    mockFetch.mockResolvedValue(resposta(401, erroDaApi('NAO_AUTENTICADO', 'Expirada.')));

    await act(async () => {
      await http.get('/me').catch(() => undefined);
    });

    expect(mockFetch.mock.calls[0]![1].headers.Authorization).toBe(
      `Bearer ${SESSAO_DE_CIDADAO.token}`,
    );
    await waitFor(() => expect(useSessao.getState().token).toBeNull());
  });
});

describe('abertura do app', () => {
  it('não mostra nada (fica na tela de abertura) até saber se há sessão', async () => {
    let liberar: (valor: string | null) => void = () => undefined;
    const original = armazenamentoEmMemoria.get.bind(armazenamentoEmMemoria);
    const espera = new Promise<string | null>((resolver) => (liberar = resolver));
    jest
      .spyOn(armazenamentoEmMemoria, 'get')
      .mockImplementation((chave) =>
        chave === CHAVE_DA_SESSAO ? (espera as unknown as string) : original(chave),
      );

    await abrirApp();

    // Enquanto lê o aparelho, nem o login "pisca" na tela.
    expect(screen.queryByText('Entre na sua conta')).toBeNull();
    expect(screen.queryByText('Olá, Maria!')).toBeNull();

    await act(async () => liberar(JSON.stringify(SESSAO_DE_CIDADAO)));
    expect(await screen.findByText('Olá, Maria!')).toBeTruthy();
    expect(screen.queryByText('Entre na sua conta')).toBeNull();
    jest.restoreAllMocks();
  });
});

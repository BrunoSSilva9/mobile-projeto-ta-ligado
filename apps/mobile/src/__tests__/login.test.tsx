import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/app/(auth)/login';
import { queryClient } from '@/services/query-client';
import { useAvisoDeEntrada } from '@/store/aviso-de-entrada';
import { CHAVE_DA_SESSAO, useSessao } from '@/store/session';
import {
  armazenamentoEmMemoria,
  configurarCacheParaTestes,
  digitar,
  erroDaApi,
  renderizarTela,
  resposta,
  SESSAO_DE_CIDADAO,
  SESSAO_DE_OPERADOR,
  tocar,
} from '@/testing/ajudas';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), push: jest.fn() },
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

beforeAll(configurarCacheParaTestes);
beforeEach(async () => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  mockReplace.mockClear();
  armazenamentoEmMemoria.clear();
  queryClient.clear();
  await useSessao.getState().sair();
});

async function preencherEEntrar(email = 'maria@exemplo.com', senha = 'minhasenha1') {
  await digitar('E-mail', email);
  await digitar('Senha', senha);
  await tocar('Entrar na conta');
}

describe('T-02 Login: aviso vindo de outra tela (conta excluída, S-50)', () => {
  beforeEach(() => useAvisoDeEntrada.getState().limpar());

  it('mostra "Sua conta foi excluída." com ícone e texto, e some ao sair do login', async () => {
    useAvisoDeEntrada.getState().definir('Sua conta foi excluída.');
    const { unmount } = await renderizarTela(<LoginScreen />);

    expect(screen.getByText('Sua conta foi excluída.')).toBeTruthy();

    await unmount();
    expect(useAvisoDeEntrada.getState().mensagem).toBeNull();
  });

  it('sem aviso pendente, o login é o de sempre', async () => {
    await renderizarTela(<LoginScreen />);

    expect(screen.queryByText('Sua conta foi excluída.')).toBeNull();
  });
});

describe('T-02 Login (RF-003)', () => {
  it('o formulário fica num cartão branco, com "Entrar" em caixa normal e o erro como aviso com ícone', async () => {
    await renderizarTela(<LoginScreen />);

    expect(screen.getByRole('header', { name: 'Entre na sua conta' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Entrar na conta' })).toBeTruthy();
    expect(screen.queryByText('ENTRAR')).toBeNull();
    expect(screen.queryByText('Marabá • PA')).toBeNull();
    // A barra do topo tem o seu "Entrar" (selecionado) e o de enviar tem outro nome.
    expect(screen.getByRole('button', { name: 'Entrar' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('mostra e-mail e senha, sem "Esqueci a senha" e sem login com Google (fora do MVP)', async () => {
    await renderizarTela(<LoginScreen />);

    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.queryByText(/esqueci/i)).toBeNull();
    expect(screen.queryByText(/google/i)).toBeNull();
  });

  it('a senha começa oculta e pode ser mostrada', async () => {
    await renderizarTela(<LoginScreen />);
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
  });

  describe('validação no aparelho', () => {
    it('campos vazios: mostra os erros e não chama a API', async () => {
      await renderizarTela(<LoginScreen />);

      await tocar('Entrar na conta');

      expect(await screen.findByText('Informe o e-mail.')).toBeTruthy();
      expect(screen.getByText('Informe a senha.')).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('e-mail inválido: mostra o erro e não chama a API', async () => {
      await renderizarTela(<LoginScreen />);

      await preencherEEntrar('isso-nao-e-email', 'x');

      expect(await screen.findByText('Informe um e-mail válido.')).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('entrada', () => {
    it('entra, guarda a sessão e normaliza o e-mail', async () => {
      mockFetch.mockResolvedValue(resposta(200, SESSAO_DE_CIDADAO));
      await renderizarTela(<LoginScreen />);

      await preencherEEntrar('  MARIA@Exemplo.com ', 'minhasenha1');

      await waitFor(() => expect(useSessao.getState().token).toBe(SESSAO_DE_CIDADAO.token));
      const [url, init] = mockFetch.mock.calls[0]!;
      expect(url).toMatch(/\/api\/v1\/auth\/login$/);
      expect(JSON.parse(init.body)).toEqual({ email: 'maria@exemplo.com', senha: 'minhasenha1' });
      expect(JSON.parse(armazenamentoEmMemoria.get(CHAVE_DA_SESSAO)!)).toEqual(SESSAO_DE_CIDADAO);
    });

    it('enquanto entra, o botão fica ocupado e um segundo toque não duplica', async () => {
      let concluir: (r: Response) => void = () => undefined;
      mockFetch.mockReturnValue(new Promise<Response>((resolver) => (concluir = resolver)));
      await renderizarTela(<LoginScreen />);

      await preencherEEntrar();
      const botao = await screen.findByRole('button', { name: 'Entrar na conta' });
      expect(botao.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
      await fireEvent.press(botao);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      concluir(resposta(200, SESSAO_DE_CIDADAO));
      await waitFor(() => expect(useSessao.getState().token).not.toBeNull());
    });
  });

  describe('erros (RNF-005)', () => {
    it('senha incorreta: mensagem genérica, sem revelar qual campo errou, e sem sessão', async () => {
      mockFetch.mockResolvedValue(
        resposta(401, erroDaApi('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.')),
      );
      await renderizarTela(<LoginScreen />);

      await preencherEEntrar();

      expect(await screen.findByText('E-mail ou senha incorretos.')).toBeTruthy();
      expect(useSessao.getState().token).toBeNull();
      expect(screen.getByLabelText('E-mail').props.value).toBe('maria@exemplo.com');
    });

    it('um 401 de credenciais nunca é tratado como "sessão expirada"', async () => {
      // Já existe uma sessão ativa e o usuário tenta entrar com outra conta, errando a senha.
      await useSessao.getState().entrar(SESSAO_DE_CIDADAO);
      mockFetch.mockResolvedValue(
        resposta(401, erroDaApi('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.')),
      );
      await renderizarTela(<LoginScreen />);

      await preencherEEntrar();

      expect(await screen.findByText('E-mail ou senha incorretos.')).toBeTruthy();
      expect(useSessao.getState().token).toBe(SESSAO_DE_CIDADAO.token);
    });

    it('sem internet: mensagem clara', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network request failed'));
      await renderizarTela(<LoginScreen />);

      await preencherEEntrar();

      expect(
        await screen.findByText('Sem conexão. Verifique sua internet e tente de novo.'),
      ).toBeTruthy();
      expect(useSessao.getState().token).toBeNull();
    });

    it('muitas tentativas (429): mostra a mensagem do servidor', async () => {
      mockFetch.mockResolvedValue(
        resposta(
          429,
          erroDaApi(
            'MUITAS_REQUISICOES',
            'Muitas tentativas. Aguarde um instante e tente novamente.',
          ),
        ),
      );
      await renderizarTela(<LoginScreen />);

      await preencherEEntrar();

      expect(await screen.findByText(/Muitas tentativas/)).toBeTruthy();
    });

    it('conta de operador: é recusada com instrução para usar o painel, sem guardar sessão', async () => {
      mockFetch.mockResolvedValue(resposta(200, SESSAO_DE_OPERADOR));
      await renderizarTela(<LoginScreen />);

      await preencherEEntrar('carlos@equatorial.com', 'senha-do-operador');

      expect(await screen.findByText(/Use o painel da operadora/)).toBeTruthy();
      expect(useSessao.getState().token).toBeNull();
      expect(armazenamentoEmMemoria.has(CHAVE_DA_SESSAO)).toBe(false);
    });

    it('a mensagem de erro some ao tentar de novo', async () => {
      mockFetch
        .mockResolvedValueOnce(
          resposta(401, erroDaApi('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.')),
        )
        .mockResolvedValueOnce(resposta(200, SESSAO_DE_CIDADAO));
      await renderizarTela(<LoginScreen />);
      await preencherEEntrar();
      expect(await screen.findByText('E-mail ou senha incorretos.')).toBeTruthy();

      await digitar('Senha', 'senha-certa-1');
      await tocar('Entrar na conta');

      await waitFor(() => expect(useSessao.getState().token).not.toBeNull());
      expect(screen.queryByText('E-mail ou senha incorretos.')).toBeNull();
    });
  });

  it('o link do rodapé leva ao cadastro', async () => {
    await renderizarTela(<LoginScreen />);

    await fireEvent.press(screen.getByRole('link', { name: 'Não tem conta? Cadastre-se' }));

    expect(mockReplace).toHaveBeenLastCalledWith('/cadastro');
  });
});

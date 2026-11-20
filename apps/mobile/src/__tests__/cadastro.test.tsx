import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import CadastroScreen from '@/app/(auth)/cadastro';
import { VERSAO_TERMOS } from '@/config/constants';
import { queryClient } from '@/services/query-client';
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
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...a: unknown[]) => mockReplace(...a),
    push: (...a: unknown[]) => mockPush(...a),
  },
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
  mockPush.mockClear();
  armazenamentoEmMemoria.clear();
  queryClient.clear();
  await useSessao.getState().sair();
});

/** Preenche tudo com dados válidos (sem marcar os termos). */
async function preencherCadastro(dados: Partial<Record<string, string>> = {}) {
  await digitar('Nome completo', dados.nome ?? 'Maria Silva');
  await digitar('Seu melhor e-mail', dados.email ?? 'maria@exemplo.com');
  await digitar('Telefone de contato (opcional)', dados.telefone ?? '(94) 90000-0000');
  await digitar('Senha', dados.senha ?? 'minhasenha1');
  await digitar('Confirmar senha', dados.confirmar ?? dados.senha ?? 'minhasenha1');
}

const aceitarTermos = () =>
  fireEvent.press(
    screen.getByRole('checkbox', {
      name: 'Eu concordo com os Termos de Uso e a Política de Privacidade',
    }),
  );

describe('T-01 Cadastro (RF-001, RF-002)', () => {
  it('mostra os campos do cadastro, sem CPF nem data de nascimento (minimização)', async () => {
    await renderizarTela(<CadastroScreen />);

    for (const rotulo of [
      'Nome completo',
      'Seu melhor e-mail',
      'Telefone de contato (opcional)',
      'Senha',
      'Confirmar senha',
    ]) {
      expect(screen.getByLabelText(rotulo)).toBeTruthy();
    }
    expect(screen.queryByLabelText(/cpf/i)).toBeNull();
    expect(screen.queryByLabelText(/nascimento/i)).toBeNull();
    expect(screen.queryByText(/google/i)).toBeNull(); // login com Google está fora do MVP
  });

  it('informa que as denúncias aparecem sem identificação (e não "anônimas")', async () => {
    await renderizarTela(<CadastroScreen />);

    expect(
      screen.getByText('Suas denúncias aparecem para outros cidadãos sem identificação.'),
    ).toBeTruthy();
    expect(screen.queryByText(/anônim/i)).toBeNull();
  });

  describe('consentimento (RN-020)', () => {
    it('o botão Cadastrar fica desabilitado até aceitar os Termos', async () => {
      await renderizarTela(<CadastroScreen />);
      expect(
        screen.getByRole('button', { name: 'CADASTRAR' }).props.accessibilityState.disabled,
      ).toBe(true);

      await aceitarTermos();

      expect(
        screen.getByRole('button', { name: 'CADASTRAR' }).props.accessibilityState.disabled,
      ).toBe(false);
    });

    it('sem aceitar, tocar em Cadastrar não envia nada', async () => {
      await renderizarTela(<CadastroScreen />);
      await preencherCadastro();

      await tocar('CADASTRAR');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('os links abrem os Termos de Uso e a Política de Privacidade', async () => {
      await renderizarTela(<CadastroScreen />);

      await fireEvent.press(screen.getByText('Termos de Uso'));
      expect(mockPush).toHaveBeenLastCalledWith('/termos');

      await fireEvent.press(screen.getByText('Política de Privacidade'));
      expect(mockPush).toHaveBeenLastCalledWith('/privacidade');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('avisa que a denúncia é compartilhada com a Equatorial Pará', async () => {
      await renderizarTela(<CadastroScreen />);

      expect(screen.getByText(/compartilhamento da denúncia com a Equatorial Pará/)).toBeTruthy();
    });
  });

  describe('validação no aparelho (antes de enviar)', () => {
    it('mostra os erros de cada campo em português e não chama a API', async () => {
      await renderizarTela(<CadastroScreen />);
      await aceitarTermos();

      await tocar('CADASTRAR');

      expect(await screen.findByText('O nome precisa ter pelo menos 2 caracteres.')).toBeTruthy();
      expect(screen.getByText('Informe um e-mail válido.')).toBeTruthy();
      expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeTruthy();
      expect(screen.getByText('Confirme a senha.')).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('senhas diferentes: mostra o erro na confirmação', async () => {
      await renderizarTela(<CadastroScreen />);
      await preencherCadastro({ senha: 'minhasenha1', confirmar: 'outra-senha-1' });
      await aceitarTermos();

      await tocar('CADASTRAR');

      expect(await screen.findByText('As senhas não são iguais.')).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('telefone inválido: mostra o erro', async () => {
      await renderizarTela(<CadastroScreen />);
      await preencherCadastro({ telefone: '123' });
      await aceitarTermos();

      await tocar('CADASTRAR');

      expect(
        await screen.findByText('Informe o telefone com DDD, ex.: (94) 90000-0000.'),
      ).toBeTruthy();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('envio', () => {
    it('cadastra, guarda a sessão no armazenamento seguro e normaliza os dados', async () => {
      mockFetch.mockResolvedValue(resposta(201, SESSAO_DE_CIDADAO));
      await renderizarTela(<CadastroScreen />);
      await preencherCadastro({ nome: '  Maria Silva ', email: ' MARIA@Exemplo.com ' });
      await aceitarTermos();

      await tocar('CADASTRAR');

      await waitFor(() => expect(useSessao.getState().token).toBe(SESSAO_DE_CIDADAO.token));
      const [url, init] = mockFetch.mock.calls[0]!;
      expect(url).toMatch(/\/api\/v1\/auth\/register$/);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        nome: 'Maria Silva',
        email: 'maria@exemplo.com',
        senha: 'minhasenha1',
        telefone: '(94) 90000-0000',
        aceiteTermos: true,
        versaoTermos: VERSAO_TERMOS,
      });
      expect(init.headers.Authorization).toBeUndefined(); // ainda não havia sessão
      expect(JSON.parse(armazenamentoEmMemoria.get(CHAVE_DA_SESSAO)!)).toEqual(SESSAO_DE_CIDADAO);
    });

    it('telefone em branco não é enviado', async () => {
      mockFetch.mockResolvedValue(resposta(201, SESSAO_DE_CIDADAO));
      await renderizarTela(<CadastroScreen />);
      await preencherCadastro({ telefone: '' });
      await aceitarTermos();

      await tocar('CADASTRAR');

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      expect(JSON.parse(mockFetch.mock.calls[0]![1].body)).not.toHaveProperty('telefone');
    });

    it('nunca envia a confirmação de senha nem CPF', async () => {
      mockFetch.mockResolvedValue(resposta(201, SESSAO_DE_CIDADAO));
      await renderizarTela(<CadastroScreen />);
      await preencherCadastro();
      await aceitarTermos();

      await tocar('CADASTRAR');

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(mockFetch.mock.calls[0]![1].body).not.toMatch(/confirmarSenha|cpf|nascimento/i);
    });

    it('enquanto envia, o botão fica ocupado e um segundo toque não duplica o cadastro', async () => {
      let concluir: (r: Response) => void = () => undefined;
      mockFetch.mockReturnValue(new Promise<Response>((resolver) => (concluir = resolver)));
      await renderizarTela(<CadastroScreen />);
      await preencherCadastro();
      await aceitarTermos();

      await tocar('CADASTRAR');
      const botao = await screen.findByRole('button', { name: 'CADASTRAR' });
      expect(botao.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
      await fireEvent.press(botao);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      concluir(resposta(201, SESSAO_DE_CIDADAO));
      await waitFor(() => expect(useSessao.getState().token).not.toBeNull());
    });
  });

  describe('erros do servidor (RNF-005)', () => {
    async function enviarCadastroValido() {
      await renderizarTela(<CadastroScreen />);
      await preencherCadastro();
      await aceitarTermos();
      await tocar('CADASTRAR');
    }

    it('e-mail já cadastrado: o erro aparece no campo de e-mail e não cria sessão', async () => {
      mockFetch.mockResolvedValue(
        resposta(409, erroDaApi('EMAIL_JA_CADASTRADO', 'E-mail já cadastrado.')),
      );

      await enviarCadastroValido();

      expect(await screen.findByText('E-mail já cadastrado.')).toBeTruthy();
      expect(useSessao.getState().token).toBeNull();
      expect(armazenamentoEmMemoria.has(CHAVE_DA_SESSAO)).toBe(false);
    });

    it('erro de validação do servidor: vai para o campo certo', async () => {
      mockFetch.mockResolvedValue(
        resposta(
          400,
          erroDaApi('VALIDACAO_ERRO', 'Dados inválidos.', {
            detalhes: [
              { campo: 'senha', mensagem: 'A senha precisa ter pelo menos 8 caracteres.' },
            ],
          }),
        ),
      );

      await enviarCadastroValido();

      expect(await screen.findByText('A senha precisa ter pelo menos 8 caracteres.')).toBeTruthy();
      expect(screen.queryByText('Dados inválidos.')).toBeNull(); // não repete a mensagem geral
    });

    it('erro de campo que o formulário não tem: mostra a mensagem geral', async () => {
      mockFetch.mockResolvedValue(
        resposta(
          400,
          erroDaApi('VALIDACAO_ERRO', 'Dados inválidos.', {
            detalhes: [{ campo: 'versaoTermos', mensagem: 'Informe a versão dos termos.' }],
          }),
        ),
      );

      await enviarCadastroValido();

      expect(await screen.findByText('Dados inválidos.')).toBeTruthy();
    });

    it('sem internet: mensagem clara e os dados continuam no formulário', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network request failed'));

      await enviarCadastroValido();

      expect(
        await screen.findByText('Sem conexão. Verifique sua internet e tente de novo.'),
      ).toBeTruthy();
      expect(screen.getByLabelText('Nome completo').props.value).toBe('Maria Silva');
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

      await enviarCadastroValido();

      expect(await screen.findByText(/Muitas tentativas/)).toBeTruthy();
    });

    it('erro do servidor (500 sem corpo da API): mensagem genérica em português', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError('html');
        },
      });

      await enviarCadastroValido();

      expect(
        await screen.findByText('Algo deu errado do nosso lado. Tente novamente em instantes.'),
      ).toBeTruthy();
    });

    it('a API devolvendo uma conta de operador é recusada, sem guardar sessão (RF-003)', async () => {
      mockFetch.mockResolvedValue(resposta(201, SESSAO_DE_OPERADOR));

      await enviarCadastroValido();

      expect(await screen.findByText(/Esta conta é de operador/)).toBeTruthy();
      expect(useSessao.getState().token).toBeNull();
      expect(armazenamentoEmMemoria.has(CHAVE_DA_SESSAO)).toBe(false);
    });

    it('depois de um erro, é possível corrigir e enviar de novo', async () => {
      mockFetch
        .mockResolvedValueOnce(
          resposta(409, erroDaApi('EMAIL_JA_CADASTRADO', 'E-mail já cadastrado.')),
        )
        .mockResolvedValueOnce(resposta(201, SESSAO_DE_CIDADAO));
      await enviarCadastroValido();
      expect(await screen.findByText('E-mail já cadastrado.')).toBeTruthy();

      await digitar('Seu melhor e-mail', 'outro@exemplo.com');
      await tocar('CADASTRAR');

      await waitFor(() => expect(useSessao.getState().token).not.toBeNull());
      expect(JSON.parse(mockFetch.mock.calls[1]![1].body).email).toBe('outro@exemplo.com');
    });
  });

  it('o link do rodapé leva ao login', async () => {
    await renderizarTela(<CadastroScreen />);

    await fireEvent.press(screen.getByRole('link', { name: 'Já tem uma conta? Faça login' }));

    expect(mockReplace).toHaveBeenLastCalledWith('/login');
  });

  it('tem o rodapé com o nome da equipe (substitui a sigla ACGM, PEN-01)', async () => {
    await renderizarTela(<CadastroScreen />);

    expect(screen.getByText('© 2026 Equipe Tá Ligado?')).toBeTruthy();
    expect(screen.queryByText(/ACGM/)).toBeNull();
  });
});

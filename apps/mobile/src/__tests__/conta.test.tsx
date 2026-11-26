import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import PerfilScreen from '@/app/(app)/(tabs)/perfil';
import EditarPerfilScreen from '@/app/(app)/perfil/editar';
import ExcluirContaScreen from '@/app/(app)/perfil/excluir';
import {
  APAGADOS,
  AVISO_DA_EXCLUSAO,
  QUE_FICAM,
  TEXTO_DA_CONFIRMACAO,
} from '@/features/auth/exclusao';
import { chaveDoRascunho } from '@/features/denuncia/rascunho';
import { chaveDoBairroEscolhido } from '@/features/ocorrencias/bairro-escolhido';
import { CHAVE_DO_CACHE } from '@/services/persistencia';
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
  tocar,
} from '@/testing/ajudas';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockPodeVoltar = true;
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    back: () => mockBack(),
    replace: (...a: unknown[]) => mockReplace(...a),
    canGoBack: () => mockPodeVoltar,
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
const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

const USUARIO = {
  ...SESSAO_DE_CIDADAO.usuario,
  nome: 'Maria Silva',
  telefone: '(94) 90000-0000',
};

type Rotas = {
  editar?: () => Response | Promise<Response>;
  excluir?: () => Response | Promise<Response>;
};
function simularApi(rotas: Rotas = {}) {
  mockFetch.mockImplementation(async (url: string, init?: { method?: string }) => {
    if (url.endsWith('/me') && init?.method === 'PATCH') {
      return (rotas.editar ?? (() => resposta(200, USUARIO)))();
    }
    if (url.endsWith('/me') && init?.method === 'DELETE') {
      return (rotas.excluir ?? (() => resposta(204, null)))();
    }
    if (url.includes('/denuncias/minhas')) return resposta(200, { itens: [], pagina: 1, total: 0 });
    throw new Error(`Chamada inesperada: ${url}`);
  });
}

const chamadas = (metodo: string) =>
  mockFetch.mock.calls.filter(
    ([url, init]) => String(url).endsWith('/me') && init?.method === metodo,
  );

beforeAll(configurarCacheParaTestes);
beforeEach(async () => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockPodeVoltar = true;
  global.fetch = mockFetch as unknown as typeof fetch;
  armazenamentoEmMemoria.clear();
  await AsyncStorage.clear();
  queryClient.clear();
  useAvisoDeEntrada.getState().limpar();
  await useSessao.getState().entrar({ ...SESSAO_DE_CIDADAO, usuario: USUARIO });
  simularApi();
});

describe('Perfil: caminhos para editar e excluir (T-08)', () => {
  it('"Editar meus dados" e "Excluir minha conta" abrem as telas próprias', async () => {
    await renderizarTela(<PerfilScreen />);

    await tocar('Editar meus dados');
    expect(mockPush).toHaveBeenLastCalledWith('/perfil/editar');

    await tocar('Excluir minha conta');
    expect(mockPush).toHaveBeenLastCalledWith('/perfil/excluir');
  });

  it('"Excluir minha conta" no Perfil só navega: nada é apagado ali (S-51)', async () => {
    await renderizarTela(<PerfilScreen />);

    await tocar('Excluir minha conta');

    expect(chamadas('DELETE')).toHaveLength(0);
    expect(useSessao.getState().token).not.toBeNull();
  });
});

describe('T-08 Editar meus dados (RF-005, S-22)', () => {
  it('mostra nome e telefone preenchidos e o e-mail só como texto, com o motivo', async () => {
    await renderizarTela(<EditarPerfilScreen />);

    expect(screen.getByLabelText('Nome completo').props.value).toBe('Maria Silva');
    expect(screen.getByLabelText('Telefone de contato (opcional)').props.value).toBe(
      '(94) 90000-0000',
    );
    expect(screen.getByLabelText('E-mail: maria@exemplo.com')).toBeTruthy();
    expect(screen.getByText('O e-mail não pode ser alterado por aqui.')).toBeTruthy();
    expect(screen.queryByLabelText('E-mail')).toBeNull(); // não é um campo
  });

  it('salva, atualiza a sessão (em memória e no aparelho), avisa e volta', async () => {
    simularApi({
      editar: () => resposta(200, { ...USUARIO, nome: 'Maria Souza', telefone: '(94) 98888-7777' }),
    });
    await renderizarTela(<EditarPerfilScreen />);
    await digitar('Nome completo', 'Maria Souza');
    await digitar('Telefone de contato (opcional)', '(94) 98888-7777');

    await tocar('Salvar');

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(JSON.parse(chamadas('PATCH')[0]![1].body)).toEqual({
      nome: 'Maria Souza',
      telefone: '(94) 98888-7777',
    });
    expect(useSessao.getState().usuario).toMatchObject({
      nome: 'Maria Souza',
      telefone: '(94) 98888-7777',
    });
    const salva = JSON.parse(armazenamentoEmMemoria.get(CHAVE_DA_SESSAO)!);
    expect(salva.usuario.nome).toBe('Maria Souza');
    expect(salva.token).toBe(SESSAO_DE_CIDADAO.token); // o token continua
    expect(anunciar).toHaveBeenCalledWith('Dados salvos.');
  });

  it('o e-mail nunca é enviado', async () => {
    await renderizarTela(<EditarPerfilScreen />);

    await tocar('Salvar');

    await waitFor(() => expect(chamadas('PATCH')).toHaveLength(1));
    expect(JSON.parse(chamadas('PATCH')[0]![1].body)).not.toHaveProperty('email');
  });

  it('telefone em branco envia vazio (a API apaga o telefone)', async () => {
    simularApi({ editar: () => resposta(200, { ...USUARIO, telefone: null }) });
    await renderizarTela(<EditarPerfilScreen />);
    await digitar('Telefone de contato (opcional)', '');

    await tocar('Salvar');

    await waitFor(() => expect(useSessao.getState().usuario?.telefone).toBeNull());
    expect(JSON.parse(chamadas('PATCH')[0]![1].body).telefone).toBe('');
  });

  it('abrida direto (sem tela anterior), volta ao Perfil', async () => {
    mockPodeVoltar = false;
    await renderizarTela(<EditarPerfilScreen />);

    await tocar('Salvar');

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/perfil'));
  });

  it.each([
    ['nome curto', 'Nome completo', 'M', 'O nome precisa ter pelo menos 2 caracteres.'],
    [
      'telefone sem DDD',
      'Telefone de contato (opcional)',
      '90000-0000',
      'Informe o telefone com DDD, ex.: (94) 90000-0000.',
    ],
  ])('%s: mostra o erro no campo e não chama a API', async (_n, campo, valor, mensagem) => {
    await renderizarTela(<EditarPerfilScreen />);
    await digitar(campo, valor);

    await tocar('Salvar');

    expect(await screen.findByText(mensagem)).toBeTruthy();
    expect(chamadas('PATCH')).toHaveLength(0);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('erro do servidor num campo aparece no campo, sem sair da tela', async () => {
    simularApi({
      editar: () =>
        resposta(
          400,
          erroDaApi('VALIDACAO_ERRO', 'Dados inválidos.', {
            detalhes: [{ campo: 'telefone', mensagem: 'Telefone não aceito.' }],
          }),
        ),
    });
    await renderizarTela(<EditarPerfilScreen />);

    await tocar('Salvar');

    expect(await screen.findByText('Telefone não aceito.')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
    expect(useSessao.getState().usuario?.nome).toBe('Maria Silva'); // nada mudou na sessão
  });

  it('sem internet: mostra a mensagem, mantém o que foi digitado e permite tentar de novo', async () => {
    let falhar = true;
    simularApi({
      editar: () => {
        if (falhar) throw new TypeError('Network request failed');
        return resposta(200, { ...USUARIO, nome: 'Maria Souza' });
      },
    });
    await renderizarTela(<EditarPerfilScreen />);
    await digitar('Nome completo', 'Maria Souza');

    await tocar('Salvar');
    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
    expect(screen.getByLabelText('Nome completo').props.value).toBe('Maria Souza');

    falhar = false;
    await tocar('Salvar');
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});

describe('T-08 Excluir minha conta (RF-006, RN-024; S-50, S-51, S-59)', () => {
  const caixa = () => screen.getByRole('checkbox', { name: TEXTO_DA_CONFIRMACAO });
  const botao = () => screen.getByRole('button', { name: 'Excluir minha conta' });
  const desativado = () => botao().props.accessibilityState.disabled === true;

  it('explica o que é apagado e o que fica, com o aviso de erro (ícone, texto e borda)', async () => {
    await renderizarTela(<ExcluirContaScreen />);

    expect(screen.getByText(AVISO_DA_EXCLUSAO)).toBeTruthy();
    for (const item of APAGADOS) expect(screen.getByText(item)).toBeTruthy();
    expect(screen.getByRole('header', { name: 'O que será apagado' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'O que fica' })).toBeTruthy();
    expect(screen.getByText(QUE_FICAM)).toBeTruthy();
    expect(screen.getByLabelText('Sua senha atual')).toBeTruthy();
  });

  it('o botão "Excluir minha conta" começa desativado e explica por quê', async () => {
    await renderizarTela(<ExcluirContaScreen />);

    expect(desativado()).toBe(true);
    expect(
      screen.getByText('Para excluir, digite a sua senha e marque a caixa acima.'),
    ).toBeTruthy();
  });

  it('só a senha, ou só a caixa, não libera o botão; os dois juntos, sim', async () => {
    await renderizarTela(<ExcluirContaScreen />);

    await digitar('Sua senha atual', 'minhasenha1');
    expect(desativado()).toBe(true);

    await digitar('Sua senha atual', '');
    await fireEvent.press(caixa());
    expect(desativado()).toBe(true);

    await digitar('Sua senha atual', 'minhasenha1');
    expect(desativado()).toBe(false);
    expect(screen.queryByText(/Para excluir, digite a sua senha/)).toBeNull();
  });

  it('não pede para digitar "EXCLUIR" nem nenhuma palavra (público idoso)', async () => {
    await renderizarTela(<ExcluirContaScreen />);

    expect(screen.queryByLabelText(/EXCLUIR/)).toBeNull();
    expect(screen.queryByText(/digite.*EXCLUIR/i)).toBeNull();
  });

  it('o botão é o primário azul (o vermelho fica para a situação da energia) e tem 56 dp', async () => {
    const { StyleSheet } = jest.requireActual('react-native');
    const { colors } = jest.requireActual('@/theme');
    await renderizarTela(<ExcluirContaScreen />);
    await digitar('Sua senha atual', 'minhasenha1');
    await fireEvent.press(caixa());

    const estilo = StyleSheet.flatten(
      typeof botao().props.style === 'function'
        ? botao().props.style({ pressed: false })
        : botao().props.style,
    );
    expect(estilo.backgroundColor).toBe(colors.action);
    expect(estilo.minHeight).toBeGreaterThanOrEqual(56);
  });

  describe('senha certa', () => {
    async function excluirComSucesso() {
      await AsyncStorage.setItem(chaveDoRascunho('u1'), JSON.stringify({ logradouro: 'Rua A' }));
      await AsyncStorage.setItem(chaveDoBairroEscolhido('u1'), JSON.stringify({ bairroId: 2 }));
      await AsyncStorage.setItem(CHAVE_DO_CACHE, '{"dados":"da Maria"}');
      queryClient.setQueryData(['minhas-denuncias'], { itens: [], pagina: 1, total: 0 });
      await renderizarTela(<ExcluirContaScreen />);
      await digitar('Sua senha atual', 'minhasenha1');
      await fireEvent.press(caixa());
      await tocar('Excluir minha conta');
      await waitFor(() => expect(useSessao.getState().token).toBeNull());
    }

    it('envia a senha em DELETE /me, uma única vez', async () => {
      await excluirComSucesso();

      expect(chamadas('DELETE')).toHaveLength(1);
      expect(JSON.parse(chamadas('DELETE')[0]![1].body)).toEqual({ senha: 'minhasenha1' });
    });

    it('encerra a sessão e apaga o que era desta conta no aparelho (token, cache, rascunho, bairro)', async () => {
      await excluirComSucesso();

      expect(useSessao.getState().usuario).toBeNull();
      expect(armazenamentoEmMemoria.has(CHAVE_DA_SESSAO)).toBe(false);
      expect(await AsyncStorage.getItem(chaveDoRascunho('u1'))).toBeNull();
      expect(await AsyncStorage.getItem(chaveDoBairroEscolhido('u1'))).toBeNull();
      await waitFor(async () => expect(await AsyncStorage.getItem(CHAVE_DO_CACHE)).toBeNull());
      expect(queryClient.getQueryData(['minhas-denuncias'])).toBeUndefined();
    });

    it('deixa o aviso "Sua conta foi excluída." para o login', async () => {
      await excluirComSucesso();

      expect(useAvisoDeEntrada.getState().mensagem).toBe('Sua conta foi excluída.');
    });
  });

  describe('senha errada ou falha', () => {
    it('senha errada: "Senha incorreta." no campo, a pessoa continua conectada e nada some', async () => {
      simularApi({
        excluir: () => resposta(403, erroDaApi('SENHA_INCORRETA', 'Senha incorreta.')),
      });
      await AsyncStorage.setItem(chaveDoRascunho('u1'), JSON.stringify({ logradouro: 'Rua A' }));
      await renderizarTela(<ExcluirContaScreen />);
      await digitar('Sua senha atual', 'errada-123');
      await fireEvent.press(caixa());

      await tocar('Excluir minha conta');

      expect(await screen.findByText('Senha incorreta.')).toBeTruthy();
      expect(useSessao.getState().token).not.toBeNull();
      expect(useAvisoDeEntrada.getState().mensagem).toBeNull();
      expect(await AsyncStorage.getItem(chaveDoRascunho('u1'))).not.toBeNull();
    });

    it('depois de errar, voltar a digitar tira a mensagem e deixa tentar de novo', async () => {
      let certa = false;
      simularApi({
        excluir: () =>
          certa
            ? resposta(204, null)
            : resposta(403, erroDaApi('SENHA_INCORRETA', 'Senha incorreta.')),
      });
      await renderizarTela(<ExcluirContaScreen />);
      await digitar('Sua senha atual', 'errada-123');
      await fireEvent.press(caixa());
      await tocar('Excluir minha conta');
      await screen.findByText('Senha incorreta.');

      certa = true;
      await digitar('Sua senha atual', 'minhasenha1');
      expect(screen.queryByText('Senha incorreta.')).toBeNull();
      await tocar('Excluir minha conta');

      await waitFor(() => expect(useSessao.getState().token).toBeNull());
      expect(chamadas('DELETE')).toHaveLength(2);
    });

    it('muitas tentativas (429): mostra a mensagem do servidor, sem sair', async () => {
      simularApi({
        excluir: () =>
          resposta(
            429,
            erroDaApi(
              'MUITAS_REQUISICOES',
              'Muitas tentativas. Aguarde um instante e tente novamente.',
            ),
          ),
      });
      await renderizarTela(<ExcluirContaScreen />);
      await digitar('Sua senha atual', 'errada-123');
      await fireEvent.press(caixa());

      await tocar('Excluir minha conta');

      expect(await screen.findByText(/Muitas tentativas/)).toBeTruthy();
      expect(useSessao.getState().token).not.toBeNull();
    });

    it('sem internet: mensagem clara, continua conectada e dá para tentar de novo', async () => {
      simularApi({
        excluir: () => {
          throw new TypeError('Network request failed');
        },
      });
      await renderizarTela(<ExcluirContaScreen />);
      await digitar('Sua senha atual', 'minhasenha1');
      await fireEvent.press(caixa());

      await tocar('Excluir minha conta');

      expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
      expect(useSessao.getState().token).not.toBeNull();
      expect(desativado()).toBe(false);
    });

    it('enquanto envia, o botão fica ocupado e um segundo toque não duplica', async () => {
      let concluir: (r: Response) => void = () => undefined;
      simularApi({ excluir: () => new Promise<Response>((r) => (concluir = r)) });
      await renderizarTela(<ExcluirContaScreen />);
      await digitar('Sua senha atual', 'minhasenha1');
      await fireEvent.press(caixa());

      await tocar('Excluir minha conta');
      await waitFor(() => expect(botao().props.accessibilityState).toMatchObject({ busy: true }));
      await fireEvent.press(botao());

      concluir(resposta(204, null));
      await waitFor(() => expect(useSessao.getState().token).toBeNull());
      expect(chamadas('DELETE')).toHaveLength(1);
    });
  });
});

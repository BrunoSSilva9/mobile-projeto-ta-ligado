import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import DenunciarScreen from '@/app/(app)/denunciar';
import { chaveDoRascunho } from '@/features/denuncia/rascunho';
import { queryClient } from '@/services/query-client';
import { useSessao } from '@/store/session';
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

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
jest.mock('expo-router', () => ({
  router: {
    replace: (...a: unknown[]) => mockReplace(...a),
    back: () => mockBack(),
    canGoBack: () => mockCanGoBack(),
  },
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
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

const loc = Location as jest.Mocked<typeof Location>;
const mockFetch = jest.fn();

const BAIRROS = [
  { id: 1, nome: 'Cidade Nova', folha: null, latitude: -5.35, longitude: -49.1 },
  { id: 2, nome: 'Nova Marabá', folha: 'Folha 28', latitude: -5.37, longitude: -49.12 },
];
const CRIADA = {
  id: 'd1',
  protocolo: 'TL-2026-000001',
  status: 'RECEBIDA',
  tipo: 'SEM_ENERGIA',
  bairro: { id: 2, nome: 'Nova Marabá' },
  criadoEm: '2026-11-19T12:00:00.000Z',
};

type Rotas = Partial<Record<'bairros' | 'proximo' | 'criar', () => Response | Promise<Response>>>;

/** Responde às chamadas da tela por endereço. */
function simularApi(rotas: Rotas = {}) {
  mockFetch.mockImplementation(async (url: string, init?: { method?: string }) => {
    if (url.includes('/bairros/proximo')) {
      return (rotas.proximo ?? (() => resposta(200, { ...BAIRROS[1], distanciaKm: 0.3 })))();
    }
    if (url.endsWith('/bairros')) {
      return (rotas.bairros ?? (() => resposta(200, { bairros: BAIRROS })))();
    }
    if (url.endsWith('/denuncias') && init?.method === 'POST') {
      return (rotas.criar ?? (() => resposta(201, CRIADA)))();
    }
    throw new Error(`Chamada inesperada: ${url}`);
  });
}

function simularGps(estado: 'ok' | 'negada' | 'desativada' = 'ok') {
  loc.requestForegroundPermissionsAsync.mockResolvedValue({
    granted: estado !== 'negada',
    canAskAgain: true,
  } as never);
  loc.hasServicesEnabledAsync.mockResolvedValue(estado !== 'desativada');
  loc.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: -5.37, longitude: -49.12 },
  } as never);
  loc.reverseGeocodeAsync.mockResolvedValue([
    { street: 'Rua das Flores', streetNumber: '10' },
  ] as never);
}

const corposEnviados = () =>
  mockFetch.mock.calls
    .filter(([url, init]) => String(url).endsWith('/denuncias') && init?.method === 'POST')
    .map(([, init]) => JSON.parse(init.body as string) as Record<string, unknown>);

async function escolherBairro(nome: string) {
  await fireEvent.press(screen.getByRole('button', { name: /^Bairro:/ }));
  await fireEvent.press(await screen.findByRole('button', { name: nome }));
}

/** Preenche o mínimo obrigatório à mão (tipo, logradouro, bairro). */
async function preencherMinimo() {
  await fireEvent.press(screen.getByRole('radio', { name: 'Sem energia' }));
  await digitar('Logradouro', 'Rua A, 1');
  await escolherBairro('Cidade Nova');
}

beforeAll(configurarCacheParaTestes);
beforeEach(async () => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockCanGoBack.mockReturnValue(true);
  global.fetch = mockFetch as unknown as typeof fetch;
  armazenamentoEmMemoria.clear();
  await AsyncStorage.clear();
  queryClient.clear();
  await useSessao.getState().entrar(SESSAO_DE_CIDADAO);
  simularApi();
  simularGps('ok');
});

describe('T-05 Registrar denúncia: formulário', () => {
  it('mostra os campos da Fase 1, sem fotos, pessoas afetadas nem necessidade especial (S-38)', async () => {
    await renderizarTela(<DenunciarScreen />);

    expect(screen.getByText('Onde faltou luz?')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sem energia' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Oscilação' })).toBeTruthy();
    expect(screen.getByLabelText('Logradouro')).toBeTruthy();
    expect(screen.getByLabelText('CEP (opcional)')).toBeTruthy();
    expect(screen.getByLabelText('Ponto de referência (opcional)')).toBeTruthy();
    expect(screen.getByLabelText('Descreva o que aconteceu (opcional)')).toBeTruthy();
    expect(screen.queryByText(/foto/i)).toBeNull();
    expect(screen.queryByText(/pessoas afetadas/i)).toBeNull();
    expect(screen.queryByText(/necessidade especial/i)).toBeNull();
    expect(screen.queryByText(/Passo 1 de 1/)).toBeNull();
  });

  it('o botão voltar fecha a tela (ou vai ao início se não houver para onde voltar)', async () => {
    await renderizarTela(<DenunciarScreen />);

    await tocar('Voltar');
    expect(mockBack).toHaveBeenCalledTimes(1);

    mockCanGoBack.mockReturnValue(false);
    await tocar('Voltar');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('o aviso de responsabilidade pode ser recolhido', async () => {
    await renderizarTela(<DenunciarScreen />);
    expect(screen.getByText(/Registre apenas interrupções verídicas/)).toBeTruthy();

    await tocar('Antes de enviar');

    expect(screen.queryByText(/Registre apenas interrupções verídicas/)).toBeNull();
  });

  it('enviar vazio mostra os erros e não chama a API', async () => {
    await renderizarTela(<DenunciarScreen />);
    // Espera o GPS e a lista de bairros terminarem para não competir com o envio.
    await screen.findByText('GPS ATIVO');
    await waitFor(() =>
      expect(screen.getByLabelText('Logradouro').props.value).toBe('Rua das Flores, 10'),
    );
    await fireEvent.changeText(screen.getByLabelText('Logradouro'), '');

    await tocar('ENVIAR DENÚNCIA');

    expect(await screen.findByText('Escolha o tipo: sem energia ou oscilação.')).toBeTruthy();
    expect(screen.getByText('Informe o logradouro (pelo menos 3 caracteres).')).toBeTruthy();
    expect(corposEnviados()).toHaveLength(0);
  });

  it('CEP inválido bloqueia o envio', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');
    await preencherMinimo();
    await digitar('CEP (opcional)', '123');

    await tocar('ENVIAR DENÚNCIA');

    expect(await screen.findByText('Informe o CEP no formato 68500-000.')).toBeTruthy();
    expect(corposEnviados()).toHaveLength(0);
  });

  it('a descrição mostra o contador de caracteres', async () => {
    await renderizarTela(<DenunciarScreen />);

    await digitar('Descreva o que aconteceu (opcional)', 'sem luz');

    expect(screen.getByText('7/500 caracteres')).toBeTruthy();
  });
});

describe('T-05: seletor de bairro', () => {
  it('lista os bairros com a folha e filtra pela busca, sem diferenciar acentos', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');
    await fireEvent.press(screen.getByRole('button', { name: /^Bairro:/ }));

    expect(await screen.findByRole('button', { name: 'Nova Marabá (Folha 28)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cidade Nova' })).toBeTruthy();

    await digitar('Buscar bairro ou folha', 'MARABA');
    expect(screen.queryByRole('button', { name: 'Cidade Nova' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Nova Marabá (Folha 28)' })).toBeTruthy();

    await digitar('Buscar bairro ou folha', 'folha 28');
    expect(screen.getByRole('button', { name: 'Nova Marabá (Folha 28)' })).toBeTruthy();

    await digitar('Buscar bairro ou folha', 'zzz');
    expect(screen.getByText('Nenhum bairro encontrado.')).toBeTruthy();
  });

  it('escolher um bairro fecha a lista e mostra o escolhido', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');

    await escolherBairro('Nova Marabá (Folha 28)');

    expect(screen.getByRole('button', { name: 'Bairro: Nova Marabá (Folha 28)' })).toBeTruthy();
    expect(screen.queryByText('Escolha o bairro', { exact: true })).toBeNull();
  });

  it('se a lista de bairros falhar, oferece tentar de novo', async () => {
    // 403 não é repetido sozinho (só rede e 5xx são), então o erro aparece na hora.
    simularApi({ bairros: () => resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.')) });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);

    expect(await screen.findByText('Não foi possível carregar a lista de bairros.')).toBeTruthy();

    simularApi();
    await tocar('Recarregar bairros');
    await waitFor(() =>
      expect(screen.queryByText('Não foi possível carregar a lista de bairros.')).toBeNull(),
    );
  });
});

describe('T-05: GPS (RF-008, RN-012, RN-025)', () => {
  it('com GPS: mostra o mapa, preenche logradouro e bairro sugeridos', async () => {
    await renderizarTela(<DenunciarScreen />);

    expect(await screen.findByText('GPS ATIVO')).toBeTruthy();
    expect(
      JSON.parse(
        screen.getByTestId('pino', { includeHiddenElements: true }).props.accessibilityLabel,
      ),
    ).toEqual({ latitude: -5.37, longitude: -49.12 });
    await waitFor(() =>
      expect(screen.getByLabelText('Logradouro').props.value).toBe('Rua das Flores, 10'),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bairro: Nova Marabá (Folha 28)' })).toBeTruthy(),
    );
  });

  it('não sobrescreve o que o usuário já digitou com a sugestão do GPS', async () => {
    let liberar: (r: Response) => void = () => undefined;
    simularApi({ proximo: () => new Promise<Response>((r) => (liberar = r)) });
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS ATIVO');
    await waitFor(() => expect(screen.getByLabelText('Logradouro').props.value).not.toBe(''));

    await digitar('Logradouro', 'Rua que eu digitei');
    await escolherBairro('Cidade Nova');
    liberar(resposta(200, { ...BAIRROS[1], distanciaKm: 0.3 }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(screen.getByLabelText('Logradouro').props.value).toBe('Rua que eu digitei');
    expect(screen.getByRole('button', { name: 'Bairro: Cidade Nova' })).toBeTruthy();
  });

  it('arrastar o pino atualiza as coordenadas enviadas e busca o bairro de novo', async () => {
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS ATIVO');
    await fireEvent(screen.getByTestId('pino', { includeHiddenElements: true }), 'dragEnd', {
      nativeEvent: { coordinate: { latitude: -5.4, longitude: -49.2 } },
    });

    await waitFor(() =>
      expect(mockFetch.mock.calls.some(([u]) => String(u).includes('lat=-5.4&lng=-49.2'))).toBe(
        true,
      ),
    );
    await preencherMinimo();
    await tocar('ENVIAR DENÚNCIA');

    await waitFor(() => expect(corposEnviados()).toHaveLength(1));
    expect(corposEnviados()[0]).toMatchObject({ latitude: -5.4, longitude: -49.2 });
  });

  it('permissão negada: avisa, deixa escolher o bairro e envia sem coordenadas', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);

    expect(await screen.findByText('GPS desativado')).toBeTruthy();
    expect(screen.getByText(/A permissão de localização está desativada/)).toBeTruthy();
    expect(screen.queryByTestId('mapa')).toBeNull();

    await preencherMinimo();
    await tocar('ENVIAR DENÚNCIA');

    await waitFor(() => expect(corposEnviados()).toHaveLength(1));
    const corpo = corposEnviados()[0]!;
    expect(corpo).toEqual({ tipo: 'SEM_ENERGIA', bairroId: 1, logradouro: 'Rua A, 1' });
    expect(corpo).not.toHaveProperty('latitude');
  });

  it('GPS do aparelho desligado explica o motivo', async () => {
    simularGps('desativada');
    await renderizarTela(<DenunciarScreen />);

    expect(await screen.findByText(/O GPS do aparelho está desligado/)).toBeTruthy();
  });

  it('"Tentar de novo" busca a localização outra vez', async () => {
    simularGps('desativada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');

    simularGps('ok');
    await tocar('Tentar de novo');

    expect(await screen.findByText('GPS ATIVO')).toBeTruthy();
  });

  it('enquanto busca, mostra "Buscando sua localização…"', async () => {
    // Demora um pouco para responder (e depois responde, para não deixar temporizador aberto).
    loc.getCurrentPositionAsync.mockImplementation(
      () =>
        new Promise((r) =>
          setTimeout(() => r({ coords: { latitude: -5.37, longitude: -49.12 } } as never), 50),
        ),
    );
    await renderizarTela(<DenunciarScreen />);

    expect(await screen.findByText('Buscando sua localização…')).toBeTruthy();
    expect(await screen.findByText('GPS ATIVO')).toBeTruthy();
  });
});

describe('T-05: envio (RF-007, RF-012)', () => {
  it('envia o corpo certo, limpa o rascunho e vai para a tela de sucesso com o protocolo', async () => {
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS ATIVO');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bairro: Nova Marabá (Folha 28)' })).toBeTruthy(),
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Oscilação' }));
    await digitar('CEP (opcional)', '68500-000');
    await digitar('Ponto de referência (opcional)', 'perto da padaria');
    await digitar('Descreva o que aconteceu (opcional)', 'luz piscando');

    await tocar('ENVIAR DENÚNCIA');

    await waitFor(() => expect(corposEnviados()).toHaveLength(1));
    expect(corposEnviados()[0]).toEqual({
      tipo: 'OSCILACAO',
      bairroId: 2,
      logradouro: 'Rua das Flores, 10',
      cep: '68500-000',
      pontoReferencia: 'perto da padaria',
      descricao: 'luz piscando',
      latitude: -5.37,
      longitude: -49.12,
    });
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/denuncia/sucesso',
        params: { id: 'd1', protocolo: 'TL-2026-000001' },
      }),
    );
    expect(await AsyncStorage.getItem(chaveDoRascunho('u1'))).toBeNull();
  });

  it('envia o token da sessão', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');
    await preencherMinimo();

    await tocar('ENVIAR DENÚNCIA');

    await waitFor(() => expect(corposEnviados()).toHaveLength(1));
    const chamada = mockFetch.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(chamada[1].headers.Authorization).toBe(`Bearer ${SESSAO_DE_CIDADAO.token}`);
  });

  it('enquanto envia, o botão fica ocupado e um segundo toque não duplica a denúncia', async () => {
    let concluir: (r: Response) => void = () => undefined;
    simularApi({ criar: () => new Promise<Response>((r) => (concluir = r)) });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');
    await preencherMinimo();

    await tocar('ENVIAR DENÚNCIA');
    await waitFor(() =>
      expect(screen.getByTestId('botao-enviar-denuncia').props.accessibilityState.busy).toBe(true),
    );
    await fireEvent.press(screen.getByTestId('botao-enviar-denuncia'));

    concluir(resposta(201, CRIADA));
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(corposEnviados()).toHaveLength(1);
  });

  it('já existe denúncia em aberto (409): avisa e leva ao detalhe dela', async () => {
    simularApi({
      criar: () =>
        resposta(
          409,
          erroDaApi('DENUNCIA_EM_ABERTO', 'Você já tem uma denúncia em aberto.', {
            dados: { denunciaEmAbertoId: 'd9' },
          }),
        ),
    });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');
    await preencherMinimo();

    await tocar('ENVIAR DENÚNCIA');

    expect(await screen.findByText(/Você já tem uma denúncia em aberto/)).toBeTruthy();
    await tocar('Ver minha denúncia');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/denuncia/[id]',
      params: { id: 'd9' },
    });
  });

  it('409 sem o id da denúncia leva à lista de ocorrências', async () => {
    simularApi({
      criar: () =>
        resposta(409, erroDaApi('DENUNCIA_EM_ABERTO', 'Você já tem uma denúncia em aberto.')),
    });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');
    await preencherMinimo();

    await tocar('ENVIAR DENÚNCIA');
    await tocar('Ver minhas denúncias');

    expect(mockReplace).toHaveBeenCalledWith('/ocorrencias');
  });

  it('erro de validação do servidor aparece no campo certo', async () => {
    simularApi({
      criar: () =>
        resposta(
          400,
          erroDaApi('VALIDACAO_ERRO', 'Dados inválidos.', {
            detalhes: [{ campo: 'logradouro', mensagem: 'Logradouro não reconhecido.' }],
          }),
        ),
    });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');
    await preencherMinimo();

    await tocar('ENVIAR DENÚNCIA');

    expect(await screen.findByText('Logradouro não reconhecido.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sem internet: mostra o erro, mantém o que foi digitado e o rascunho salvo', async () => {
    simularApi({
      criar: () => {
        throw new TypeError('Network request failed');
      },
    });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');
    await preencherMinimo();

    await tocar('ENVIAR DENÚNCIA');

    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
    expect(screen.getByLabelText('Logradouro').props.value).toBe('Rua A, 1');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(JSON.parse((await AsyncStorage.getItem(chaveDoRascunho('u1')))!)).toMatchObject({
      tipo: 'SEM_ENERGIA',
      bairroId: 1,
      logradouro: 'Rua A, 1',
    });
  });

  it('depois do erro de rede, tentar de novo funciona sem redigitar', async () => {
    let falhar = true;
    simularApi({
      criar: () => {
        if (falhar) throw new TypeError('Network request failed');
        return resposta(201, CRIADA);
      },
    });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');
    await preencherMinimo();
    await tocar('ENVIAR DENÚNCIA');
    await screen.findByText(/Sem conexão/);

    falhar = false;
    await tocar('ENVIAR DENÚNCIA');

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(screen.queryByText(/Sem conexão/)).toBeNull();
  });
});

describe('T-05: rascunho (RNF-008)', () => {
  it('restaura o rascunho salvo ao abrir a tela', async () => {
    simularGps('negada');
    await AsyncStorage.setItem(
      chaveDoRascunho('u1'),
      JSON.stringify({
        tipo: 'OSCILACAO',
        bairroId: 2,
        logradouro: 'Rua do Rascunho',
        descricao: 'oi',
      }),
    );

    await renderizarTela(<DenunciarScreen />);

    await waitFor(() =>
      expect(screen.getByLabelText('Logradouro').props.value).toBe('Rua do Rascunho'),
    );
    expect(screen.getByRole('radio', { name: 'Oscilação' }).props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByLabelText('Descreva o que aconteceu (opcional)').props.value).toBe('oi');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bairro: Nova Marabá (Folha 28)' })).toBeTruthy(),
    );
  });

  it('salva o que o usuário digita', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');

    await digitar('Logradouro', 'Rua Salva');
    await fireEvent.press(screen.getByRole('radio', { name: 'Oscilação' }));

    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(chaveDoRascunho('u1'))) ?? '{}')).toMatchObject(
        {
          logradouro: 'Rua Salva',
          tipo: 'OSCILACAO',
        },
      ),
    );
  });

  it('abrir a tela sem rascunho não grava nada', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');

    expect(await AsyncStorage.getItem(chaveDoRascunho('u1'))).toBeNull();
  });

  it('o rascunho de uma conta não aparece em outra', async () => {
    simularGps('negada');
    await AsyncStorage.setItem(
      chaveDoRascunho('outra-conta'),
      JSON.stringify({ logradouro: 'Rua de outra pessoa' }),
    );

    await renderizarTela(<DenunciarScreen />);
    await screen.findByText('GPS desativado');

    expect(screen.getByLabelText('Logradouro').props.value).toBe('');
  });
});

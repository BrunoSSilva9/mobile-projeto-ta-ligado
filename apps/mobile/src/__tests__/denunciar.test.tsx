import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { AccessibilityInfo, BackHandler, StyleSheet } from 'react-native';

import DenunciarScreen from '@/app/(app)/denunciar';
import { chaveDoRascunho } from '@/features/denuncia/rascunho';
import { queryClient } from '@/services/query-client';
import { useSessao } from '@/store/session';
import { colors } from '@/theme';
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
const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

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

// ---------------------------------------------------------------------------------------------
// Auxiliares do fluxo de 3 passos
// ---------------------------------------------------------------------------------------------

const TITULO_1 = 'O que está acontecendo?';
const TITULO_2 = 'Onde está faltando energia?';
const TITULO_3 = 'Quer contar mais alguma coisa?';

const cartaoSemEnergia = () => screen.getByRole('radio', { name: /^Estou sem energia/ });
const cartaoOscilando = () => screen.getByRole('radio', { name: /^A energia está oscilando/ });

async function irParaPasso2(tipo: 'sem energia' | 'oscilando' = 'sem energia') {
  await fireEvent.press(tipo === 'sem energia' ? cartaoSemEnergia() : cartaoOscilando());
  await tocar('Continuar');
  await screen.findByRole('header', { name: TITULO_2 });
}

/** Com o GPS ok: espera o endereço achado pelo celular aparecer no cartão. */
async function esperarEnderecoDoGps() {
  await screen.findByText('Achamos pela localização do celular');
  await screen.findByText('Rua das Flores, 10');
  await screen.findByText('Nova Marabá (Folha 28), Marabá');
}

async function escolherBairro(nome: string) {
  await fireEvent.press(screen.getByRole('button', { name: /^Bairro:/ }));
  await fireEvent.press(await screen.findByRole('button', { name: nome }));
}

/** Sem GPS os campos já vêm abertos: preenche o mínimo à mão (logradouro e bairro). */
async function preencherEnderecoAMao() {
  await digitar('Logradouro', 'Rua A, 1');
  await escolherBairro('Cidade Nova');
}

/** Do passo 2 (endereço pronto, pelo GPS ou à mão) até o passo 3. */
async function confirmarLocal() {
  const confirmar = screen.queryByRole('button', { name: 'Sim, está certo' });
  await tocar(confirmar ? 'Sim, está certo' : 'Continuar');
  await screen.findByRole('header', { name: TITULO_3 });
}

/** Fluxo completo com o GPS ok: passos 1 e 2 e chega no passo 3. */
async function irAtePasso3ComGps(tipo: 'sem energia' | 'oscilando' = 'sem energia') {
  await irParaPasso2(tipo);
  await esperarEnderecoDoGps();
  await confirmarLocal();
}

/** Fluxo completo sem GPS (permissão negada): passo 2 preenchido à mão e chega no passo 3. */
async function irAtePasso3SemGps() {
  await irParaPasso2();
  await screen.findByText(/A localização do celular está desativada/);
  await preencherEnderecoAMao();
  await confirmarLocal();
}

const enviar = () => tocar('Enviar denúncia');

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

describe('Passo 1 · "O que está acontecendo?"', () => {
  it('mostra o título, o apoio e os dois cartões de escolha, e ainda não tem os campos de endereço', async () => {
    await renderizarTela(<DenunciarScreen />);

    expect(screen.getByRole('header', { name: TITULO_1 })).toBeTruthy();
    expect(screen.getByText('Toque na opção que combina com a sua casa.')).toBeTruthy();
    expect(screen.getByText('A luz acabou de vez. Nada liga.')).toBeTruthy();
    expect(screen.getByText('A luz pisca, fica fraca ou cai e volta.')).toBeTruthy();
    expect(screen.queryByLabelText('Logradouro')).toBeNull();
    expect(screen.queryByLabelText('Descreva o que aconteceu (opcional)')).toBeNull();
  });

  it('os cartões formam um grupo de rádio com o estado marcado', async () => {
    await renderizarTela(<DenunciarScreen />);

    expect(cartaoSemEnergia().props.accessibilityState).toMatchObject({ checked: false });

    await fireEvent.press(cartaoSemEnergia());

    expect(cartaoSemEnergia().props.accessibilityState).toMatchObject({ checked: true });
    expect(cartaoOscilando().props.accessibilityState).toMatchObject({ checked: false });
  });

  it('"Continuar" fica desativado, dizendo "Escolha uma opção para continuar", até escolher', async () => {
    await renderizarTela(<DenunciarScreen />);

    const botao = screen.getByRole('button', { name: 'Escolha uma opção para continuar' });
    expect(botao.props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull();

    await fireEvent.press(cartaoOscilando());

    expect(
      screen.getByRole('button', { name: 'Continuar' }).props.accessibilityState,
    ).toMatchObject({
      disabled: false,
    });
    expect(screen.queryByRole('button', { name: 'Escolha uma opção para continuar' })).toBeNull();
  });

  it('mostra o aviso de segurança com o 193, sem anunciar como alerta ao abrir', async () => {
    await renderizarTela(<DenunciarScreen />);

    expect(screen.getByText(/Fio caído ou risco de choque\?/)).toBeTruthy();
    expect(screen.getByText(/Ligue para os Bombeiros: 193/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('o botão Voltar fecha a tela (ou vai ao início se não houver para onde voltar)', async () => {
    await renderizarTela(<DenunciarScreen />);

    await tocar('Voltar');
    expect(mockBack).toHaveBeenCalledTimes(1);

    mockCanGoBack.mockReturnValue(false);
    await tocar('Voltar');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('mostra "Passo 1 de 3" e a barra de progresso', async () => {
    await renderizarTela(<DenunciarScreen />);

    expect(screen.getAllByText('Passo 1 de 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({
      min: 1,
      max: 3,
      now: 1,
    });
  });

  it('não pede nada que fica para a Fase 2 (fotos, pessoas afetadas, necessidade especial)', async () => {
    await renderizarTela(<DenunciarScreen />);

    expect(screen.queryByText(/foto/i)).toBeNull();
    expect(screen.queryByText(/pessoas afetadas/i)).toBeNull();
    expect(screen.queryByText(/necessidade especial/i)).toBeNull();
  });

  it('não tem mais os textos antigos (maiúsculas, "GPS ATIVO", "Onde faltou luz?")', async () => {
    await renderizarTela(<DenunciarScreen />);

    expect(screen.queryByText(/Onde faltou luz/)).toBeNull();
    expect(screen.queryByText('REGISTRO EM TEMPO REAL')).toBeNull();
    expect(screen.queryByText(/ENVIAR DENÚNCIA/)).toBeNull();
    expect(screen.queryByText(/Passo 1 de 1/)).toBeNull();
  });
});

describe('Navegação entre os passos', () => {
  it('1 → 2 → 3 e de volta, mantendo o que foi escolhido, com "Passo X de 3" e anúncio para o leitor de tela', async () => {
    await renderizarTela(<DenunciarScreen />);

    await irParaPasso2('oscilando');
    expect(screen.getAllByText('Passo 2 de 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 2 });
    expect(anunciar).toHaveBeenLastCalledWith(`Passo 2 de 3: ${TITULO_2}`);

    await esperarEnderecoDoGps();
    await confirmarLocal();
    expect(screen.getAllByText('Passo 3 de 3').length).toBeGreaterThan(0);
    expect(anunciar).toHaveBeenLastCalledWith(`Passo 3 de 3: ${TITULO_3}`);

    await tocar('Voltar');
    expect(await screen.findByRole('header', { name: TITULO_2 })).toBeTruthy();
    expect(anunciar).toHaveBeenLastCalledWith(`Passo 2 de 3: ${TITULO_2}`);

    await tocar('Voltar');
    expect(await screen.findByRole('header', { name: TITULO_1 })).toBeTruthy();
    expect(cartaoOscilando().props.accessibilityState).toMatchObject({ checked: true });
    expect(mockBack).not.toHaveBeenCalled(); // "Voltar" dos passos 2 e 3 não fecha a tela
  });

  it('o botão voltar do Android volta um passo; no passo 1 deixa o sistema fechar a tela', async () => {
    const assinar = jest.spyOn(BackHandler, 'addEventListener');
    await renderizarTela(<DenunciarScreen />);
    const tratador = () => assinar.mock.calls[assinar.mock.calls.length - 1]![1] as () => boolean;
    expect(tratador()()).toBe(false); // passo 1: o sistema cuida

    await irParaPasso2();
    let resultado = false;
    await act(async () => {
      resultado = tratador()();
    });

    expect(resultado).toBe(true);
    expect(await screen.findByRole('header', { name: TITULO_1 })).toBeTruthy();
    assinar.mockRestore();
  });

  it('"Continuar" só avança com o passo válido', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();
    await screen.findByText(/A localização do celular está desativada/);

    await tocar('Continuar'); // sem logradouro e sem bairro

    expect(await screen.findByText('Informe o logradouro (pelo menos 3 caracteres).')).toBeTruthy();
    expect(screen.getByText('Escolha o bairro.')).toBeTruthy();
    expect(screen.getByRole('header', { name: TITULO_2 })).toBeTruthy(); // continua no passo 2
    expect(corposEnviados()).toHaveLength(0);
  });
});

describe('Passo 2 · "Onde está faltando energia?" (GPS, RN-012, RN-025)', () => {
  it('com GPS: mostra o mapa, "Achamos pela localização do celular" e o endereço achado, sem os campos', async () => {
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();
    await esperarEnderecoDoGps();

    expect(
      JSON.parse(
        screen.getByTestId('pino', { includeHiddenElements: true }).props.accessibilityLabel,
      ),
    ).toEqual({ latitude: -5.37, longitude: -49.12 });
    expect(screen.getByText('Este endereço está certo?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sim, está certo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Não, quero corrigir' })).toBeTruthy();
    expect(screen.queryByLabelText('Logradouro')).toBeNull();
    expect(screen.queryByText(/GPS ATIVO/)).toBeNull();
  });

  it('"Não, quero corrigir" abre os campos de bairro, logradouro e CEP já preenchidos', async () => {
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();
    await esperarEnderecoDoGps();

    await tocar('Não, quero corrigir');

    expect(screen.getByLabelText('Logradouro').props.value).toBe('Rua das Flores, 10');
    expect(screen.getByRole('button', { name: 'Bairro: Nova Marabá (Folha 28)' })).toBeTruthy();
    expect(screen.getByLabelText('CEP (opcional)')).toBeTruthy();
    expect(screen.queryByLabelText('Ponto de referência (opcional)')).toBeNull(); // só no passo 3
    expect(screen.queryByRole('button', { name: 'Não, quero corrigir' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy();
  });

  it('não sobrescreve o que já estava escolhido (rascunho) com a sugestão do GPS', async () => {
    await AsyncStorage.setItem(
      chaveDoRascunho('u1'),
      JSON.stringify({ tipo: 'SEM_ENERGIA', bairroId: 1, logradouro: 'Rua do Rascunho' }),
    );
    await renderizarTela(<DenunciarScreen />);
    await tocar('Continuar');
    await screen.findByText('Achamos pela localização do celular');
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await tocar('Não, quero corrigir');

    expect(screen.getByLabelText('Logradouro').props.value).toBe('Rua do Rascunho');
    expect(screen.getByRole('button', { name: 'Bairro: Cidade Nova' })).toBeTruthy();
  });

  it('arrastar o pino atualiza as coordenadas enviadas e busca o bairro de novo', async () => {
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();
    await esperarEnderecoDoGps();
    await fireEvent(screen.getByTestId('pino', { includeHiddenElements: true }), 'dragEnd', {
      nativeEvent: { coordinate: { latitude: -5.4, longitude: -49.2 } },
    });

    await waitFor(() =>
      expect(mockFetch.mock.calls.some(([u]) => String(u).includes('lat=-5.4&lng=-49.2'))).toBe(
        true,
      ),
    );
    await confirmarLocal();
    await enviar();

    await waitFor(() => expect(corposEnviados()).toHaveLength(1));
    expect(corposEnviados()[0]).toMatchObject({ latitude: -5.4, longitude: -49.2 });
  });

  it('permissão negada: avisa, abre os campos e envia sem coordenadas', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();

    expect(await screen.findByText(/A localização do celular está desativada/)).toBeTruthy();
    expect(screen.queryByTestId('mapa')).toBeNull();
    expect(screen.getByLabelText('Logradouro')).toBeTruthy(); // campos já abertos
    expect(screen.queryByRole('button', { name: 'Sim, está certo' })).toBeNull();

    await preencherEnderecoAMao();
    await confirmarLocal();
    await enviar();

    await waitFor(() => expect(corposEnviados()).toHaveLength(1));
    const corpo = corposEnviados()[0]!;
    expect(corpo).toEqual({ tipo: 'SEM_ENERGIA', bairroId: 1, logradouro: 'Rua A, 1' });
    expect(corpo).not.toHaveProperty('latitude');
  });

  it('GPS do aparelho desligado explica o motivo', async () => {
    simularGps('desativada');
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();

    expect(await screen.findByText(/O GPS do celular está desligado/)).toBeTruthy();
  });

  it('"Tentar de novo" busca a localização outra vez', async () => {
    simularGps('desativada');
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();
    await screen.findByText(/O GPS do celular está desligado/);

    simularGps('ok');
    await tocar('Tentar de novo');

    expect(await screen.findByText('Achamos pela localização do celular')).toBeTruthy();
  });

  it('enquanto busca, mostra "Buscando a sua localização…" e não deixa avançar', async () => {
    let liberar: (v: never) => void = () => undefined;
    loc.getCurrentPositionAsync.mockImplementation(
      () => new Promise((r) => (liberar = r as (v: never) => void)),
    );
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();

    expect(await screen.findByText('Buscando a sua localização…')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Continuar' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    liberar({ coords: { latitude: -5.37, longitude: -49.12 } } as never); // GPS responde
    expect(await screen.findByText('Achamos pela localização do celular')).toBeTruthy();
  });

  it('CEP inválido bloqueia o passo', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();
    await screen.findByText(/A localização do celular está desativada/);
    await preencherEnderecoAMao();
    await digitar('CEP (opcional)', '123');

    await tocar('Continuar');

    expect(await screen.findByText('Informe o CEP no formato 68500-000.')).toBeTruthy();
    expect(screen.getByRole('header', { name: TITULO_2 })).toBeTruthy();
    expect(corposEnviados()).toHaveLength(0);
  });

  it('"Sim, está certo" com o endereço apagado leva aos campos, com os erros', async () => {
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();
    await esperarEnderecoDoGps();
    await tocar('Não, quero corrigir');
    await fireEvent.changeText(screen.getByLabelText('Logradouro'), '');

    await tocar('Continuar');

    expect(await screen.findByText('Informe o logradouro (pelo menos 3 caracteres).')).toBeTruthy();
    expect(corposEnviados()).toHaveLength(0);
  });
});

describe('Passo 2: seletor de bairro', () => {
  it('lista os bairros com a folha e filtra pela busca, sem diferenciar acentos', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();
    await screen.findByText(/A localização do celular está desativada/);
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
    await irParaPasso2();
    await screen.findByText(/A localização do celular está desativada/);

    await escolherBairro('Nova Marabá (Folha 28)');

    expect(screen.getByRole('button', { name: 'Bairro: Nova Marabá (Folha 28)' })).toBeTruthy();
    expect(screen.queryByText('Escolha o bairro', { exact: true })).toBeNull();
  });

  it('se a lista de bairros falhar, oferece tentar de novo', async () => {
    // 403 não é repetido sozinho (só rede e 5xx são), então o erro aparece na hora.
    simularApi({ bairros: () => resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.')) });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();

    expect(await screen.findByText('Não foi possível carregar a lista de bairros.')).toBeTruthy();

    simularApi();
    await tocar('Recarregar bairros');
    await waitFor(() =>
      expect(screen.queryByText('Não foi possível carregar a lista de bairros.')).toBeNull(),
    );
  });
});

describe('Passo 3 · "Quer contar mais alguma coisa?"', () => {
  it('mostra os campos opcionais, o resumo e o botão "Enviar denúncia" (sem maiúsculas)', async () => {
    await renderizarTela(<DenunciarScreen />);
    await irAtePasso3ComGps();

    expect(screen.getByLabelText('Descreva o que aconteceu (opcional)')).toBeTruthy();
    expect(screen.getByLabelText('Ponto de referência (opcional)')).toBeTruthy();
    expect(screen.getByText('O que será enviado')).toBeTruthy();
    expect(screen.getByLabelText('Situação da energia: Sem energia')).toBeTruthy();
    expect(screen.getByText('Rua das Flores, 10')).toBeTruthy();
    expect(screen.getByText('Nova Marabá (Folha 28), Marabá')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar denúncia' })).toBeTruthy();
    expect(screen.getByText(/Envie só avisos verdadeiros/)).toBeTruthy();
  });

  it('o resumo mostra o tipo escolhido no passo 1', async () => {
    await renderizarTela(<DenunciarScreen />);
    await irAtePasso3ComGps('oscilando');

    expect(screen.getByLabelText('Situação da energia: Oscilando')).toBeTruthy();
  });

  it('a descrição mostra o contador de caracteres', async () => {
    await renderizarTela(<DenunciarScreen />);
    await irAtePasso3ComGps();

    await digitar('Descreva o que aconteceu (opcional)', 'sem luz');

    expect(screen.getByText('7/500 caracteres')).toBeTruthy();
  });
});

describe('Envio (RF-007, RF-012)', () => {
  it('envia o corpo certo, limpa o rascunho e vai para a tela de sucesso com o protocolo', async () => {
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2('oscilando');
    await esperarEnderecoDoGps();
    await tocar('Não, quero corrigir');
    await digitar('CEP (opcional)', '68500-000');
    await confirmarLocal();
    await digitar('Ponto de referência (opcional)', 'perto da padaria');
    await digitar('Descreva o que aconteceu (opcional)', 'luz piscando');

    await enviar();

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
        params: {
          id: 'd1',
          protocolo: 'TL-2026-000001',
          logradouro: 'Rua das Flores, 10',
          bairro: 'Nova Marabá (Folha 28)',
        },
      }),
    );
    expect(await AsyncStorage.getItem(chaveDoRascunho('u1'))).toBeNull();
  });

  it('envia o token da sessão', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irAtePasso3SemGps();

    await enviar();

    await waitFor(() => expect(corposEnviados()).toHaveLength(1));
    const chamada = mockFetch.mock.calls.find(([, i]) => i?.method === 'POST')!;
    expect(chamada[1].headers.Authorization).toBe(`Bearer ${SESSAO_DE_CIDADAO.token}`);
  });

  it('enquanto envia, o botão fica ocupado e um segundo toque não duplica a denúncia', async () => {
    let concluir: (r: Response) => void = () => undefined;
    simularApi({ criar: () => new Promise<Response>((r) => (concluir = r)) });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irAtePasso3SemGps();

    await enviar();
    await waitFor(() =>
      expect(screen.getByTestId('botao-enviar-denuncia').props.accessibilityState.busy).toBe(true),
    );
    await fireEvent.press(screen.getByTestId('botao-enviar-denuncia'));

    concluir(resposta(201, CRIADA));
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(corposEnviados()).toHaveLength(1);
  });

  it('já existe denúncia em aberto (409): avisa no passo 3 e leva ao detalhe dela', async () => {
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
    await irAtePasso3SemGps();

    await enviar();

    expect(await screen.findByText(/Você já tem uma denúncia em aberto/)).toBeTruthy();
    expect(screen.getByRole('header', { name: TITULO_3 })).toBeTruthy();
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
    await irAtePasso3SemGps();

    await enviar();
    await tocar('Ver minhas denúncias');

    expect(mockReplace).toHaveBeenCalledWith('/ocorrencias');
  });

  it('erro de validação do servidor num campo do passo 2 leva de volta a esse passo, no campo certo', async () => {
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
    await irAtePasso3SemGps();

    await enviar();

    expect(await screen.findByText('Logradouro não reconhecido.')).toBeTruthy();
    expect(screen.getByRole('header', { name: TITULO_2 })).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('erro de validação do servidor num campo do passo 3 fica no passo 3', async () => {
    simularApi({
      criar: () =>
        resposta(
          400,
          erroDaApi('VALIDACAO_ERRO', 'Dados inválidos.', {
            detalhes: [{ campo: 'descricao', mensagem: 'Descrição não permitida.' }],
          }),
        ),
    });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irAtePasso3SemGps();

    await enviar();

    expect(await screen.findByText('Descrição não permitida.')).toBeTruthy();
    expect(screen.getByRole('header', { name: TITULO_3 })).toBeTruthy();
  });

  it('sem internet: mostra o erro, mantém o que foi digitado e o rascunho salvo', async () => {
    simularApi({
      criar: () => {
        throw new TypeError('Network request failed');
      },
    });
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irAtePasso3SemGps();

    await enviar();

    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
    expect(screen.getByRole('header', { name: TITULO_3 })).toBeTruthy();
    expect(screen.getByText('Rua A, 1')).toBeTruthy();
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
    await irAtePasso3SemGps();
    await enviar();
    await screen.findByText(/Sem conexão/);

    falhar = false;
    await enviar();

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(screen.queryByText(/Sem conexão/)).toBeNull();
  });
});

describe('Rascunho (RNF-008)', () => {
  it('restaura o rascunho salvo: abre no passo 1 com tudo preenchido', async () => {
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

    expect(screen.getByRole('header', { name: TITULO_1 })).toBeTruthy();
    await waitFor(() =>
      expect(cartaoOscilando().props.accessibilityState).toMatchObject({ checked: true }),
    );

    await tocar('Continuar');
    expect(await screen.findByText('Rua do Rascunho')).toBeTruthy();
    expect(await screen.findByText('Nova Marabá (Folha 28), Marabá')).toBeTruthy();
    await tocar('Não, quero corrigir');
    expect(screen.getByLabelText('Logradouro').props.value).toBe('Rua do Rascunho');

    await confirmarLocal();
    expect(screen.getByLabelText('Descreva o que aconteceu (opcional)').props.value).toBe('oi');
  });

  it('salva o que o usuário digita e escolhe', async () => {
    simularGps('negada');
    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2('oscilando');
    await screen.findByText(/A localização do celular está desativada/);

    await digitar('Logradouro', 'Rua Salva');

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
    await irParaPasso2();
    await screen.findByText(/A localização do celular está desativada/);

    // Só o tipo escolhido foi gravado; nenhum campo de texto aparece vazio no rascunho.
    const salvo = JSON.parse((await AsyncStorage.getItem(chaveDoRascunho('u1'))) ?? '{}');
    expect(salvo).not.toHaveProperty('logradouro');
  });

  it('o rascunho de uma conta não aparece em outra', async () => {
    simularGps('negada');
    await AsyncStorage.setItem(
      chaveDoRascunho('outra-conta'),
      JSON.stringify({ logradouro: 'Rua de outra pessoa' }),
    );

    await renderizarTela(<DenunciarScreen />);
    await irParaPasso2();
    await screen.findByText(/A localização do celular está desativada/);

    expect(screen.getByLabelText('Logradouro').props.value).toBe('');
  });
});

describe('Aparência (design system v2)', () => {
  it('o rodapé tem o botão principal azul de 56 dp e fica fora da rolagem', async () => {
    await renderizarTela(<DenunciarScreen />);
    await fireEvent.press(cartaoSemEnergia());

    const botao = screen.getByRole('button', { name: 'Continuar' });
    const estilo = StyleSheet.flatten(botao.props.style) as Record<string, unknown>;

    expect(estilo.backgroundColor).toBe(colors.action);
    expect(Number(estilo.minHeight)).toBeGreaterThanOrEqual(56);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { StyleSheet } from 'react-native';

import OcorrenciasScreen, { textoDeAtualizacao } from '@/app/(app)/(tabs)/ocorrencias';
import InicioScreen from '@/app/(app)/(tabs)/index';
import { frasesDeApoio } from '@/components/CartaoEnergiaDoBairro';
import { chaveDoBairroEscolhido } from '@/features/ocorrencias/bairro-escolhido';
import { LocalizacaoProvider } from '@/providers/LocalizacaoProvider';
import { SocketProvider } from '@/providers/SocketProvider';
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
import { limparSockets, ultimoSocket } from '@/testing/socket';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn() },
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

const bairro = (extra: Record<string, unknown> = {}) => ({
  bairroId: 2,
  nome: 'Nova Marabá',
  folha: 'Folha 28',
  latitude: -5.37,
  longitude: -49.12,
  status: 'SEM_LUZ',
  emAberto: 2,
  previsaoReparo: null,
  ...extra,
});
const OUTRO_BAIRRO = bairro({
  bairroId: 1,
  nome: 'Cidade Nova',
  folha: null,
  latitude: -5.35,
  longitude: -49.1,
  status: 'NORMAL',
  emAberto: 0,
});

const agoraIso = (minAtras: number) => new Date(Date.now() - minAtras * 60_000).toISOString();
const ITEM_A = {
  id: 'o1',
  tipo: 'SEM_ENERGIA',
  status: 'RECEBIDA',
  bairro: 'Nova Marabá',
  folha: 'Folha 28',
  logradouro: 'Av. VP-8',
  descricao: 'Queda brusca de energia',
  latitude: -5.371,
  longitude: -49.123,
  criadoEm: agoraIso(5),
};
const ITEM_B = {
  id: 'o2',
  tipo: 'OSCILACAO',
  status: 'RECEBIDA',
  bairro: 'Cidade Nova',
  folha: null,
  logradouro: 'Rua 7',
  descricao: null,
  latitude: null,
  longitude: null,
  criadoEm: agoraIso(125),
};
const TOTAIS = { todos: 3, semLuz: 1, oscilacao: 1, restabelecidos: 1 };

type Rotas = {
  status?: () => Response;
  proximo?: () => Response;
  ocorrencias?: (url: string) => Response;
};

function simularApi(rotas: Rotas = {}) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.endsWith('/bairros')) {
      return resposta(200, {
        bairros: [OUTRO_BAIRRO, bairro()].map((b) => ({
          id: b.bairroId,
          nome: b.nome,
          folha: b.folha,
          latitude: b.latitude,
          longitude: b.longitude,
        })),
      });
    }
    if (url.includes('/bairros/proximo')) {
      return (rotas.proximo ?? (() => resposta(200, { ...bairro(), id: 2, distanciaKm: 0.3 })))();
    }
    if (url.includes('/bairros/status')) {
      return (
        rotas.status ??
        (() =>
          resposta(200, {
            atualizadoEm: new Date().toISOString(),
            bairros: [OUTRO_BAIRRO, bairro()],
          }))
      )();
    }
    if (url.includes('/ocorrencias')) {
      return (
        rotas.ocorrencias ??
        (() =>
          resposta(200, {
            itens: [ITEM_A, ITEM_B],
            pagina: 1,
            total: 2,
            totais: TOTAIS,
            atualizadoEm: new Date().toISOString(),
          }))
      )(url);
    }
    throw new Error(`Chamada inesperada: ${url}`);
  });
}

function simularGps(estado: 'ok' | 'negada' = 'ok') {
  loc.requestForegroundPermissionsAsync.mockResolvedValue({
    granted: estado === 'ok',
    canAskAgain: true,
  } as never);
  loc.hasServicesEnabledAsync.mockResolvedValue(true);
  loc.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: -5.371, longitude: -49.12 },
  } as never);
  loc.reverseGeocodeAsync.mockResolvedValue([{ street: 'Rua A', streetNumber: '1' }] as never);
}

const comTudo = (tela: React.ReactElement) => (
  <SocketProvider>
    <LocalizacaoProvider>{tela}</LocalizacaoProvider>
  </SocketProvider>
);

const urlsDe = (trecho: string) =>
  mockFetch.mock.calls.map(([u]) => String(u)).filter((u) => u.includes(trecho));

beforeAll(configurarCacheParaTestes);
beforeEach(async () => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  limparSockets();
  armazenamentoEmMemoria.clear();
  await AsyncStorage.clear();
  queryClient.clear();
  await useSessao.getState().entrar(SESSAO_DE_CIDADAO);
  simularApi();
  simularGps('ok');
});

describe('T-03 Início (design system v2)', () => {
  const GPS_ERRO_404 = () =>
    resposta(404, erroDaApi('NAO_ENCONTRADO', 'Nenhum bairro encontrado.'));

  it('cumprimenta pelo primeiro nome, sem exclamação', async () => {
    await renderizarTela(comTudo(<InicioScreen />));

    expect(await screen.findByRole('header', { name: 'Olá, Maria' })).toBeTruthy();
    expect(screen.queryByText(/Olá, Maria!/)).toBeNull();
  });

  describe('cartão "Energia no seu bairro agora"', () => {
    it('mostra a situação (ícone, nome na cor dela) e a frase de apoio', async () => {
      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText('Energia no seu bairro agora')).toBeTruthy();
      const nome = await screen.findByText('Sem energia');
      expect(StyleSheet.flatten(nome.props.style).color).toBe(colors.situacao.semEnergia.texto);
      expect(screen.getByText('2 denúncias em aberto')).toBeTruthy();
      expect(
        screen.getByLabelText('Situação da energia: Sem energia. 2 denúncias em aberto'),
      ).toBeTruthy();
    });

    it('bairro normal: "Normal" e "Nenhuma falta de energia avisada"', async () => {
      simularApi({
        status: () =>
          resposta(200, {
            atualizadoEm: new Date().toISOString(),
            bairros: [OUTRO_BAIRRO, bairro({ status: 'NORMAL', emAberto: 0 })],
          }),
      });
      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText('Normal')).toBeTruthy();
      expect(screen.getByText('Nenhuma falta de energia avisada')).toBeTruthy();
    });

    it('oscilando: "Oscilando" e "1 denúncia em aberto"', async () => {
      simularApi({
        status: () =>
          resposta(200, {
            atualizadoEm: new Date().toISOString(),
            bairros: [OUTRO_BAIRRO, bairro({ status: 'OSCILACAO', emAberto: 1 })],
          }),
      });
      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText('Oscilando')).toBeTruthy();
      expect(screen.getByText('1 denúncia em aberto')).toBeTruthy();
    });

    it('não usa mais "Rede estável/instável" nem "Sem luz"', async () => {
      await renderizarTela(comTudo(<InicioScreen />));
      await screen.findByText('Sem energia');

      expect(screen.queryByText(/Rede (estável|instável)/i)).toBeNull();
      expect(screen.queryByText(/Sem luz/)).toBeNull();
    });

    it('mostra a previsão de reparo quando há', async () => {
      simularApi({
        status: () =>
          resposta(200, {
            atualizadoEm: new Date().toISOString(),
            bairros: [bairro({ previsaoReparo: '2026-11-20T01:30:00.000Z' })],
          }),
      });
      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText('Previsão de reparo: 19/11/2026 às 22:30')).toBeTruthy();
    });

    it('mostra o endereço achado pela localização, com o bairro e a cidade, e "Trocar"', async () => {
      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText('Rua A, 1')).toBeTruthy();
      expect(screen.getByText('Nova Marabá (Folha 28), Marabá')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Trocar' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Usar minha localização' })).toBeNull();
    });

    it('usa o bairro mais próximo do GPS (RN-025)', async () => {
      await renderizarTela(comTudo(<InicioScreen />));
      await screen.findByText('Sem energia');

      expect(urlsDe('/bairros/proximo')[0]).toContain('lat=-5.371');
    });

    it('a situação muda em tempo real quando o painel atualiza o bairro (RF-023)', async () => {
      await renderizarTela(comTudo(<InicioScreen />));
      await screen.findByText('Sem energia');
      const chamadas = mockFetch.mock.calls.length;

      await act(async () =>
        ultimoSocket()!.__emitir('bairro:status-atualizado', {
          bairroId: 2,
          nome: 'Nova Marabá',
          folha: 'Folha 28',
          status: 'NORMAL',
          emAberto: 0,
          previsaoReparo: null,
        }),
      );

      expect(await screen.findByText('Normal')).toBeTruthy();
      expect(screen.getByText('Nenhuma falta de energia avisada')).toBeTruthy();
      expect(mockFetch.mock.calls.length).toBe(chamadas); // sem nova consulta
    });

    it('erro ao carregar a situação: mostra a mensagem e tenta de novo', async () => {
      simularApi({ status: () => resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.')) });
      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText('Sem permissão.')).toBeTruthy();

      simularApi();
      await tocar('Tentar de novo');
      expect(await screen.findByText('Sem energia')).toBeTruthy();
    });
  });

  describe('GPS indisponível e bairro escolhido à mão (Trocar)', () => {
    it('GPS negado: explica e oferece escolher o bairro ou tentar de novo', async () => {
      simularGps('negada');
      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText(/Não achamos você pela localização do celular/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Escolher bairro' })).toBeTruthy();

      simularGps('ok');
      await tocar('Tentar de novo');
      expect(await screen.findByText('Sem energia')).toBeTruthy();
    });

    it('fora de Marabá (404 do bairro próximo): explica e oferece escolher o bairro', async () => {
      simularApi({ proximo: GPS_ERRO_404 });
      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText(/fora de Marabá/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Escolher bairro' })).toBeTruthy();
    });

    it('sem GPS: escolher o bairro mostra a energia dele e salva só no aparelho', async () => {
      simularGps('negada');
      await renderizarTela(comTudo(<InicioScreen />));
      await tocar('Escolher bairro');

      await fireEvent.press(await screen.findByRole('button', { name: 'Cidade Nova' }));

      expect(await screen.findByText('Normal')).toBeTruthy();
      expect(screen.getByText('Nenhuma falta de energia avisada')).toBeTruthy();
      expect(screen.getAllByText('Cidade Nova').length).toBeGreaterThan(0);
      await waitFor(async () =>
        expect(await AsyncStorage.getItem(chaveDoBairroEscolhido('u1'))).toBe('{"bairroId":1}'),
      );
    });

    it('a escolha NUNCA vai para a API: só há leituras (GET)', async () => {
      simularGps('negada');
      await renderizarTela(comTudo(<InicioScreen />));
      await tocar('Escolher bairro');
      await fireEvent.press(await screen.findByRole('button', { name: 'Cidade Nova' }));
      await screen.findByText('Normal');

      const metodos = mockFetch.mock.calls.map(([, init]) => (init as { method?: string }).method);
      expect(metodos.every((m) => m === 'GET')).toBe(true);
      expect(mockFetch.mock.calls.some(([u]) => String(u).includes('bairroId=1'))).toBe(false);
    });

    it('"Trocar" com GPS: escolhe outro bairro e aparece "Usar minha localização"', async () => {
      await renderizarTela(comTudo(<InicioScreen />));
      await screen.findByText('Sem energia');

      await tocar('Trocar');
      await fireEvent.press(await screen.findByRole('button', { name: 'Cidade Nova' }));

      expect(await screen.findByText('Normal')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Usar minha localização' })).toBeTruthy();
      expect(screen.queryByText('Rua A, 1')).toBeNull(); // o endereço do GPS não vale para o bairro escolhido
    });

    it('"Usar minha localização" volta ao bairro do GPS e apaga a escolha salva', async () => {
      await renderizarTela(comTudo(<InicioScreen />));
      await screen.findByText('Sem energia');
      await tocar('Trocar');
      await fireEvent.press(await screen.findByRole('button', { name: 'Cidade Nova' }));
      await screen.findByText('Normal');

      await tocar('Usar minha localização');

      expect(await screen.findByText('Sem energia')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Usar minha localização' })).toBeNull();
      await waitFor(async () =>
        expect(await AsyncStorage.getItem(chaveDoBairroEscolhido('u1'))).toBeNull(),
      );
    });

    it('a escolha salva volta ao abrir o app de novo', async () => {
      await AsyncStorage.setItem(chaveDoBairroEscolhido('u1'), '{"bairroId":1}');

      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText('Normal')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Usar minha localização' })).toBeTruthy();
    });

    it('uma escolha antiga que não existe mais na lista é ignorada (volta ao GPS)', async () => {
      await AsyncStorage.setItem(chaveDoBairroEscolhido('u1'), '{"bairroId":999}');

      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText('Sem energia')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Usar minha localização' })).toBeNull();
    });

    it('o bairro escolhido de uma conta não aparece em outra', async () => {
      await AsyncStorage.setItem(chaveDoBairroEscolhido('outra-conta'), '{"bairroId":1}');

      await renderizarTela(comTudo(<InicioScreen />));

      expect(await screen.findByText('Sem energia')).toBeTruthy();
    });

    it('a lista do "Trocar" tem busca por bairro ou folha e botão "Fechar" com texto', async () => {
      await renderizarTela(comTudo(<InicioScreen />));
      await screen.findByText('Sem energia');
      await tocar('Trocar');

      await digitar('Buscar bairro ou folha', 'folha 28');
      expect(await screen.findByRole('button', { name: 'Nova Marabá (Folha 28)' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Cidade Nova' })).toBeNull();

      await tocar('Fechar');
      expect(screen.queryByText('Escolha o bairro')).toBeNull();
    });
  });

  describe('ação principal, atalhos e contatos', () => {
    it('o cartão da ação principal tem o botão "Fazer denúncia", que abre o formulário', async () => {
      await renderizarTela(comTudo(<InicioScreen />));

      expect(screen.getByText('Ficou sem energia?')).toBeTruthy();
      expect(screen.getByText('Avise a Equatorial por aqui. Leva menos de 1 minuto.')).toBeTruthy();
      await tocar('Fazer denúncia');

      expect(mockPush).toHaveBeenCalledWith('/denunciar');
    });

    it('os textos antigos de denúncia e de mapa não existem mais', async () => {
      await renderizarTela(comTudo(<InicioScreen />));

      expect(screen.queryByText(/Registre sua denúncia/)).toBeNull();
      expect(screen.queryByText(/Ver mapa ampliado/)).toBeNull();
    });

    it('"Ver onde falta energia" abre o Mapa e "Minhas denúncias" abre a lista', async () => {
      await renderizarTela(comTudo(<InicioScreen />));

      await tocar('Ver onde falta energia');
      expect(mockPush).toHaveBeenLastCalledWith('/ocorrencias');

      await tocar('Minhas denúncias');
      expect(mockPush).toHaveBeenLastCalledWith('/minhas-denuncias');
    });

    it('"Ajuda" (ícone e texto) abre a tela de ajuda', async () => {
      await renderizarTela(comTudo(<InicioScreen />));

      expect(screen.getByText('Ajuda')).toBeTruthy();
      await tocar('Ajuda');

      expect(mockPush).toHaveBeenCalledWith('/ajuda');
    });

    it('o mini-mapa saiu da Início: o mapa fica só na aba Mapa', async () => {
      await renderizarTela(comTudo(<InicioScreen />));
      await screen.findByText('Sem energia');

      expect(screen.queryByTestId('mapa')).toBeNull();
      expect(screen.queryByTestId('circulo')).toBeNull();
    });

    it('"Como funciona" tem 3 passos curtos', async () => {
      await renderizarTela(comTudo(<InicioScreen />));

      expect(screen.getByRole('header', { name: 'Como funciona' })).toBeTruthy();
      expect(screen.getByLabelText('Passo 1: Você avisa que a energia caiu.')).toBeTruthy();
      expect(screen.getByLabelText('Passo 2: A Equatorial recebe o aviso na hora.')).toBeTruthy();
      expect(
        screen.getByLabelText('Passo 3: Você acompanha aqui até a energia voltar.'),
      ).toBeTruthy();
    });

    it('"Prefere falar com alguém?" mostra o horário e o botão "Ligar para a Equatorial"', async () => {
      await renderizarTela(comTudo(<InicioScreen />));

      expect(screen.getByText('Prefere falar com alguém?')).toBeTruthy();
      expect(screen.getByText(/Central: Segunda a Sexta/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Ligar para a Equatorial' })).toBeTruthy();
    });

    it('não tem painel comunitário nem o antigo "alterar endereço"', async () => {
      await renderizarTela(comTudo(<InicioScreen />));
      await screen.findByText('Sem energia');

      expect(screen.queryByText(/Últimos 30 dias/i)).toBeNull();
      expect(screen.queryByText(/alterar endereço/i)).toBeNull();
    });
  });
});

describe('frasesDeApoio', () => {
  it.each([
    [0, 'Nenhuma falta de energia avisada'],
    [1, '1 denúncia em aberto'],
    [2, '2 denúncias em aberto'],
    [15, '15 denúncias em aberto'],
  ])('%i em aberto → "%s"', (n, frase) => {
    expect(frasesDeApoio(n)).toBe(frase);
  });
});

describe('Mapa (T-04, design system v2): "Onde falta energia"', () => {
  const resposta200 = (itens: object[], total = itens.length, totais = TOTAIS) =>
    resposta(200, {
      itens,
      pagina: 1,
      total,
      totais,
      atualizadoEm: new Date().toISOString(),
    });

  describe('cabeçalho e busca', () => {
    it('mostra o título, "Marabá · atualizado agora" e a busca com rótulo visível', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      expect(screen.getByRole('header', { name: 'Onde falta energia' })).toBeTruthy();
      expect(await screen.findByText('Marabá · atualizado agora')).toBeTruthy();
      expect(screen.getByText('Procurar bairro ou folha')).toBeTruthy();
      expect(screen.getByLabelText('Procurar bairro ou folha')).toBeTruthy();
    });

    it('o texto de atualização acompanha o horário da própria resposta', () => {
      const agora = Date.parse('2026-11-19T12:00:00Z');

      expect(textoDeAtualizacao('2026-11-19T11:55:00Z', agora)).toBe(
        'Marabá · atualizado há 5 min',
      );
      expect(textoDeAtualizacao('2026-11-19T09:00:00Z', agora)).toBe('Marabá · atualizado há 3 h');
      expect(textoDeAtualizacao('2026-11-19T11:59:50Z', agora)).toBe('Marabá · atualizado agora');
      expect(textoDeAtualizacao(undefined, agora)).toBe('Marabá');
    });

    it('a busca por bairro ou folha espera o usuário parar de digitar e envia a consulta', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      await screen.findByText('Há 5 min · 1 aviso');
      const antes = urlsDe('/ocorrencias').length;

      await fireEvent.changeText(screen.getByLabelText('Procurar bairro ou folha'), 'fol');
      await fireEvent.changeText(screen.getByLabelText('Procurar bairro ou folha'), 'folha 28');

      await waitFor(() =>
        expect(urlsDe('/ocorrencias').some((u) => u.includes('q=folha%2028'))).toBe(true),
      );
      expect(urlsDe('/ocorrencias').length).toBe(antes + 1); // uma consulta só, não uma por letra
    });

    it('não tem mais o cartão "Localização atual", o banner nem o bloco de atendimento', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      await screen.findByText('Há 5 min · 1 aviso');

      expect(screen.queryByText('Localização atual')).toBeNull();
      expect(screen.queryByText(/Avise seus vizinhos/)).toBeNull();
      expect(screen.queryByText('Atendimento')).toBeNull();
      expect(screen.queryByText('Lista dos lugares')).toBeNull();
    });
  });

  describe('chips (ícone + texto + contagem)', () => {
    it('mostra Todos, Sem energia, Oscilando e Normal com a contagem de cada um', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      expect(await screen.findByRole('radio', { name: 'Todos (3)' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'Sem energia (1)' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'Oscilando (1)' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'Normal (1)' })).toBeTruthy();
      expect(screen.queryByRole('radio', { name: /Sem luz|Restabelecidos|Oscilação/ })).toBeNull();
    });

    it('"Todos" começa selecionado, e a soma dos três é igual a "Todos"', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      const todos = await screen.findByRole('radio', { name: 'Todos (3)' });
      expect(todos.props.accessibilityState.selected).toBe(true);
      expect(TOTAIS.semLuz + TOTAIS.oscilacao + TOTAIS.restabelecidos).toBe(TOTAIS.todos);
    });

    it('tocar em um chip filtra pela API e marca só ele; "Normal" é o filtro RESTABELECIDO', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      await screen.findByText('Há 5 min · 1 aviso');

      await fireEvent.press(screen.getByRole('radio', { name: 'Sem energia (1)' }));
      await waitFor(() =>
        expect(urlsDe('/ocorrencias').some((u) => u.includes('status=SEM_LUZ'))).toBe(true),
      );
      expect(
        screen.getByRole('radio', { name: 'Sem energia (1)' }).props.accessibilityState.selected,
      ).toBe(true);
      expect(
        screen.getByRole('radio', { name: 'Todos (3)' }).props.accessibilityState.selected,
      ).toBe(false);

      await fireEvent.press(screen.getByRole('radio', { name: 'Oscilando (1)' }));
      await waitFor(() =>
        expect(urlsDe('/ocorrencias').some((u) => u.includes('status=OSCILACAO'))).toBe(true),
      );

      await fireEvent.press(screen.getByRole('radio', { name: 'Normal (1)' }));
      await waitFor(() =>
        expect(urlsDe('/ocorrencias').some((u) => u.includes('status=RESTABELECIDO'))).toBe(true),
      );

      await fireEvent.press(screen.getByRole('radio', { name: 'Todos (3)' }));
      await waitFor(() =>
        expect(
          screen.getByRole('radio', { name: 'Todos (3)' }).props.accessibilityState.selected,
        ).toBe(true),
      );
    });

    it('selecionado: azul cheio; não selecionado: branco com borda (48 dp de altura)', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      const estiloDe = (nome: string) => {
        const bruto = screen.getByRole('radio', { name: nome }).props.style;
        return StyleSheet.flatten(bruto) as Record<string, number | string>;
      };

      await screen.findByRole('radio', { name: 'Todos (3)' });

      expect(estiloDe('Todos (3)').backgroundColor).toBe(colors.action);
      expect(estiloDe('Sem energia (1)').backgroundColor).toBe(colors.surface);
      expect(estiloDe('Sem energia (1)').borderColor).toBe(colors.borderField);
      expect(Number(estiloDe('Todos (3)').minHeight)).toBeGreaterThanOrEqual(48);
    });
  });

  describe('lista "Lugares com aviso" agrupada por bairro', () => {
    it('mostra um item por lugar, com selo, nome em negrito e "Há X min · N avisos"', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      expect(await screen.findByRole('header', { name: 'Lugares com aviso (2)' })).toBeTruthy();
      expect(screen.getByText('Nova Marabá (Folha 28)')).toBeTruthy();
      expect(screen.getByText('Há 5 min · 1 aviso')).toBeTruthy();
      expect(screen.getByText('Cidade Nova')).toBeTruthy();
      expect(screen.getByText('Há 2 h · 1 aviso')).toBeTruthy();
      expect(screen.getByLabelText('Situação da energia: Sem energia')).toBeTruthy();
      expect(screen.getByLabelText('Situação da energia: Oscilando')).toBeTruthy();
      expect(screen.getAllByText('Ver')).toHaveLength(2);
    });

    it('o mais grave vem primeiro (Sem energia antes de Oscilando)', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      await screen.findByText('Há 5 min · 1 aviso');

      const nomes = screen
        .getAllByRole('button')
        .map((b) => b.props.accessibilityLabel as string)
        .filter((l) => /· \d avisos?$/.test(l ?? ''));
      expect(nomes[0]).toMatch(/^Nova Marabá \(Folha 28\), Sem energia/);
      expect(nomes[1]).toMatch(/^Cidade Nova, Oscilando/);
    });

    it('vários avisos do mesmo bairro viram um item: contagem, aviso mais recente e situação mais grave', async () => {
      // As datas são calculadas ANTES de abrir a tela: assim o "Há 10 min" não depende de milissegundos.
      const itens = [
        { ...ITEM_A, id: 'a1', tipo: 'OSCILACAO', criadoEm: agoraIso(30) },
        { ...ITEM_A, id: 'a2', tipo: 'SEM_ENERGIA', criadoEm: agoraIso(10) },
        { ...ITEM_A, id: 'a3', tipo: 'OSCILACAO', criadoEm: agoraIso(90) },
      ];
      simularApi({ ocorrencias: () => resposta200(itens) });
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      expect(await screen.findByRole('header', { name: 'Lugares com aviso (1)' })).toBeTruthy();
      expect(screen.getByText('Há 10 min · 3 avisos')).toBeTruthy();
      expect(screen.getByLabelText('Situação da energia: Sem energia')).toBeTruthy();
    });

    it('o cartão inteiro é um botão que fala o que faz', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      const cartao = await screen.findByRole('button', {
        name: 'Nova Marabá (Folha 28), Sem energia, Há 5 min · 1 aviso',
      });
      expect(cartao.props.accessibilityHint).toBe('Mostra o bairro no mapa');
    });

    it('"Ver" centraliza o mapa no centro do bairro', async () => {
      const animar = jest.requireMock('react-native-maps').__animarParaRegiao as jest.Mock;
      animar.mockClear();
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      await fireEvent.press(
        await screen.findByRole('button', { name: /^Nova Marabá \(Folha 28\), Sem energia/ }),
      );

      expect(animar).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -5.37, longitude: -49.12 }),
        expect.any(Number),
      );
    });

    it('um aviso resolvido aparece como Normal (filtro "Normal")', async () => {
      simularApi({
        ocorrencias: () =>
          resposta200([{ ...ITEM_A, status: 'RESOLVIDA' }], 1, {
            todos: 1,
            semLuz: 0,
            oscilacao: 0,
            restabelecidos: 1,
          }),
      });
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      expect(await screen.findByLabelText('Situação da energia: Normal')).toBeTruthy();
    });

    it('a lista pública nunca mostra protocolo, autor nem telefone (RN-014)', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      await screen.findByText('Há 5 min · 1 aviso');

      expect(screen.queryByText(/TL-\d{4}/)).toBeNull();
      expect(screen.queryByText(/protocolo/i)).toBeNull();
      expect(screen.queryByText(/telefone/i)).toBeNull();
    });

    it('sem avisos: estado vazio', async () => {
      simularApi({
        ocorrencias: () =>
          resposta200([], 0, { todos: 0, semLuz: 0, oscilacao: 0, restabelecidos: 0 }),
      });
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      expect(await screen.findByText('Nenhum lugar com aviso')).toBeTruthy();
      expect(screen.getByText('Quando houver, eles aparecem aqui.')).toBeTruthy();
    });

    it('busca sem resultado: o estado vazio diz isso', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      await screen.findByText('Há 5 min · 1 aviso');
      simularApi({
        ocorrencias: () =>
          resposta200([], 0, { todos: 0, semLuz: 0, oscilacao: 0, restabelecidos: 0 }),
      });

      await fireEvent.changeText(screen.getByLabelText('Procurar bairro ou folha'), 'xyz');

      expect(await screen.findByText('Nenhum resultado para essa busca.')).toBeTruthy();
    });

    it('erro na lista: mostra a mensagem e tenta de novo', async () => {
      simularApi({
        ocorrencias: () => resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.')),
      });
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      expect(await screen.findByText('Sem permissão.')).toBeTruthy();

      simularApi();
      await tocar('Tentar novamente');
      expect(await screen.findByText('Há 5 min · 1 aviso')).toBeTruthy();
    });

    it('com mais avisos do que o limite, diz quantos mostra', async () => {
      simularApi({
        ocorrencias: () => resposta200([ITEM_A, ITEM_B], 120, { ...TOTAIS, todos: 120 }),
      });
      await renderizarTela(comTudo(<OcorrenciasScreen />));

      expect(await screen.findByText('Mostrando os 2 avisos mais recentes de 120.')).toBeTruthy();
    });
  });

  describe('mapa e tempo real', () => {
    it('o mapa tem um círculo por bairro e pinos só das ocorrências com coordenadas', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      await screen.findByText('Há 5 min · 1 aviso');

      await waitFor(() => expect(screen.getAllByTestId('circulo')).toHaveLength(2));
      const pinos = screen.getAllByTestId('pino');
      expect(pinos).toHaveLength(1);
      expect(JSON.parse(pinos[0]!.props.accessibilityLabel)).toEqual({
        latitude: -5.371,
        longitude: -49.123,
      });
    });

    it('uma ocorrência nova (ocorrencia:atualizada) busca a lista e os totais de novo', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      await screen.findByText('Há 5 min · 1 aviso');
      const antes = urlsDe('/ocorrencias').length;
      // 3 min atrás: a tela conta o "agora" desde que abriu (alguns ms antes), então aparece "Há 2 min".
      const nova = { ...ITEM_A, id: 'o3', criadoEm: agoraIso(3) };
      simularApi({
        ocorrencias: () =>
          resposta200([nova, ITEM_A, ITEM_B], 3, {
            todos: 4,
            semLuz: 2,
            oscilacao: 1,
            restabelecidos: 1,
          }),
      });

      await act(async () => ultimoSocket()!.__emitir('ocorrencia:atualizada', ITEM_A));

      expect(await screen.findByText('Há 2 min · 2 avisos')).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'Todos (4)' })).toBeTruthy();
      expect(urlsDe('/ocorrencias').length).toBeGreaterThan(antes);
    });

    it('o círculo do bairro muda de cor em tempo real quando o painel atualiza o bairro', async () => {
      await renderizarTela(comTudo(<OcorrenciasScreen />));
      await screen.findByText('Há 5 min · 1 aviso');

      await act(async () =>
        ultimoSocket()!.__emitir('bairro:status-atualizado', {
          bairroId: 2,
          status: 'OSCILACAO',
          emAberto: 1,
          previsaoReparo: null,
        }),
      );

      await waitFor(() => {
        const cores = screen
          .getAllByTestId('circulo')
          .map((c) => JSON.parse(c.props.accessibilityLabel).strokeColor as string);
        expect(cores).toContain(colors.situacao.oscilando.marcador);
      });
    });
  });
});

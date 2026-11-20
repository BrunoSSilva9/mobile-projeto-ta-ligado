import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as Location from 'expo-location';

import OcorrenciasScreen from '@/app/(app)/(tabs)/ocorrencias';
import InicioScreen from '@/app/(app)/(tabs)/index';
import { LocalizacaoProvider } from '@/providers/LocalizacaoProvider';
import { SocketProvider } from '@/providers/SocketProvider';
import { queryClient } from '@/services/query-client';
import { useSessao } from '@/store/session';
import {
  armazenamentoEmMemoria,
  configurarCacheParaTestes,
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
  queryClient.clear();
  await useSessao.getState().entrar(SESSAO_DE_CIDADAO);
  simularApi();
  simularGps('ok');
});

describe('T-03 Início (RF-016, RF-023, RN-008)', () => {
  it('cumprimenta pelo primeiro nome e mostra o bairro, o selo e a contagem', async () => {
    await renderizarTela(comTudo(<InicioScreen />));

    expect(await screen.findByText('Olá, Maria!')).toBeTruthy();
    expect(await screen.findByText('REDE INSTÁVEL')).toBeTruthy();
    expect(screen.getByText('Nova Marabá (Folha 28)')).toBeTruthy();
    expect(screen.getByText('2 denúncias em aberto no seu bairro.')).toBeTruthy();
  });

  it('bairro normal: "Rede Estável" e nenhuma denúncia em aberto', async () => {
    simularApi({
      status: () =>
        resposta(200, {
          atualizadoEm: new Date().toISOString(),
          bairros: [OUTRO_BAIRRO, bairro({ status: 'NORMAL', emAberto: 0 })],
        }),
    });
    await renderizarTela(comTudo(<InicioScreen />));

    expect(await screen.findByText('REDE ESTÁVEL')).toBeTruthy();
    expect(screen.getByText('Nenhuma denúncia em aberto no seu bairro.')).toBeTruthy();
  });

  it.each(['SEM_LUZ', 'OSCILACAO'])('bairro com %s é "Rede Instável"', async (s) => {
    simularApi({
      status: () =>
        resposta(200, {
          atualizadoEm: new Date().toISOString(),
          bairros: [OUTRO_BAIRRO, bairro({ status: s, emAberto: 1 })],
        }),
    });
    await renderizarTela(comTudo(<InicioScreen />));

    expect(await screen.findByText('REDE INSTÁVEL')).toBeTruthy();
    expect(screen.getByText('1 denúncia em aberto no seu bairro.')).toBeTruthy();
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

  it('o selo é lido pelo leitor de tela', async () => {
    await renderizarTela(comTudo(<InicioScreen />));

    expect(await screen.findByLabelText('Situação do bairro: Rede Instável')).toBeTruthy();
  });

  it('usa o bairro mais próximo do GPS (RN-025)', async () => {
    await renderizarTela(comTudo(<InicioScreen />));
    await screen.findByText('REDE INSTÁVEL');

    expect(urlsDe('/bairros/proximo')[0]).toContain('lat=-5.371');
  });

  it('GPS negado: avisa e permite tentar de novo', async () => {
    simularGps('negada');
    await renderizarTela(comTudo(<InicioScreen />));

    expect(await screen.findByText(/Não foi possível identificar o seu bairro/)).toBeTruthy();
    expect(screen.queryByText(/REDE/)).toBeNull();

    simularGps('ok');
    await tocar('Tentar de novo');
    expect(await screen.findByText('REDE INSTÁVEL')).toBeTruthy();
  });

  it('fora de Marabá (404 do bairro próximo): explica, sem selo', async () => {
    simularApi({
      proximo: () => resposta(404, erroDaApi('NAO_ENCONTRADO', 'Nenhum bairro encontrado.')),
    });
    await renderizarTela(comTudo(<InicioScreen />));

    expect(await screen.findByText(/fora da área de Marabá/)).toBeTruthy();
    expect(screen.queryByText(/REDE/)).toBeNull();
  });

  it('erro ao carregar a situação: mostra a mensagem e tenta de novo', async () => {
    simularApi({ status: () => resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.')) });
    await renderizarTela(comTudo(<InicioScreen />));

    expect((await screen.findAllByText('Sem permissão.')).length).toBeGreaterThan(0);

    simularApi();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Tentar de novo' })[0]!);
    expect(await screen.findByText('REDE INSTÁVEL')).toBeTruthy();
  });

  it('o banner leva ao formulário de denúncia', async () => {
    await renderizarTela(comTudo(<InicioScreen />));

    expect(
      screen.getByText('Faltou energia? Denuncie agora e ajude a resolver mais rápido!'),
    ).toBeTruthy();
    await tocar('Registre sua denúncia');

    expect(mockPush).toHaveBeenCalledWith('/denunciar');
  });

  it('"Ver mapa ampliado" abre Ocorrências e o botão de perfil abre o Perfil', async () => {
    await renderizarTela(comTudo(<InicioScreen />));

    await fireEvent.press(screen.getByRole('link', { name: 'Ver mapa ampliado' }));
    expect(mockPush).toHaveBeenCalledWith('/ocorrencias');

    await tocar('Meu perfil');
    expect(mockPush).toHaveBeenCalledWith('/perfil');
  });

  it('mini-mapa: um círculo por bairro, sem pinos de ocorrência', async () => {
    await renderizarTela(comTudo(<InicioScreen />));

    await screen.findByText('REDE INSTÁVEL');
    await waitFor(() => expect(screen.getAllByTestId('circulo')).toHaveLength(2));
    expect(screen.queryByTestId('pino')).toBeNull();
  });

  it('mostra "Como funciona" em 3 passos e o atendimento com os contatos de exemplo', async () => {
    await renderizarTela(comTudo(<InicioScreen />));

    expect(screen.getByText('Notifique a queda em 2 cliques')).toBeTruthy();
    expect(screen.getByText('Mapeamos a área afetada')).toBeTruthy();
    expect(screen.getByText('Cobramos a concessionária')).toBeTruthy();
    expect(screen.getByText(/Central: Segunda a Sexta/)).toBeTruthy();
  });

  it('não tem painel comunitário nem "alterar endereço" (fora da Fase 1)', async () => {
    await renderizarTela(comTudo(<InicioScreen />));
    await screen.findByText('REDE INSTÁVEL');

    expect(screen.queryByText(/Últimos 30 dias/i)).toBeNull();
    expect(screen.queryByText(/alterar endereço/i)).toBeNull();
  });

  it('o selo e a cor mudam em tempo real quando o painel atualiza o bairro (RF-023)', async () => {
    await renderizarTela(comTudo(<InicioScreen />));
    await screen.findByText('REDE INSTÁVEL');
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

    expect(await screen.findByText('REDE ESTÁVEL')).toBeTruthy();
    expect(screen.getByText('Nenhuma denúncia em aberto no seu bairro.')).toBeTruthy();
    expect(mockFetch.mock.calls.length).toBe(chamadas); // sem nova consulta
  });
});

describe('T-04 Ocorrências (RF-019 a RF-024, RN-014)', () => {
  it('mostra o cartão "Localização atual" com o status do bairro', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    expect(await screen.findByText('Localização atual')).toBeTruthy();
    expect(await screen.findByLabelText('Situação do bairro: Sem luz')).toBeTruthy();
    expect(screen.getByText('2 denúncias em aberto no seu bairro.')).toBeTruthy();
  });

  it('lista as ocorrências: tipo, bairro, rua, descrição e há quanto tempo', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    expect(await screen.findByText('Av. VP-8')).toBeTruthy();
    expect(screen.getByText('Queda brusca de energia')).toBeTruthy();
    expect(screen.getByText('Rua 7')).toBeTruthy();
    expect(screen.getByText(/Há 5 min/)).toBeTruthy();
    expect(screen.getByText(/Há 2 h/)).toBeTruthy();
    // "SEM LUZ" também é o selo do cartão da localização; na lista é o rótulo do item.
    expect(screen.getAllByText('SEM LUZ').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('OSCILAÇÃO')).toBeTruthy();
  });

  it('a lista pública nunca mostra protocolo, autor nem telefone (RN-014)', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));
    await screen.findByText('Av. VP-8');

    expect(screen.queryByText(/TL-\d{4}/)).toBeNull();
    expect(screen.queryByText(/protocolo/i)).toBeNull();
    expect(screen.queryByText(/telefone/i)).toBeNull();
  });

  it('os chips mostram a contagem de cada situação', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    expect(await screen.findByRole('radio', { name: 'Todos (3)' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sem luz (1)' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Oscilação (1)' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Restabelecidos (1)' })).toBeTruthy();
  });

  it('o chip "Todos" começa selecionado e a soma dos três é igual a "Todos"', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    const todos = await screen.findByRole('radio', { name: 'Todos (3)' });
    expect(todos.props.accessibilityState.selected).toBe(true);
    expect(TOTAIS.semLuz + TOTAIS.oscilacao + TOTAIS.restabelecidos).toBe(TOTAIS.todos);
  });

  it('tocar em um chip filtra a lista pela API e marca o chip', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));
    await screen.findByText('Av. VP-8');

    await fireEvent.press(screen.getByRole('radio', { name: 'Sem luz (1)' }));

    await waitFor(() =>
      expect(urlsDe('/ocorrencias').some((u) => u.includes('status=SEM_LUZ'))).toBe(true),
    );
    expect(
      screen.getByRole('radio', { name: 'Sem luz (1)' }).props.accessibilityState.selected,
    ).toBe(true);
    expect(screen.getByRole('radio', { name: 'Todos (3)' }).props.accessibilityState.selected).toBe(
      false,
    );
  });

  it('cada chip pede o filtro certo e voltar a "Todos" tira o filtro', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));
    await screen.findByText('Av. VP-8');

    await fireEvent.press(screen.getByRole('radio', { name: 'Restabelecidos (1)' }));
    await waitFor(() =>
      expect(urlsDe('/ocorrencias').some((u) => u.includes('status=RESTABELECIDO'))).toBe(true),
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Oscilação (1)' }));
    await waitFor(() =>
      expect(urlsDe('/ocorrencias').some((u) => u.includes('status=OSCILACAO'))).toBe(true),
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Todos (3)' }));

    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: 'Todos (3)' }).props.accessibilityState.selected,
      ).toBe(true),
    );
  });

  it('os chips têm pelo menos 48 dp de altura (D-02)', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    const chip = await screen.findByRole('radio', { name: 'Todos (3)' });
    const estilo = Array.isArray(chip.props.style)
      ? Object.assign({}, ...chip.props.style.flat())
      : chip.props.style;
    expect(estilo.minHeight).toBeGreaterThanOrEqual(48);
  });

  it('a busca por bairro ou folha espera o usuário parar de digitar e envia a consulta', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));
    await screen.findByText('Av. VP-8');
    const antes = urlsDe('/ocorrencias').length;

    await fireEvent.changeText(screen.getByLabelText('Buscar bairro ou folha'), 'fol');
    await fireEvent.changeText(screen.getByLabelText('Buscar bairro ou folha'), 'folha 28');

    await waitFor(() =>
      expect(urlsDe('/ocorrencias').some((u) => u.includes('q=folha%2028'))).toBe(true),
    );
    // Uma consulta só, não uma por letra.
    expect(urlsDe('/ocorrencias').length).toBe(antes + 1);
  });

  it('sem ocorrências: estado vazio', async () => {
    simularApi({
      ocorrencias: () =>
        resposta(200, {
          itens: [],
          pagina: 1,
          total: 0,
          totais: { todos: 0, semLuz: 0, oscilacao: 0, restabelecidos: 0 },
          atualizadoEm: new Date().toISOString(),
        }),
    });
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    expect(await screen.findByText('Nenhuma ocorrência no momento')).toBeTruthy();
    expect(screen.getByText('Quando houver, elas aparecem aqui.')).toBeTruthy();
  });

  it('busca sem resultado: o estado vazio diz isso', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));
    await screen.findByText('Av. VP-8');
    simularApi({
      ocorrencias: () =>
        resposta(200, {
          itens: [],
          pagina: 1,
          total: 0,
          totais: { todos: 0, semLuz: 0, oscilacao: 0, restabelecidos: 0 },
          atualizadoEm: new Date().toISOString(),
        }),
    });

    await fireEvent.changeText(screen.getByLabelText('Buscar bairro ou folha'), 'xyz');

    expect(await screen.findByText('Nenhum resultado para essa busca.')).toBeTruthy();
  });

  it('erro na lista: mostra a mensagem e tenta de novo', async () => {
    simularApi({ ocorrencias: () => resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.')) });
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    expect(await screen.findByText('Sem permissão.')).toBeTruthy();

    simularApi();
    await tocar('Tentar novamente');
    expect(await screen.findByText('Av. VP-8')).toBeTruthy();
  });

  it('com mais ocorrências do que o limite, avisa quantas mostra', async () => {
    simularApi({
      ocorrencias: () =>
        resposta(200, {
          itens: [ITEM_A, ITEM_B],
          pagina: 1,
          total: 120,
          totais: { ...TOTAIS, todos: 120 },
          atualizadoEm: new Date().toISOString(),
        }),
    });
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    expect(await screen.findByText('Mostrando as 2 mais recentes de 120.')).toBeTruthy();
  });

  it('o mapa tem um círculo por bairro e pinos só das ocorrências com coordenadas', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));
    await screen.findByText('Av. VP-8');

    await waitFor(() => expect(screen.getAllByTestId('circulo')).toHaveLength(2));
    const pinos = screen.getAllByTestId('pino');
    expect(pinos).toHaveLength(1);
    expect(JSON.parse(pinos[0]!.props.accessibilityLabel)).toEqual({
      latitude: -5.371,
      longitude: -49.123,
    });
  });

  it('o círculo usa a cor do status do bairro (vermelho para sem luz, verde para normal)', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));
    await screen.findByText('Av. VP-8');

    const circulos = await screen.findAllByTestId('circulo');
    const cores = circulos.map((c) => JSON.parse(c.props.accessibilityLabel).strokeColor as string);
    expect(cores).toEqual(expect.arrayContaining(['#BA1A1A', '#34A853']));
  });

  it('o banner de denunciar leva ao formulário', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    expect(
      screen.getByText('Deu falta de energia? Avise seus vizinhos e a concessionária'),
    ).toBeTruthy();
    await tocar('Denunciar');
    expect(mockPush).toHaveBeenCalledWith('/denunciar');
  });

  it('uma ocorrência nova (ocorrencia:atualizada) busca a lista e os totais de novo', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));
    await screen.findByText('Av. VP-8');
    const antes = urlsDe('/ocorrencias').length;
    simularApi({
      ocorrencias: () =>
        resposta(200, {
          itens: [{ ...ITEM_A, id: 'o3', logradouro: 'Rua Nova, 9' }, ITEM_A, ITEM_B],
          pagina: 1,
          total: 3,
          totais: { todos: 4, semLuz: 2, oscilacao: 1, restabelecidos: 1 },
          atualizadoEm: new Date().toISOString(),
        }),
    });

    await act(async () => ultimoSocket()!.__emitir('ocorrencia:atualizada', ITEM_A));

    expect(await screen.findByText('Rua Nova, 9')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Todos (4)' })).toBeTruthy();
    expect(urlsDe('/ocorrencias').length).toBeGreaterThan(antes);
  });

  it('o cartão e o círculo mudam em tempo real quando o painel atualiza o bairro', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));
    await screen.findByLabelText('Situação do bairro: Sem luz');

    await act(async () =>
      ultimoSocket()!.__emitir('bairro:status-atualizado', {
        bairroId: 2,
        status: 'OSCILACAO',
        emAberto: 1,
        previsaoReparo: null,
      }),
    );

    expect(await screen.findByLabelText('Situação do bairro: Oscilação')).toBeTruthy();
    expect(screen.getByText('1 denúncia em aberto no seu bairro.')).toBeTruthy();
    const cores = screen
      .getAllByTestId('circulo')
      .map((c) => JSON.parse(c.props.accessibilityLabel).strokeColor as string);
    expect(cores).toContain('#CE8300');
  });

  it('tem o atendimento com contatos de exemplo', async () => {
    await renderizarTela(comTudo(<OcorrenciasScreen />));

    const atendimento = screen.getByText('Atendimento').parent!;
    expect(within(atendimento).getByText(/Ouvidoria:/)).toBeTruthy();
  });
});

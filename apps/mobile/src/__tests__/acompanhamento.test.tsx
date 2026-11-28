import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import DetalheScreen from '@/app/(app)/denuncia/[id]';
import MinhasDenunciasScreen from '@/app/(app)/minhas-denuncias';
import PerfilScreen from '@/app/(app)/(tabs)/perfil';
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
const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: 'd1' };
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    back: () => mockBack(),
    canGoBack: () => true,
    replace: jest.fn(),
  },
  useLocalSearchParams: () => mockParams,
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

const RESUMO_ABERTA = {
  id: 'd1',
  protocolo: 'TL-2026-000002',
  tipo: 'SEM_ENERGIA',
  status: 'RECEBIDA',
  bairro: 'Nova Marabá',
  folha: 'Folha 28',
  criadoEm: '2026-11-19T17:00:00.000Z',
  previsaoReparo: null,
};
const RESUMO_ANTIGA = {
  id: 'd0',
  protocolo: 'TL-2026-000001',
  tipo: 'OSCILACAO',
  status: 'RESOLVIDA',
  bairro: 'Cidade Nova',
  folha: null,
  criadoEm: '2026-11-01T17:00:00.000Z',
  previsaoReparo: null,
};

const DETALHE = {
  id: 'd1',
  protocolo: 'TL-2026-000002',
  tipo: 'SEM_ENERGIA',
  status: 'RECEBIDA',
  logradouro: 'Rua das Flores, 10',
  cep: '68500-000',
  pontoReferencia: 'perto da padaria',
  bairro: { id: 2, nome: 'Nova Marabá', folha: 'Folha 28' },
  descricao: 'sem luz desde as 14h',
  latitude: null,
  longitude: null,
  faixaPessoas: null,
  necessidadeEspecial: null,
  previsaoReparo: null,
  justificativa: null,
  fotos: [],
  historico: [
    {
      statusAnterior: null,
      statusNovo: 'RECEBIDA',
      por: 'Você',
      justificativa: null,
      criadoEm: '2026-11-19T17:00:00.000Z',
    },
  ],
  criadoEm: '2026-11-19T17:00:00.000Z',
  atualizadoEm: '2026-11-19T17:00:00.000Z',
};

type Rotas = { minhas?: () => Response; detalhe?: () => Response };
function simularApi(rotas: Rotas = {}) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/denuncias/minhas')) {
      return (
        rotas.minhas ??
        (() => resposta(200, { itens: [RESUMO_ABERTA, RESUMO_ANTIGA], pagina: 1, total: 2 }))
      )();
    }
    if (url.includes('/denuncias/d1')) return (rotas.detalhe ?? (() => resposta(200, DETALHE)))();
    throw new Error(`Chamada inesperada: ${url}`);
  });
}

const evento = (extra: Record<string, unknown> = {}) => ({
  id: 'd1',
  protocolo: 'TL-2026-000002',
  statusAnterior: 'RECEBIDA',
  status: 'EM_ATENDIMENTO',
  previsaoReparo: '2026-11-19T20:00:00.000Z',
  justificativa: null,
  alteradoEm: '2026-11-19T17:10:00.000Z',
  por: 'Equatorial Pará',
  ...extra,
});

const comTempoReal = (tela: React.ReactElement) => <SocketProvider>{tela}</SocketProvider>;

beforeAll(configurarCacheParaTestes);
beforeEach(async () => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockParams = { id: 'd1' };
  global.fetch = mockFetch as unknown as typeof fetch;
  limparSockets();
  armazenamentoEmMemoria.clear();
  queryClient.clear();
  await useSessao.getState().entrar(SESSAO_DE_CIDADAO);
  simularApi();
});

describe('T-09 Minhas denúncias (RF-013)', () => {
  it('lista as denúncias com protocolo, tipo, bairro e status', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);

    expect(await screen.findByText('TL-2026-000002')).toBeTruthy();
    expect(screen.getByText('Sem energia · Nova Marabá (Folha 28)')).toBeTruthy();
    expect(screen.getByLabelText('Status: Recebida')).toBeTruthy();
    expect(screen.getByText('TL-2026-000001')).toBeTruthy();
    expect(screen.getByText('Oscilação · Cidade Nova')).toBeTruthy();
    expect(screen.getByLabelText('Status: Resolvida')).toBeTruthy();
    expect(screen.getByText('Enviada em 19/11/2026')).toBeTruthy();
  });

  it('cada cartão é lido como uma frase só e tem pelo menos 48 dp', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);

    const cartao = await screen.findByRole('button', {
      name: 'Protocolo TL-2026-000002, Sem energia, Nova Marabá (Folha 28), Recebida',
    });
    const estilo = Array.isArray(cartao.props.style)
      ? Object.assign({}, ...cartao.props.style.flat())
      : cartao.props.style;
    expect(estilo.minHeight).toBeGreaterThanOrEqual(48);
  });

  it('o cartão mostra o selo do andamento (ícone e texto) e "Ver"', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);

    expect((await screen.findAllByLabelText('Status: Recebida')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ver').length).toBeGreaterThan(0);
    expect(screen.queryByText('RECEBIDA')).toBeNull();
  });

  it('tocar em um cartão abre o detalhe daquela denúncia (T-07)', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: /TL-2026-000001/ }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/denuncia/[id]', params: { id: 'd0' } });
  });

  it('sem denúncias: mostra o estado vazio e leva ao formulário', async () => {
    simularApi({ minhas: () => resposta(200, { itens: [], pagina: 1, total: 0 }) });
    await renderizarTela(<MinhasDenunciasScreen />);

    expect(await screen.findByText('Você ainda não fez denúncias')).toBeTruthy();
    await tocar('Fazer denúncia');
    expect(mockPush).toHaveBeenCalledWith('/denunciar');
  });

  it('erro: mostra a mensagem e permite tentar de novo', async () => {
    simularApi({ minhas: () => resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.')) });
    await renderizarTela(<MinhasDenunciasScreen />);

    expect(await screen.findByText('Sem permissão.')).toBeTruthy();

    simularApi();
    await tocar('Tentar novamente');
    expect(await screen.findByText('TL-2026-000002')).toBeTruthy();
  });

  it('o botão voltar volta', async () => {
    await renderizarTela(<MinhasDenunciasScreen />);
    await screen.findByText('TL-2026-000002');

    await tocar('Voltar');

    expect(mockBack).toHaveBeenCalled();
  });

  it('muda o status na lista quando o evento chega, sem recarregar', async () => {
    await renderizarTela(comTempoReal(<MinhasDenunciasScreen />));
    await screen.findByText('TL-2026-000002');
    const chamadas = mockFetch.mock.calls.length;

    await act(async () => ultimoSocket()!.__emitir('denuncia:status-atualizado', evento()));

    expect(await screen.findByLabelText('Status: Em atendimento')).toBeTruthy();
    expect(screen.queryByLabelText('Status: Recebida')).toBeNull();
    expect(mockFetch.mock.calls.length).toBe(chamadas);
  });

  it('mostra "Reconectando…" quando a conexão em tempo real cai', async () => {
    await renderizarTela(comTempoReal(<MinhasDenunciasScreen />));
    await screen.findByText('TL-2026-000002');
    const socket = ultimoSocket()!;
    await act(async () => socket.__emitir('connect'));

    await act(async () => socket.__emitir('disconnect'));

    expect(await screen.findByText(/Reconectando…/)).toBeTruthy();

    await act(async () => socket.__emitir('connect'));
    await waitFor(() => expect(screen.queryByText(/Reconectando…/)).toBeNull());
  });
});

describe('T-07 Detalhe da denúncia (RF-014, RF-024, RF-036)', () => {
  it('mostra status, tipo, local, descrição e histórico', async () => {
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByText('Rua das Flores, 10')).toBeTruthy();
    expect(screen.getByLabelText('Status: Recebida')).toBeTruthy();
    expect(screen.getByText('Sem energia')).toBeTruthy();
    expect(screen.getByText('Nova Marabá (Folha 28)')).toBeTruthy();
    expect(screen.getByText('CEP 68500-000')).toBeTruthy();
    expect(screen.getByText('Referência: perto da padaria')).toBeTruthy();
    expect(screen.getByText('sem luz desde as 14h')).toBeTruthy();
    expect(screen.getByText('Você · 19/11/2026 às 14:00')).toBeTruthy();
  });

  it('o título do cabeçalho é o protocolo', async () => {
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByRole('header', { name: 'TL-2026-000002' })).toBeTruthy();
  });

  it('oferece cancelar só enquanto RECEBIDA (F2-1; o fluxo completo está em cancelar-denuncia.test.tsx)', async () => {
    await renderizarTela(<DetalheScreen />);
    expect(await screen.findByRole('button', { name: 'Cancelar denúncia' })).toBeTruthy();
  });

  it('em aberto, mostra pessoas no local e a necessidade especial informada (RF-010)', async () => {
    simularApi({
      detalhe: () =>
        resposta(200, { ...DETALHE, faixaPessoas: 'DE_4_A_8', necessidadeEspecial: true }),
    });
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByText('No local')).toBeTruthy();
    expect(screen.getByText('Pessoas no local: 4 a 8 pessoas')).toBeTruthy();
    expect(screen.getByText('Necessidade especial: informada (com prioridade)')).toBeTruthy();
  });

  it('encerrada, não mostra a necessidade especial (ela foi apagada, RN-026)', async () => {
    simularApi({
      detalhe: () =>
        resposta(200, {
          ...DETALHE,
          status: 'RESOLVIDA',
          faixaPessoas: 'ATE_3',
          necessidadeEspecial: null,
        }),
    });
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByText('Pessoas no local: 1 a 3 pessoas')).toBeTruthy();
    expect(screen.queryByText(/Necessidade especial/)).toBeNull();
  });

  it('sem pessoas nem resposta, não mostra o cartão "No local"', async () => {
    await renderizarTela(<DetalheScreen />);

    await screen.findByText('Rua das Flores, 10');
    expect(screen.queryByText('No local')).toBeNull();
  });

  it('mostra as fotos, cada uma pedida à rota autenticada com o token da sessão (RNF-015)', async () => {
    simularApi({
      detalhe: () =>
        resposta(200, {
          ...DETALHE,
          fotos: [
            { id: 'f1', url: '/api/v1/denuncias/d1/fotos/f1' },
            { id: 'f2', url: '/api/v1/denuncias/d1/fotos/f2' },
          ],
        }),
    });
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByRole('header', { name: 'Fotos (2)' })).toBeTruthy();
    const primeira = screen.getByLabelText('Foto 1 de 2');
    expect(screen.getByLabelText('Foto 2 de 2')).toBeTruthy();
    expect(primeira.props.source.uri).toMatch(/\/api\/v1\/denuncias\/d1\/fotos\/f1$/);
    expect(primeira.props.source.headers).toEqual({
      Authorization: `Bearer ${SESSAO_DE_CIDADAO.token}`,
    });
  });

  it('sem fotos, não mostra o cartão de fotos', async () => {
    await renderizarTela(<DetalheScreen />);

    await screen.findByText('Rua das Flores, 10');
    expect(screen.queryByText(/^Fotos \(/)).toBeNull();
  });

  it('mostra a previsão de reparo enquanto a denúncia está em aberto', async () => {
    simularApi({
      detalhe: () =>
        resposta(200, {
          ...DETALHE,
          status: 'EM_ATENDIMENTO',
          previsaoReparo: '2026-11-19T20:00:00.000Z',
        }),
    });
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByText('19/11/2026 às 17:00')).toBeTruthy();
    expect(screen.getByText('Previsão de reparo')).toBeTruthy();
  });

  it('com a denúncia encerrada, esconde a previsão antiga', async () => {
    simularApi({
      detalhe: () =>
        resposta(200, {
          ...DETALHE,
          status: 'RESOLVIDA',
          previsaoReparo: '2026-11-19T20:00:00.000Z',
        }),
    });
    await renderizarTela(<DetalheScreen />);
    await screen.findByText('Rua das Flores, 10');

    expect(screen.queryByText('Previsão de reparo')).toBeNull();
  });

  it('os rótulos do detalhe estão em caixa normal (nada em maiúsculas)', async () => {
    simularApi({
      detalhe: () => resposta(200, { ...DETALHE, descricao: 'Sem luz desde as 14h' }),
    });
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByText('Local')).toBeTruthy();
    expect(screen.getByText('Descrição')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Histórico' })).toBeTruthy();
    for (const antigo of ['LOCAL', 'DESCRIÇÃO', 'HISTÓRICO', 'PREVISÃO DE REPARO']) {
      expect(screen.queryByText(antigo)).toBeNull();
    }
  });

  it('cada passo do histórico é lido como uma frase, com o texto do andamento', async () => {
    await renderizarTela(<DetalheScreen />);

    expect(
      await screen.findByLabelText(/^Recebida, por .*, em \d{2}\/\d{2}\/\d{4} às/),
    ).toBeTruthy();
  });

  it('improcedente mostra a justificativa da operadora', async () => {
    simularApi({
      detalhe: () =>
        resposta(200, {
          ...DETALHE,
          status: 'IMPROCEDENTE',
          justificativa: 'Não há falta de energia no local.',
        }),
    });
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByText('Justificativa da operadora')).toBeTruthy();
    expect(screen.getByText('Não há falta de energia no local.')).toBeTruthy();
  });

  it('denúncia que não é do usuário (404): "não encontrada", sem revelar nada', async () => {
    simularApi({
      detalhe: () => resposta(404, erroDaApi('NAO_ENCONTRADO', 'Denúncia não encontrada.')),
    });
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByText('Denúncia não encontrada')).toBeTruthy();
    expect(screen.queryByText('Rua das Flores, 10')).toBeNull();
  });

  it('erro de servidor: mostra a mensagem e permite tentar de novo', async () => {
    simularApi({ detalhe: () => resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.')) });
    await renderizarTela(<DetalheScreen />);

    expect(await screen.findByText('Sem permissão.')).toBeTruthy();
    simularApi();
    await tocar('Tentar novamente');
    expect(await screen.findByText('Rua das Flores, 10')).toBeTruthy();
  });

  it('com a tela aberta, a mudança feita no painel aparece sem recarregar (RF-024)', async () => {
    await renderizarTela(comTempoReal(<DetalheScreen />));
    await screen.findByText('Rua das Flores, 10');
    const chamadas = mockFetch.mock.calls.length;

    await act(async () => ultimoSocket()!.__emitir('denuncia:status-atualizado', evento()));

    expect(await screen.findByLabelText('Status: Em atendimento')).toBeTruthy();
    expect(screen.queryByLabelText('Status: Recebida')).toBeNull();
    expect(screen.getByText('Previsão de reparo')).toBeTruthy();
    expect(screen.getByText('Equatorial Pará · 19/11/2026 às 14:10')).toBeTruthy();
    expect(mockFetch.mock.calls.length).toBe(chamadas);
  });

  it('o histórico mostra a previsão definida e a removida, com ícone e texto (S-60)', async () => {
    simularApi({
      detalhe: () =>
        resposta(200, {
          ...DETALHE,
          status: 'EM_ATENDIMENTO',
          previsaoReparo: null,
          historico: [
            ...DETALHE.historico,
            {
              statusAnterior: 'RECEBIDA',
              statusNovo: 'EM_ATENDIMENTO',
              evento: 'STATUS',
              previsaoReparo: '2026-11-19T20:00:00.000Z',
              por: 'Equatorial Pará',
              justificativa: null,
              criadoEm: '2026-11-19T17:10:00.000Z',
            },
            {
              statusAnterior: 'EM_ATENDIMENTO',
              statusNovo: 'EM_ATENDIMENTO',
              evento: 'PREVISAO',
              previsaoReparo: '2026-11-19T22:00:00.000Z',
              por: 'Equatorial Pará',
              justificativa: null,
              criadoEm: '2026-11-19T18:00:00.000Z',
            },
            {
              statusAnterior: 'EM_ATENDIMENTO',
              statusNovo: 'EM_ATENDIMENTO',
              evento: 'PREVISAO',
              previsaoReparo: null,
              por: 'Equatorial Pará',
              justificativa: null,
              criadoEm: '2026-11-19T19:00:00.000Z',
            },
          ],
        }),
    });
    await renderizarTela(<DetalheScreen />);

    expect(
      await screen.findByLabelText(
        'Previsão de reparo: 19/11/2026 às 19:00, por Equatorial Pará, em 19/11/2026 às 15:00',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Previsão de reparo removida, por Equatorial Pará, em 19/11/2026 às 16:00',
      ),
    ).toBeTruthy();
    // A previsão que veio junto com "Em atendimento" aparece na própria entrada do status.
    expect(screen.getByLabelText(/^Em atendimento, por Equatorial Pará/)).toBeTruthy();
    expect(screen.getByText('Previsão de reparo: 19/11/2026 às 17:00')).toBeTruthy();
  });

  it('em tempo real: a operadora troca e remove a previsão e o histórico e o cartão acompanham, sem recarregar', async () => {
    await renderizarTela(comTempoReal(<DetalheScreen />));
    await screen.findByText('Rua das Flores, 10');
    await act(async () => ultimoSocket()!.__emitir('denuncia:status-atualizado', evento()));
    await screen.findByLabelText('Status: Em atendimento');
    const chamadas = mockFetch.mock.calls.length;

    await act(async () =>
      ultimoSocket()!.__emitir(
        'denuncia:status-atualizado',
        evento({
          statusAnterior: 'EM_ATENDIMENTO',
          status: 'EM_ATENDIMENTO',
          previsaoReparo: '2026-11-19T22:00:00.000Z',
          alteradoEm: '2026-11-19T17:20:00.000Z',
        }),
      ),
    );

    expect(await screen.findByText('19/11/2026 às 19:00')).toBeTruthy(); // cartão da previsão
    expect(
      screen.getByLabelText(/^Previsão de reparo: 19\/11\/2026 às 19:00, por Equatorial Pará/),
    ).toBeTruthy();

    await act(async () =>
      ultimoSocket()!.__emitir(
        'denuncia:status-atualizado',
        evento({
          statusAnterior: 'EM_ATENDIMENTO',
          status: 'EM_ATENDIMENTO',
          previsaoReparo: null,
          alteradoEm: '2026-11-19T17:30:00.000Z',
        }),
      ),
    );

    expect(
      await screen.findByLabelText(/^Previsão de reparo removida, por Equatorial Pará/),
    ).toBeTruthy();
    expect(screen.queryByText('Previsão de reparo')).toBeNull(); // o cartão some sem previsão
    expect(mockFetch.mock.calls.length).toBe(chamadas);
  });

  it('improcedência em tempo real mostra a justificativa na hora', async () => {
    await renderizarTela(comTempoReal(<DetalheScreen />));
    await screen.findByText('Rua das Flores, 10');

    await act(async () =>
      ultimoSocket()!.__emitir(
        'denuncia:status-atualizado',
        evento({
          status: 'IMPROCEDENTE',
          previsaoReparo: null,
          justificativa: 'Falha no padrão do imóvel.',
        }),
      ),
    );

    expect(await screen.findByLabelText('Status: Improcedente')).toBeTruthy();
    expect(screen.getAllByText('Falha no padrão do imóvel.').length).toBeGreaterThan(0);
  });

  it('evento de outra denúncia não muda esta tela', async () => {
    await renderizarTela(comTempoReal(<DetalheScreen />));
    await screen.findByText('Rua das Flores, 10');

    await act(async () =>
      ultimoSocket()!.__emitir('denuncia:status-atualizado', evento({ id: 'outra' })),
    );

    expect(screen.getByLabelText('Status: Recebida')).toBeTruthy();
  });
});

describe('T-08 Perfil: Minhas denúncias', () => {
  it('abre a lista de denúncias e mostra quantas estão em aberto', async () => {
    await renderizarTela(<PerfilScreen />);

    const item = await screen.findByRole('button', { name: 'Minhas denúncias, 1 em aberto' });
    expect(screen.getByText('1 em aberto')).toBeTruthy();

    await fireEvent.press(item);
    expect(mockPush).toHaveBeenCalledWith('/minhas-denuncias');
  });

  it('sem denúncias em aberto não mostra contador', async () => {
    simularApi({ minhas: () => resposta(200, { itens: [RESUMO_ANTIGA], pagina: 1, total: 1 }) });
    await renderizarTela(<PerfilScreen />);

    await screen.findByRole('button', { name: 'Minhas denúncias' });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(screen.queryByText(/em aberto/)).toBeNull();
  });

  it('se a lista falhar, o item continua funcionando (sem contador)', async () => {
    simularApi({ minhas: () => resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.')) });
    await renderizarTela(<PerfilScreen />);

    expect(await screen.findByRole('button', { name: 'Minhas denúncias' })).toBeTruthy();
    expect(screen.queryByText(/em aberto/)).toBeNull();
  });
});

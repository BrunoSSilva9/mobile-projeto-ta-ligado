import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import DetalheScreen from '@/app/(app)/denuncia/[id]';
import { PERGUNTA_DE_CANCELAMENTO } from '@/components/CancelarDenuncia';
import { CHAVE_MINHAS } from '@/features/acompanhamento/cache';
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

const mockFetch = jest.fn();
const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

const CRIADA_EM = '2026-11-19T17:00:00.000Z';
const CANCELADA_EM = '2026-11-19T17:05:00.000Z';

const DETALHE = {
  id: 'd1',
  protocolo: 'TL-2026-000002',
  tipo: 'SEM_ENERGIA',
  status: 'RECEBIDA',
  logradouro: 'Rua das Flores, 10',
  cep: null,
  pontoReferencia: null,
  bairro: { id: 2, nome: 'Nova Marabá', folha: 'Folha 28' },
  descricao: null,
  latitude: null,
  longitude: null,
  previsaoReparo: null,
  justificativa: null,
  fotos: [],
  historico: [{ statusAnterior: null, statusNovo: 'RECEBIDA', por: 'Você', criadoEm: CRIADA_EM }],
  criadoEm: CRIADA_EM,
  atualizadoEm: CRIADA_EM,
};

const CANCELADA = {
  ...DETALHE,
  status: 'CANCELADA',
  historico: [
    ...DETALHE.historico,
    { statusAnterior: 'RECEBIDA', statusNovo: 'CANCELADA', por: 'Você', criadoEm: CANCELADA_EM },
  ],
  atualizadoEm: CANCELADA_EM,
};

type Rotas = { detalhe?: () => Response; cancelar?: () => Response | Promise<Response> };

function simularApi(rotas: Rotas = {}) {
  mockFetch.mockImplementation(async (url: string, init?: { method?: string }) => {
    if (url.endsWith('/denuncias/d1/cancelar') && init?.method === 'POST') {
      return (rotas.cancelar ?? (() => resposta(200, CANCELADA)))();
    }
    if (url.endsWith('/denuncias/d1')) return (rotas.detalhe ?? (() => resposta(200, DETALHE)))();
    throw new Error(`Chamada inesperada: ${url}`);
  });
}

const chamadasDeCancelar = () =>
  mockFetch.mock.calls.filter(([url]) => String(url).endsWith('/cancelar'));

async function abrirConfirmacao() {
  await renderizarTela(<DetalheScreen />);
  await tocar(await nomeDoBotao('Cancelar denúncia'));
}

/** Espera o botão aparecer e devolve o nome (para o `tocar`). */
async function nomeDoBotao(nome: string) {
  await screen.findByRole('button', { name: nome });
  return nome;
}

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
});

describe('T-07 Cancelar denúncia (RF-015, RN-005, S-55)', () => {
  it('em RECEBIDA, mostra "Cancelar denúncia" como botão secundário com texto', async () => {
    await renderizarTela(<DetalheScreen />);

    const botao = await screen.findByRole('button', { name: 'Cancelar denúncia' });
    expect(botao).toBeTruthy();
    expect(screen.getByText('Cancelar denúncia')).toBeTruthy();
  });

  it.each(['EM_ATENDIMENTO', 'RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'])(
    'em %s, o botão não aparece',
    async (status) => {
      simularApi({
        detalhe: () => resposta(200, { ...DETALHE, status, justificativa: 'Sem falta de luz.' }),
      });
      await renderizarTela(<DetalheScreen />);

      await screen.findByText('Rua das Flores, 10');
      expect(screen.queryByRole('button', { name: 'Cancelar denúncia' })).toBeNull();
    },
  );

  it('o primeiro toque só abre a confirmação (com a pergunta anunciada) e não chama a API', async () => {
    await abrirConfirmacao();

    expect(screen.getByText(PERGUNTA_DE_CANCELAMENTO)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sim, cancelar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Não, voltar' })).toBeTruthy();
    expect(anunciar).toHaveBeenCalledWith(PERGUNTA_DE_CANCELAMENTO);
    expect(chamadasDeCancelar()).toHaveLength(0);
  });

  it('"Não, voltar" fecha a confirmação sem cancelar', async () => {
    await abrirConfirmacao();

    await tocar('Não, voltar');

    expect(screen.queryByText(PERGUNTA_DE_CANCELAMENTO)).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar denúncia' })).toBeTruthy();
    expect(chamadasDeCancelar()).toHaveLength(0);
  });

  it('"Sim, cancelar" chama a API uma vez, mostra "Cancelada" e o histórico novo, e some o botão', async () => {
    await abrirConfirmacao();

    await tocar('Sim, cancelar');

    expect(await screen.findByText(/Denúncia cancelada\./)).toBeTruthy();
    expect(screen.getByLabelText('Status: Cancelada')).toBeTruthy();
    expect(screen.getByLabelText(/^Cancelada, por Você, em/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar denúncia' })).toBeNull();
    expect(chamadasDeCancelar()).toHaveLength(1);
    expect(chamadasDeCancelar()[0]![1]).toMatchObject({ method: 'POST' });
    expect(anunciar).toHaveBeenLastCalledWith('Denúncia cancelada.');
  });

  it('enquanto cancela, o botão fica ocupado e um segundo toque não repete o pedido', async () => {
    let concluir: (r: Response) => void = () => undefined;
    simularApi({ cancelar: () => new Promise<Response>((r) => (concluir = r)) });
    await abrirConfirmacao();

    await tocar('Sim, cancelar');
    // Sob carga, o estado "ocupado" pode levar um instante para aparecer.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Sim, cancelar' }).props.accessibilityState,
      ).toMatchObject({ busy: true }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, cancelar' }));

    concluir(resposta(200, CANCELADA));
    expect(await screen.findByText(/Denúncia cancelada\./)).toBeTruthy();
    expect(chamadasDeCancelar()).toHaveLength(1);
  });

  it('também atualiza o item em "Minhas denúncias" no cache', async () => {
    // Dado colocado à mão: sem gcTime 0, senão some na hora (e Infinity não cria temporizador).
    queryClient.setQueryDefaults(CHAVE_MINHAS, { gcTime: Infinity });
    queryClient.setQueryData(CHAVE_MINHAS, {
      itens: [{ id: 'd1', protocolo: 'TL-2026-000002', status: 'RECEBIDA' }],
      pagina: 1,
      total: 1,
    });
    await abrirConfirmacao();

    await tocar('Sim, cancelar');
    await screen.findByText(/Denúncia cancelada\./);

    expect(
      queryClient.getQueryData<{ itens: { status: string }[] }>(CHAVE_MINHAS)!.itens[0]!.status,
    ).toBe('CANCELADA');
    queryClient.setQueryDefaults(CHAVE_MINHAS, { gcTime: 0 });
  });

  it('422 (a operadora já começou): explica, busca o detalhe de novo e mostra o status real', async () => {
    let detalheAtual = DETALHE;
    simularApi({
      detalhe: () => resposta(200, detalheAtual),
      cancelar: () => {
        detalheAtual = { ...DETALHE, status: 'EM_ATENDIMENTO' };
        return resposta(
          422,
          erroDaApi('TRANSICAO_INVALIDA', 'Esta denúncia não pode mais ser cancelada.'),
        );
      },
    });
    await abrirConfirmacao();

    await tocar('Sim, cancelar');

    expect(await screen.findByLabelText('Status: Em atendimento')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar denúncia' })).toBeNull();
    expect(chamadasDeCancelar()).toHaveLength(1);
  });

  it('sem internet: mostra o erro, continua RECEBIDA e permite tentar de novo', async () => {
    let falhar = true;
    simularApi({
      cancelar: () => {
        if (falhar) throw new TypeError('Network request failed');
        return resposta(200, CANCELADA);
      },
    });
    await abrirConfirmacao();

    await tocar('Sim, cancelar');

    expect(await screen.findByText(/Sem conexão/)).toBeTruthy();
    expect(screen.getByLabelText('Status: Recebida')).toBeTruthy();

    falhar = false;
    await tocar('Cancelar denúncia');
    expect(screen.queryByText(/Sem conexão/)).toBeNull(); // o erro antigo some ao tentar de novo
    await tocar('Sim, cancelar');
    expect(await screen.findByText(/Denúncia cancelada\./)).toBeTruthy();
  });

  it('o evento do próprio cancelamento, chegando depois, não duplica o histórico', async () => {
    await renderizarTela(
      <SocketProvider>
        <DetalheScreen />
      </SocketProvider>,
    );
    await tocar(await nomeDoBotao('Cancelar denúncia'));
    await tocar('Sim, cancelar');
    await screen.findByText(/Denúncia cancelada\./);

    await act(async () =>
      ultimoSocket()!.__emitir('denuncia:status-atualizado', {
        id: 'd1',
        protocolo: 'TL-2026-000002',
        statusAnterior: 'RECEBIDA',
        status: 'CANCELADA',
        previsaoReparo: null,
        justificativa: null,
        alteradoEm: CANCELADA_EM,
        por: 'Você',
      }),
    );

    await waitFor(() => expect(screen.getAllByLabelText(/^Cancelada, por Você/)).toHaveLength(1));
  });
});

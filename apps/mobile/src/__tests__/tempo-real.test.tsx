import { act, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import type {
  DenunciaDetalhe,
  EventoDeStatus,
  MinhasDenuncias,
} from '@/features/acompanhamento/api';
import { CHAVE_MINHAS, chaveDoDetalhe } from '@/features/acompanhamento/cache';
import { SocketProvider, useEstadoDaConexao } from '@/providers/SocketProvider';
import { queryClient } from '@/services/query-client';
import { useSessao } from '@/store/session';
import { armazenamentoEmMemoria, renderizarTela, SESSAO_DE_CIDADAO } from '@/testing/ajudas';
import { limparSockets, socketsCriados, ultimoSocket } from '@/testing/socket';

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

const evento: EventoDeStatus = {
  id: 'd1',
  protocolo: 'TL-2026-000001',
  statusAnterior: 'RECEBIDA',
  status: 'EM_ATENDIMENTO',
  previsaoReparo: null,
  justificativa: null,
  alteradoEm: '2026-11-19T12:10:00.000Z',
  por: 'Equatorial Pará',
};

const detalhe = {
  id: 'd1',
  status: 'RECEBIDA',
  atualizadoEm: '2026-11-19T12:00:00.000Z',
  historico: [],
} as unknown as DenunciaDetalhe;

function Estado() {
  return <Text>{`conexão:${useEstadoDaConexao()}`}</Text>;
}

const abrir = () =>
  renderizarTela(
    <SocketProvider>
      <Estado />
    </SocketProvider>,
  );

// Aqui o cache é preenchido à mão, sem telas observando: com `gcTime: 0` os dados sumiriam na hora.
// `Infinity` também não cria temporizador de coleta, então o Jest encerra normalmente.
beforeAll(() => {
  const padrao = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({ ...padrao, queries: { ...padrao.queries, gcTime: Infinity } });
});
beforeEach(async () => {
  limparSockets();
  armazenamentoEmMemoria.clear();
  queryClient.clear();
  await useSessao.getState().entrar(SESSAO_DE_CIDADAO);
});

describe('SocketProvider (RF-024, RNF-009)', () => {
  it('conecta com o token da sessão, só por WebSocket', async () => {
    await abrir();

    expect(socketsCriados()).toHaveLength(1);
    expect(ultimoSocket()!.opcoes.auth).toEqual({ token: SESSAO_DE_CIDADAO.token });
    expect(ultimoSocket()!.opcoes.transports).toEqual(['websocket']);
  });

  it('sem sessão não abre conexão', async () => {
    await act(async () => {
      await useSessao.getState().sair();
    });

    await abrir();

    expect(socketsCriados()).toHaveLength(0);
  });

  it('o evento de status atualiza o detalhe e a lista em cache, sem recarregar', async () => {
    queryClient.setQueryData(chaveDoDetalhe('d1'), detalhe);
    queryClient.setQueryData([...CHAVE_MINHAS], {
      pagina: 1,
      total: 1,
      itens: [{ id: 'd1', status: 'RECEBIDA', previsaoReparo: null }],
    } as unknown as MinhasDenuncias);
    await abrir();

    await act(async () => ultimoSocket()!.__emitir('denuncia:status-atualizado', evento));

    expect(queryClient.getQueryData<DenunciaDetalhe>(chaveDoDetalhe('d1'))?.status).toBe(
      'EM_ATENDIMENTO',
    );
    expect(queryClient.getQueryData<MinhasDenuncias>([...CHAVE_MINHAS])?.itens[0]?.status).toBe(
      'EM_ATENDIMENTO',
    );
  });

  it('evento malformado é ignorado sem quebrar', async () => {
    queryClient.setQueryData(chaveDoDetalhe('d1'), detalhe);
    await abrir();

    await act(async () => ultimoSocket()!.__emitir('denuncia:status-atualizado', { lixo: true }));

    expect(queryClient.getQueryData<DenunciaDetalhe>(chaveDoDetalhe('d1'))?.status).toBe(
      'RECEBIDA',
    );
  });

  it('a primeira conexão não refaz consultas; a reconexão refaz (RNF-009)', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    await abrir();
    const socket = ultimoSocket()!;

    await act(async () => socket.__emitir('connect'));
    expect(invalidar).not.toHaveBeenCalled();
    expect(await screen.findByText('conexão:conectado')).toBeTruthy();

    await act(async () => socket.__emitir('disconnect'));
    expect(await screen.findByText('conexão:reconectando')).toBeTruthy();

    await act(async () => socket.__emitir('connect'));
    expect(invalidar).toHaveBeenCalledWith({ queryKey: CHAVE_MINHAS });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['denuncia'] });
    expect(await screen.findByText('conexão:conectado')).toBeTruthy();
    invalidar.mockRestore();
  });

  it('antes da primeira conexão, uma falha não mostra "reconectando"', async () => {
    await abrir();

    await act(async () => ultimoSocket()!.__emitir('connect_error', new Error('timeout')));

    expect(screen.getByText('conexão:conectando')).toBeTruthy();
  });

  it('token recusado pelo servidor: encerra a sessão e para de tentar', async () => {
    await abrir();
    const socket = ultimoSocket()!;

    await act(async () => socket.__emitir('connect_error', new Error('NAO_AUTENTICADO')));

    await waitFor(() => expect(useSessao.getState().token).toBeNull());
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('ao sair da conta a conexão é encerrada', async () => {
    const { unmount } = await abrir();
    const socket = ultimoSocket()!;

    await unmount();

    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('se o token mudar (outra conta), abre uma conexão nova e fecha a antiga', async () => {
    await abrir();
    const antigo = ultimoSocket()!;

    await act(async () => {
      await useSessao.getState().entrar({ ...SESSAO_DE_CIDADAO, token: 'outro.token' });
    });

    expect(antigo.disconnect).toHaveBeenCalled();
    expect(socketsCriados()).toHaveLength(2);
    expect(ultimoSocket()!.opcoes.auth.token).toBe('outro.token');
  });
});

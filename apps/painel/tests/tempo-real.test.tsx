import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TEMPO_DO_ALERTA_MS, TEMPO_DO_DESTAQUE_MS } from '../src/providers/TempoRealProvider';
import { queryClient } from '../src/services/api';
import { useSessao } from '../src/store/sessao';
import {
  DENUNCIA_A,
  DENUNCIA_B,
  limparTudo,
  renderizar,
  resposta,
  SESSAO_DE_OPERADOR,
  simularApi,
  urlsDeDenuncias,
} from './ajudas';
import { emitir, limparSockets, socketsCriados, ultimoSocket } from './socket';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const eventoCriada = (extra: Record<string, unknown> = {}) => ({
  id: 'nova',
  protocolo: 'TL-2026-000099',
  prioritaria: false,
  tipo: 'SEM_ENERGIA',
  status: 'RECEBIDA',
  bairro: { id: 1, nome: 'Cidade Nova', folha: null },
  logradouro: 'Av. VP-3',
  descricao: 'Estalo forte no poste',
  latitude: -5.35,
  longitude: -49.1,
  autor: { id: 'u1', nome: 'Maria Silva', telefone: '(94) 90000-0000' },
  criadoEm: new Date().toISOString(),
  ...extra,
});

const tons = vi.fn();
class AudioContextFalso {
  state = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn();
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: (x: unknown) => x,
    };
  }
  createOscillator() {
    return {
      type: '',
      frequency: { value: 0 },
      connect: (x: unknown) => x,
      start: () => tons(),
      stop: vi.fn(),
    };
  }
}
const contextosCriados = vi.fn();

beforeEach(async () => {
  limparTudo();
  await limparSockets();
  tons.mockClear();
  contextosCriados.mockClear();
  vi.stubGlobal(
    'AudioContext',
    class extends AudioContextFalso {
      constructor() {
        super();
        contextosCriados();
      }
    },
  );
  useSessao.getState().entrar(SESSAO_DE_OPERADOR);
});
afterEach(() => {
  vi.useRealTimers();
  limparTudo();
});

const abrirPainel = async () => {
  const f = simularApi();
  renderizar('/');
  await screen.findByRole('table');
  return f;
};

describe('Conexão em tempo real (RF-027)', () => {
  it('conecta com o token do operador, só por WebSocket', async () => {
    await abrirPainel();

    expect(await socketsCriados()).toHaveLength(1);
    const s = (await ultimoSocket())!;
    expect(s.opcoes.auth).toEqual({ token: SESSAO_DE_OPERADOR.token });
    expect(s.opcoes.transports).toEqual(['websocket']);
  });

  it('o indicador mostra Conectando → Conectado → Reconectando → Conectado', async () => {
    await abrirPainel();
    const indicador = () => screen.getByRole('status', { name: /Conexão em tempo real/ });
    expect(indicador()).toHaveTextContent('Conectando…');

    await emitir('connect');
    expect(indicador()).toHaveTextContent('Conectado');

    await emitir('disconnect');
    expect(indicador()).toHaveTextContent('Reconectando…');

    await emitir('connect');
    expect(indicador()).toHaveTextContent('Conectado');
  });

  it('ao reconectar, refaz as consultas (a primeira conexão não)', async () => {
    const f = await abrirPainel();
    await emitir('connect');
    const antes = urlsDeDenuncias(f).length;

    await emitir('disconnect');
    await emitir('connect');

    await waitFor(() => expect(urlsDeDenuncias(f).length).toBe(antes + 1));
  });

  it('antes da primeira conexão, uma falha não mostra "Reconectando"', async () => {
    await abrirPainel();

    await emitir('connect_error', new Error('timeout'));

    expect(screen.getByRole('status', { name: /Conexão em tempo real/ })).toHaveTextContent(
      'Conectando…',
    );
  });

  it('token recusado pelo servidor: derruba a sessão e volta ao login', async () => {
    await abrirPainel();

    await emitir('connect_error', new Error('NAO_AUTENTICADO'));

    expect(await screen.findByRole('heading', { name: 'Entre no painel' })).toBeInTheDocument();
    expect(useSessao.getState().token).toBeNull();
    expect((await ultimoSocket())!.disconnect).toHaveBeenCalled();
  });

  it('sair da conta encerra a conexão', async () => {
    await abrirPainel();
    const socket = (await ultimoSocket())!;

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    await screen.findByRole('heading', { name: 'Entre no painel' });
    expect(socket.disconnect).toHaveBeenCalled();
  });
});

describe('Nova denúncia: alerta visual (RF-027)', () => {
  it('entra na lista sem recarregar, com destaque e selo "Nova"', async () => {
    const f = await abrirPainel();
    const chamadas = f.mock.calls.length;

    await emitir('denuncia:criada', eventoCriada());

    const linha = (await screen.findByText('TL-2026-000099')).closest('tr')!;
    expect(linha).toHaveClass('tabela__nova');
    expect(within(linha).getByText('Nova')).toBeInTheDocument();
    expect(within(linha).getByText('Cidade Nova')).toBeInTheDocument();
    expect(screen.getByText('3 denúncias')).toBeInTheDocument();
    expect(f.mock.calls.length).toBe(chamadas); // sem nova consulta
  });

  it('mostra o alerta com tipo e bairro, em uma região aria-live, com link para abrir', async () => {
    await abrirPainel();
    const regiao = screen.getByRole('status', { name: 'Alertas de novas denúncias' });
    expect(regiao).toHaveAttribute('aria-live', 'polite');
    expect(regiao).toBeEmptyDOMElement();

    await emitir('denuncia:criada', eventoCriada());

    expect(
      within(regiao).getByText(/Nova denúncia: Sem energia em Cidade Nova/),
    ).toBeInTheDocument();
    expect(within(regiao).getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      '/denuncias/nova',
    );
  });

  it('"Dispensar" tira o alerta, mas a linha continua na lista', async () => {
    await abrirPainel();
    await emitir('denuncia:criada', eventoCriada());

    fireEvent.click(await screen.findByRole('button', { name: 'Dispensar alerta TL-2026-000099' }));

    expect(screen.queryByText(/Nova denúncia: Sem energia/)).toBeNull();
    expect(screen.getByText('TL-2026-000099')).toBeInTheDocument();
  });

  it('o alerta e o destaque somem sozinhos depois de alguns segundos', async () => {
    await abrirPainel();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await emitir('denuncia:criada', eventoCriada());
    expect(screen.getByText(/Nova denúncia: Sem energia/)).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(TEMPO_DO_DESTAQUE_MS + 100));
    expect(screen.getByText('TL-2026-000099').closest('tr')).not.toHaveClass('tabela__nova');
    expect(screen.getByText(/Nova denúncia: Sem energia/)).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(TEMPO_DO_ALERTA_MS));
    expect(screen.queryByText(/Nova denúncia: Sem energia/)).toBeNull();
  });

  it('o mesmo evento duas vezes não duplica linha nem alerta', async () => {
    await abrirPainel();

    await emitir('denuncia:criada', eventoCriada());
    await emitir('denuncia:criada', eventoCriada());

    expect(screen.getAllByText('TL-2026-000099')).toHaveLength(1);
    expect(screen.getAllByText(/Nova denúncia: Sem energia/)).toHaveLength(1);
  });

  it('a prioritária entra depois das outras prioritárias, a normal no fim (RN-015)', async () => {
    await abrirPainel();

    await emitir(
      'denuncia:criada',
      eventoCriada({ id: 'p', protocolo: 'TL-P', prioritaria: true }),
    );
    await emitir('denuncia:criada', eventoCriada({ id: 'n', protocolo: 'TL-N' }));

    const protocolos = within(screen.getByRole('table'))
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[1]!.textContent);
    expect(protocolos).toEqual(['TL-2026-000002', 'TL-P', 'TL-2026-000001', 'TL-N']);
  });

  it('não entra em uma lista cujo filtro não combina (ex.: só oscilação)', async () => {
    simularApi({
      denuncias: (url) =>
        resposta(200, {
          itens: url.includes('tipo=OSCILACAO') ? [DENUNCIA_B] : [DENUNCIA_A, DENUNCIA_B],
          pagina: 1,
          total: url.includes('tipo=OSCILACAO') ? 1 : 2,
        }),
    });
    renderizar('/');
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'OSCILACAO' } });
    await waitFor(() => expect(screen.queryByText('TL-2026-000002')).toBeNull());

    await emitir('denuncia:criada', eventoCriada());

    expect(screen.queryByText('TL-2026-000099')).toBeNull();
    // Mesmo assim o operador é avisado: o alerta não depende do filtro.
    expect(screen.getByText(/Nova denúncia: Sem energia/)).toBeInTheDocument();
  });

  it('evento malformado é ignorado sem quebrar', async () => {
    await abrirPainel();

    await emitir('denuncia:criada', { lixo: true });

    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(
      screen.getByRole('status', { name: 'Alertas de novas denúncias' }),
    ).toBeEmptyDOMElement();
  });

  it('a denúncia nova aparece também no mapa', async () => {
    await abrirPainel();
    fireEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
    await screen.findByRole('region', { name: 'Mapa das denúncias' });
    expect(screen.getByText('1 denúncia sem coordenadas aparece só na lista.')).toBeInTheDocument();

    await emitir('denuncia:criada', eventoCriada({ latitude: null, longitude: null }));

    expect(
      await screen.findByText('2 denúncias sem coordenadas aparecem só na lista.'),
    ).toBeInTheDocument();
  });
});

describe('Nova denúncia: alerta sonoro (S-19)', () => {
  it('antes do clique em "Ativar som", nenhum áudio é criado nem tocado', async () => {
    await abrirPainel();

    await emitir('denuncia:criada', eventoCriada());

    expect(contextosCriados).not.toHaveBeenCalled();
    expect(tons).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Ativar som' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('o clique ativa o som (e confirma com um toque); a denúncia seguinte toca de novo', async () => {
    await abrirPainel();

    fireEvent.click(screen.getByRole('button', { name: 'Ativar som' }));
    expect(contextosCriados).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Som ativado' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const aposAtivar = tons.mock.calls.length;
    expect(aposAtivar).toBe(2);

    await emitir('denuncia:criada', eventoCriada());

    expect(tons.mock.calls.length).toBe(aposAtivar + 2);
  });

  it('desativar o som silencia os próximos alertas e reativar reaproveita o áudio', async () => {
    await abrirPainel();
    fireEvent.click(screen.getByRole('button', { name: 'Ativar som' }));
    fireEvent.click(screen.getByRole('button', { name: 'Som ativado' }));
    const aposDesativar = tons.mock.calls.length;

    await emitir('denuncia:criada', eventoCriada());
    expect(tons.mock.calls.length).toBe(aposDesativar);

    fireEvent.click(screen.getByRole('button', { name: 'Ativar som' }));
    expect(contextosCriados).toHaveBeenCalledTimes(1);
  });

  it('navegador sem suporte a áudio: o botão não liga e o alerta visual continua', async () => {
    vi.stubGlobal('AudioContext', undefined);
    await abrirPainel();

    fireEvent.click(screen.getByRole('button', { name: 'Ativar som' }));
    await emitir('denuncia:criada', eventoCriada());

    expect(screen.getByRole('button', { name: 'Ativar som' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText(/Nova denúncia: Sem energia/)).toBeInTheDocument();
  });
});

describe('Mudança de status em tempo real', () => {
  it('sai da lista "Em aberto" quando a denúncia é resolvida (sem recarregar)', async () => {
    const f = await abrirPainel();
    const chamadas = urlsDeDenuncias(f).length;

    await emitir('denuncia:status-atualizado', {
      id: DENUNCIA_A.id,
      status: 'RESOLVIDA',
      previsaoReparo: null,
    });

    await waitFor(() => expect(screen.queryByText('TL-2026-000002')).toBeNull());
    expect(await screen.findByText('1 denúncia')).toBeInTheDocument();
    expect(urlsDeDenuncias(f).length).toBe(chamadas);
  });

  it('atualiza o status na lista quando continua em aberto', async () => {
    await abrirPainel();

    await emitir('denuncia:status-atualizado', {
      id: DENUNCIA_A.id,
      status: 'EM_ATENDIMENTO',
      previsaoReparo: null,
    });

    await waitFor(() =>
      expect(
        within(screen.getByText('TL-2026-000002').closest('tr')!).getByText('Em atendimento'),
      ).toBeInTheDocument(),
    );
  });

  it('a lista atual fica sem refetch, mas o detalhe em cache é invalidado', async () => {
    await abrirPainel();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await emitir('denuncia:status-atualizado', {
      id: DENUNCIA_A.id,
      status: 'EM_ATENDIMENTO',
      previsaoReparo: null,
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['painel-denuncia', DENUNCIA_A.id] });
    spy.mockRestore();
  });

  it('evento de status malformado é ignorado', async () => {
    await abrirPainel();

    await emitir('denuncia:status-atualizado', { id: 'x' });

    expect(screen.getAllByRole('row')).toHaveLength(3);
  });
});

describe('Falha de resposta da API durante o tempo real', () => {
  it('a resposta da lista não depende do socket (sem socket aberto ainda mostra a lista)', async () => {
    simularApi({ denuncias: () => resposta(200, { itens: [DENUNCIA_A], pagina: 1, total: 1 }) });
    renderizar('/');

    expect(await screen.findByText('TL-2026-000002')).toBeInTheDocument();
  });
});

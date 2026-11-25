import { QueryClient } from '@tanstack/react-query';

import { tempoDesde } from '@/features/acompanhamento/formatacao';
import { listarOcorrencias, listarStatusDosBairros, LIMITE_DA_LISTA } from './api';
import {
  aplicarStatusDoBairro,
  atualizarListaDeOcorrencias,
  CHAVE_OCORRENCIAS,
  CHAVE_STATUS_DOS_BAIRROS,
  eventoDoBairroValido,
  refazerConsultasPublicas,
} from './cache';
import { CHIPS, redeEstavel, type StatusDosBairros } from './tipos';

const mockGet = jest.fn();
jest.mock('@/services/api', () => ({ http: { get: (...a: unknown[]) => mockGet(...a) } }));

beforeEach(() => mockGet.mockReset());

const status = (): StatusDosBairros => ({
  atualizadoEm: '2026-11-19T15:00:00.000Z',
  bairros: [
    {
      bairroId: 1,
      nome: 'Cidade Nova',
      folha: null,
      latitude: -5.35,
      longitude: -49.1,
      status: 'NORMAL',
      emAberto: 0,
      previsaoReparo: null,
    },
    {
      bairroId: 2,
      nome: 'Nova Marabá',
      folha: 'Folha 28',
      latitude: -5.37,
      longitude: -49.12,
      status: 'SEM_LUZ',
      emAberto: 2,
      previsaoReparo: null,
    },
  ],
});

describe('tipos (RN-008, chips)', () => {
  it('rede estável só quando o bairro está normal (S-02)', () => {
    expect(redeEstavel('NORMAL')).toBe(true);
    expect(redeEstavel('OSCILACAO')).toBe(false);
    expect(redeEstavel('SEM_LUZ')).toBe(false);
  });

  it('os quatro chips da aba Mapa, na ordem, cada um com ícone', () => {
    expect(CHIPS.map((c) => c.rotulo)).toEqual(['Todos', 'Sem energia', 'Oscilando', 'Normal']);
    expect(CHIPS.map((c) => c.valor)).toEqual([undefined, 'SEM_LUZ', 'OSCILACAO', 'RESTABELECIDO']);
    expect(CHIPS.map((c) => c.icone)).toEqual(['list', 'flash-off', 'pulse', 'checkmark-circle']);
  });
});

describe('chamadas à API', () => {
  it('status dos bairros', async () => {
    mockGet.mockResolvedValue(status());
    expect(await listarStatusDosBairros()).toEqual(status());
    expect(mockGet).toHaveBeenCalledWith('/bairros/status');
  });

  it('ocorrências: envia o chip, a busca aparada e o limite', async () => {
    mockGet.mockResolvedValue({});
    await listarOcorrencias({ status: 'SEM_LUZ', q: '  folha 28 ' });
    expect(mockGet).toHaveBeenCalledWith('/ocorrencias', {
      status: 'SEM_LUZ',
      q: 'folha 28',
      limite: LIMITE_DA_LISTA,
    });
  });

  it('"Todos" e busca vazia não enviam filtros', async () => {
    mockGet.mockResolvedValue({});
    await listarOcorrencias({ status: undefined, q: '   ' });
    expect(mockGet).toHaveBeenCalledWith('/ocorrencias', {
      status: undefined,
      q: undefined,
      limite: LIMITE_DA_LISTA,
    });
  });
});

describe('cache em tempo real (RF-023, RF-024)', () => {
  const novoCache = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    qc.setQueryData([...CHAVE_STATUS_DOS_BAIRROS], status());
    return qc;
  };

  it('bairro:status-atualizado substitui status, contagem e previsão, mantendo o local', () => {
    const qc = novoCache();

    const evento = eventoDoBairroValido({
      bairroId: 1,
      nome: 'Cidade Nova',
      folha: null,
      status: 'OSCILACAO',
      emAberto: 3,
      previsaoReparo: '2026-11-20T10:00:00Z',
    })!;
    expect(aplicarStatusDoBairro(qc, evento)).toBe(true);

    const [a, b] = qc.getQueryData<StatusDosBairros>([...CHAVE_STATUS_DOS_BAIRROS])!.bairros;
    expect(a).toMatchObject({
      status: 'OSCILACAO',
      emAberto: 3,
      previsaoReparo: '2026-11-20T10:00:00Z',
      latitude: -5.35,
      longitude: -49.1,
    });
    expect(b!.status).toBe('SEM_LUZ'); // o outro bairro não muda
  });

  it('o bairro voltando a normal limpa a previsão', () => {
    const qc = novoCache();
    aplicarStatusDoBairro(
      qc,
      eventoDoBairroValido({ bairroId: 2, status: 'NORMAL', emAberto: 0, previsaoReparo: null })!,
    );

    expect(
      qc.getQueryData<StatusDosBairros>([...CHAVE_STATUS_DOS_BAIRROS])!.bairros[1],
    ).toMatchObject({
      status: 'NORMAL',
      emAberto: 0,
      previsaoReparo: null,
    });
  });

  it('bairro que não está no cache: nada muda e devolve false', () => {
    const qc = novoCache();
    expect(
      aplicarStatusDoBairro(
        qc,
        eventoDoBairroValido({ bairroId: 99, status: 'NORMAL', emAberto: 0 })!,
      ),
    ).toBe(false);
    expect(
      aplicarStatusDoBairro(
        new QueryClient(),
        eventoDoBairroValido({ bairroId: 1, status: 'NORMAL', emAberto: 0 })!,
      ),
    ).toBe(false);
  });

  it.each([
    null,
    'x',
    {},
    { bairroId: '1', status: 'NORMAL', emAberto: 0 },
    { bairroId: 1, status: 'APAGAO', emAberto: 0 },
    { bairroId: 1, status: 'NORMAL' },
  ])('descarta evento malformado %j', (ruim) => {
    expect(eventoDoBairroValido(ruim)).toBeNull();
  });

  it('ocorrencia:atualizada invalida a lista; a reconexão refaz status e lista', async () => {
    const qc = new QueryClient();
    const espiao = jest.spyOn(qc, 'invalidateQueries');

    await atualizarListaDeOcorrencias(qc);
    expect(espiao).toHaveBeenLastCalledWith({ queryKey: CHAVE_OCORRENCIAS });

    await refazerConsultasPublicas(qc);
    expect(espiao).toHaveBeenCalledWith({ queryKey: CHAVE_STATUS_DOS_BAIRROS });
    expect(espiao).toHaveBeenCalledWith({ queryKey: CHAVE_OCORRENCIAS });
  });
});

describe('tempoDesde', () => {
  const agora = Date.parse('2026-11-19T12:00:00Z');
  it.each([
    ['2026-11-19T11:59:40Z', 'Agora'],
    ['2026-11-19T11:55:00Z', 'Há 5 min'],
    ['2026-11-19T09:00:00Z', 'Há 3 h'],
    ['2026-11-18T11:00:00Z', 'Há 1 dia'],
    ['2026-11-16T12:00:00Z', 'Há 3 dias'],
    ['2026-11-19T12:30:00Z', 'Agora'],
    ['abc', ''],
  ])('%s → %s', (iso, esperado) => {
    expect(tempoDesde(iso, agora)).toBe(esperado);
  });
  it('vazio ou nulo', () => {
    expect(tempoDesde(null, agora)).toBe('');
    expect(tempoDesde(undefined, agora)).toBe('');
  });
});

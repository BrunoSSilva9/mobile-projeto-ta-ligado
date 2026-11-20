import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { configurarConectividade, estaOnline, useConectado } from './conectividade';
import {
  CHAVE_DO_CACHE,
  CHAVES_PERSISTIDAS,
  deveSalvar,
  limparCachePersistido,
  opcoesDePersistencia,
  VALIDADE_DO_CACHE_MS,
} from './persistencia';
import { queryClient } from './query-client';

const netinfo = NetInfo as jest.Mocked<typeof NetInfo>;
type Estado = { isConnected: boolean | null; isInternetReachable: boolean | null };
const COM_REDE: Estado = { isConnected: true, isInternetReachable: true };
const SEM_REDE: Estado = { isConnected: false, isInternetReachable: false };

let ouvintes: ((estado: Estado) => void)[] = [];

beforeEach(async () => {
  ouvintes = [];
  netinfo.addEventListener.mockImplementation(((cb: (e: Estado) => void) => {
    ouvintes.push(cb);
    return jest.fn();
  }) as never);
  netinfo.fetch.mockResolvedValue(COM_REDE as never);
  await AsyncStorage.clear();
});

const mudarRede = (estado: Estado) => act(async () => ouvintes.forEach((cb) => cb(estado)));

describe('estaOnline', () => {
  it.each([
    [{ isConnected: true, isInternetReachable: true }, true],
    [{ isConnected: true, isInternetReachable: null }, true], // ainda não sabe: confia no sinal
    [{ isConnected: false, isInternetReachable: false }, false],
    [{ isConnected: true, isInternetReachable: false }, false], // sinal sem internet
    [{ isConnected: false, isInternetReachable: null }, false],
    [{ isConnected: null, isInternetReachable: null }, true],
  ])('%j → %s', (estado, esperado) => {
    expect(estaOnline(estado)).toBe(esperado);
  });
});

describe('configurarConectividade (ADR-0005)', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
    focusManager.setFocused(undefined);
  });

  it('o TanStack Query passa a seguir o NetInfo: sem rede, as leituras ficam em pausa', async () => {
    configurarConectividade();
    // O gerenciador só assina o NetInfo quando alguém o observa.
    const cancelar = onlineManager.subscribe(() => undefined);

    await mudarRede(SEM_REDE);
    expect(onlineManager.isOnline()).toBe(false);

    await mudarRede(COM_REDE);
    expect(onlineManager.isOnline()).toBe(true);
    cancelar();
  });

  it('voltar ao primeiro plano reativa o foco (refaz as consultas)', () => {
    const assinatura = { remove: jest.fn() };
    let aoMudar: (estado: string) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: never) => {
      aoMudar = cb;
      return assinatura;
    }) as never);

    configurarConectividade();
    const cancelar = focusManager.subscribe(() => undefined);

    aoMudar('background');
    expect(focusManager.isFocused()).toBe(false);
    aoMudar('active');
    expect(focusManager.isFocused()).toBe(true);

    cancelar();
    expect(assinatura.remove).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

describe('useConectado', () => {
  it('começa conectado (sem piscar o aviso) e acompanha a rede', async () => {
    const { result } = await renderHook(() => useConectado());
    expect(result.current).toBe(true);

    await mudarRede(SEM_REDE);
    expect(result.current).toBe(false);

    await mudarRede(COM_REDE);
    expect(result.current).toBe(true);
  });

  it('já abre offline quando o aparelho está sem rede', async () => {
    netinfo.fetch.mockResolvedValue(SEM_REDE as never);

    const { result } = await renderHook(() => useConectado());
    await act(async () => undefined);

    expect(result.current).toBe(false);
  });
});

describe('cache salvo no aparelho', () => {
  const consulta = (chave: unknown[], status: string) =>
    ({ queryKey: chave, state: { status } }) as never;

  it.each(CHAVES_PERSISTIDAS)('salva a consulta "%s" quando deu certo', (chave) => {
    expect(deveSalvar(consulta([chave, 'x'], 'success'))).toBe(true);
  });

  it('não salva consultas com erro ou em andamento', () => {
    expect(deveSalvar(consulta(['ocorrencias'], 'error'))).toBe(false);
    expect(deveSalvar(consulta(['ocorrencias'], 'pending'))).toBe(false);
  });

  it('não salva o que não está na lista (ex.: qualquer dado novo, por segurança)', () => {
    expect(deveSalvar(consulta(['senha'], 'success'))).toBe(false);
    expect(deveSalvar(consulta(['sessao'], 'success'))).toBe(false);
  });

  it('vale por 24 h e tem versão para descartar formatos antigos', () => {
    expect(opcoesDePersistencia.maxAge).toBe(24 * 60 * 60 * 1000);
    expect(VALIDADE_DO_CACHE_MS).toBe(opcoesDePersistencia.maxAge);
    expect(opcoesDePersistencia.buster).toBeTruthy();
  });

  it('limparCachePersistido apaga o cache do aparelho', async () => {
    await AsyncStorage.setItem(CHAVE_DO_CACHE, '{"dados":1}');

    await limparCachePersistido();

    expect(await AsyncStorage.getItem(CHAVE_DO_CACHE)).toBeNull();
  });

  it('se o armazenamento falhar, não lança', async () => {
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disco'));

    await expect(limparCachePersistido()).resolves.toBeUndefined();
    jest.restoreAllMocks();
  });
});

describe('regras do cache em memória', () => {
  it('as leituras duram 24 h em memória (para o cache salvo poder ser restaurado)', () => {
    expect(queryClient.getDefaultOptions().queries?.gcTime).toBeGreaterThanOrEqual(
      VALIDADE_DO_CACHE_MS,
    );
  });

  it('o envio nunca fica em pausa sem rede (não dispara sozinho depois): networkMode "always"', () => {
    expect(queryClient.getDefaultOptions().mutations?.networkMode).toBe('always');
  });

  it('sem rede, o envio é tentado na hora e falha, em vez de esperar a rede voltar', async () => {
    onlineManager.setOnline(false);
    try {
      const envio = jest.fn().mockRejectedValue(new Error('Sem conexão'));
      const mutacao = queryClient
        .getMutationCache()
        .build(queryClient, { mutationFn: envio, gcTime: 0 });

      await expect(mutacao.execute(undefined)).rejects.toThrow('Sem conexão');

      expect(envio).toHaveBeenCalledTimes(1);
      expect(mutacao.state.status).toBe('error');
    } finally {
      onlineManager.setOnline(true);
    }
  });
});

import * as Location from 'expo-location';

import { montarLogradouro, obterLocalizacao } from './localizacao';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const loc = Location as jest.Mocked<typeof Location>;

beforeEach(() => {
  jest.resetAllMocks();
  loc.requestForegroundPermissionsAsync.mockResolvedValue({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  } as never);
  loc.hasServicesEnabledAsync.mockResolvedValue(true);
  loc.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: -5.37, longitude: -49.12 },
  } as never);
  loc.reverseGeocodeAsync.mockResolvedValue([
    { street: 'Rua das Flores', streetNumber: '10' },
  ] as never);
});

describe('obterLocalizacao (RF-008)', () => {
  it('devolve coordenadas e o logradouro sugerido', async () => {
    expect(await obterLocalizacao()).toEqual({
      estado: 'ok',
      coordenadas: { latitude: -5.37, longitude: -49.12 },
      endereco: 'Rua das Flores, 10',
    });
  });

  it('pede só a permissão "ao usar o app" e precisão média', async () => {
    await obterLocalizacao();

    expect(loc.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(loc.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 });
  });

  it('permissão negada: não lê a posição e informa se dá para pedir de novo', async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    } as never);

    expect(await obterLocalizacao()).toEqual({ estado: 'negada', podePedirDeNovo: false });
    expect(loc.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('GPS do aparelho desligado', async () => {
    loc.hasServicesEnabledAsync.mockResolvedValue(false);

    expect(await obterLocalizacao()).toEqual({ estado: 'desativada' });
    expect(loc.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('falha ao ler a posição vira "indisponível" (nunca lança)', async () => {
    loc.getCurrentPositionAsync.mockRejectedValue(new Error('sem sinal'));

    expect(await obterLocalizacao()).toEqual({ estado: 'indisponivel' });
  });

  it('falha ao pedir a permissão também não lança', async () => {
    loc.requestForegroundPermissionsAsync.mockRejectedValue(new Error('x'));

    expect(await obterLocalizacao()).toEqual({ estado: 'indisponivel' });
  });

  it('desiste do GPS depois do tempo limite', async () => {
    jest.useFakeTimers();
    try {
      loc.getCurrentPositionAsync.mockReturnValue(new Promise(() => undefined));
      const resultado = obterLocalizacao({ tempoMs: 5000 });

      await jest.advanceTimersByTimeAsync(5000);

      expect(await resultado).toEqual({ estado: 'indisponivel' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('sem o endereço, as coordenadas continuam valendo', async () => {
    loc.reverseGeocodeAsync.mockRejectedValue(new Error('sem rede'));

    expect(await obterLocalizacao()).toEqual({
      estado: 'ok',
      coordenadas: { latitude: -5.37, longitude: -49.12 },
      endereco: null,
    });
  });
});

describe('montarLogradouro', () => {
  it.each([
    [{ street: 'Rua A', streetNumber: '12' }, 'Rua A, 12'],
    [{ street: 'Rua A', streetNumber: null }, 'Rua A'],
    [{ street: 'Rua A', streetNumber: 'S/N' }, 'Rua A'],
    [{ street: null, name: 'Av. Brasil', streetNumber: null }, 'Av. Brasil'],
    [{ street: 'Rua A, 12', streetNumber: '12' }, 'Rua A, 12'],
    [{ street: ' ', name: ' ', streetNumber: '1' }, null],
    [undefined, null],
    [null, null],
  ])('%j → %j', (entrada, esperado) => {
    expect(montarLogradouro(entrada as never)).toBe(esperado);
  });
});

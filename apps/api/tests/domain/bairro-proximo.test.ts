import { describe, expect, it } from 'vitest';

import { bairroMaisProximo, distanciaKm, RAIO_MAXIMO_KM } from '../../src/domain';

// Coordenadas aproximadas de demonstração (mesma ordem de grandeza do seed).
const novaMaraba = { nome: 'Nova Marabá', latitude: -5.34, longitude: -49.082 };
const cidadeNova = { nome: 'Cidade Nova', latitude: -5.359, longitude: -49.105 };
const saoFelix = { nome: 'São Félix', latitude: -5.379, longitude: -49.144 };
const bairros = [novaMaraba, cidadeNova, saoFelix];

describe('distanciaKm (Haversine)', () => {
  it('é zero entre o mesmo ponto', () => {
    expect(distanciaKm(novaMaraba, novaMaraba)).toBe(0);
  });

  it('é simétrica', () => {
    expect(distanciaKm(novaMaraba, saoFelix)).toBeCloseTo(distanciaKm(saoFelix, novaMaraba), 10);
  });

  it('um grau de latitude vale cerca de 111 km', () => {
    const d = distanciaKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(d).toBeGreaterThan(110.5);
    expect(d).toBeLessThan(111.9);
  });

  it('um grau de longitude no equador também vale cerca de 111 km', () => {
    const d = distanciaKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    expect(d).toBeGreaterThan(110.5);
    expect(d).toBeLessThan(111.9);
  });

  it('pontos antípodas ficam a cerca de meia volta na Terra (~20.015 km)', () => {
    const d = distanciaKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 });
    expect(d).toBeGreaterThan(20_000);
    expect(d).toBeLessThan(20_030);
  });
});

describe('bairroMaisProximo (RN-025)', () => {
  it('escolhe o bairro de centro mais próximo', () => {
    expect(bairroMaisProximo({ latitude: -5.341, longitude: -49.083 }, bairros)).toBe(novaMaraba);
    expect(bairroMaisProximo({ latitude: -5.358, longitude: -49.104 }, bairros)).toBe(cidadeNova);
    expect(bairroMaisProximo({ latitude: -5.38, longitude: -49.14 }, bairros)).toBe(saoFelix);
  });

  it('devolve o próprio objeto da lista (preserva os demais campos)', () => {
    const achado = bairroMaisProximo({ latitude: -5.34, longitude: -49.082 }, bairros);
    expect(achado?.nome).toBe('Nova Marabá');
  });

  it('devolve null quando o mais próximo está além de 15 km', () => {
    // Belém: muito mais longe que 15 km de qualquer bairro de Marabá.
    expect(bairroMaisProximo({ latitude: -1.4558, longitude: -48.4902 }, bairros)).toBeNull();
  });

  it('respeita o limite configurável', () => {
    const ponto = { latitude: -5.345, longitude: -49.082 }; // ~0,55 km de Nova Marabá
    expect(bairroMaisProximo(ponto, bairros, 1)).toBe(novaMaraba);
    expect(bairroMaisProximo(ponto, bairros, 0.1)).toBeNull();
  });

  it('o raio padrão é de 15 km', () => {
    expect(RAIO_MAXIMO_KM).toBe(15);
  });

  it('devolve null para lista vazia', () => {
    expect(bairroMaisProximo({ latitude: -5.34, longitude: -49.08 }, [])).toBeNull();
  });
});

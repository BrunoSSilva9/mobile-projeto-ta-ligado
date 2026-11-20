import { describe, expect, it } from 'vitest';

import { compararPrioridade, ordenarPorPrioridade } from '../../src/domain';

const item = (id: string, prioritaria: boolean, hora: number) => ({
  id,
  prioritaria,
  criadoEm: new Date(Date.UTC(2026, 10, 18, hora)),
});

describe('compararPrioridade (RN-015)', () => {
  it('prioritária vem antes da comum, mesmo sendo mais recente', () => {
    expect(compararPrioridade(item('a', true, 15), item('b', false, 10))).toBeLessThan(0);
    expect(compararPrioridade(item('b', false, 10), item('a', true, 15))).toBeGreaterThan(0);
  });

  it('no mesmo grupo, a mais antiga vem primeiro', () => {
    expect(compararPrioridade(item('a', false, 10), item('b', false, 11))).toBeLessThan(0);
    expect(compararPrioridade(item('a', true, 12), item('b', true, 11))).toBeGreaterThan(0);
  });

  it('empata quando o grupo e o horário são iguais', () => {
    expect(compararPrioridade(item('a', true, 10), item('b', true, 10))).toBe(0);
  });
});

describe('ordenarPorPrioridade', () => {
  const lista = [
    item('comum-nova', false, 15),
    item('prior-nova', true, 14),
    item('comum-antiga', false, 9),
    item('prior-antiga', true, 8),
  ];

  it('ordena prioritárias primeiro e, dentro do grupo, da mais antiga para a mais recente', () => {
    expect(ordenarPorPrioridade(lista).map((i) => i.id)).toEqual([
      'prior-antiga',
      'prior-nova',
      'comum-antiga',
      'comum-nova',
    ]);
  });

  it('não altera a lista original', () => {
    const copia = [...lista];
    ordenarPorPrioridade(lista);
    expect(lista).toEqual(copia);
  });

  it('funciona com lista vazia', () => {
    expect(ordenarPorPrioridade([])).toEqual([]);
  });
});

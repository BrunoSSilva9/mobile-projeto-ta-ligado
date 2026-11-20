import { describe, expect, it } from 'vitest';

import { formatarProtocolo, lerProtocolo, protocoloValido } from '../../src/domain';

describe('formatarProtocolo (RN-023)', () => {
  it('formata TL-AAAA-NNNNNN com a sequência de 6 dígitos', () => {
    expect(formatarProtocolo(2026, 1)).toBe('TL-2026-000001');
    expect(formatarProtocolo(2026, 123)).toBe('TL-2026-000123');
    expect(formatarProtocolo(2027, 999_999)).toBe('TL-2027-999999');
  });

  it.each([0, -1, 1_000_000, 1.5, Number.NaN])('recusa a sequência %s', (sequencia) => {
    expect(() => formatarProtocolo(2026, sequencia)).toThrow(RangeError);
  });

  it.each([999, 10_000, 2026.5, Number.NaN])('recusa o ano %s', (ano) => {
    expect(() => formatarProtocolo(ano, 1)).toThrow(RangeError);
  });
});

describe('protocoloValido', () => {
  it('aceita o formato correto', () => {
    expect(protocoloValido('TL-2026-000123')).toBe(true);
  });

  it.each([
    '',
    'TL-2026-123',
    'TL-26-000123',
    'tl-2026-000123',
    'TL-2026-0001234',
    'XX-2026-000123',
    ' TL-2026-000123',
    'TL-2026-000123 ',
    'TL-2026-00012A',
  ])('recusa "%s"', (texto) => {
    expect(protocoloValido(texto)).toBe(false);
  });
});

describe('lerProtocolo', () => {
  it('separa ano e sequência', () => {
    expect(lerProtocolo('TL-2026-000123')).toEqual({ ano: 2026, sequencia: 123 });
  });

  it('devolve null para formato inválido', () => {
    expect(lerProtocolo('TL-2026-12')).toBeNull();
  });

  it('é o inverso de formatarProtocolo', () => {
    expect(lerProtocolo(formatarProtocolo(2030, 4567))).toEqual({ ano: 2030, sequencia: 4567 });
  });
});

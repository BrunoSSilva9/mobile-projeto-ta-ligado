import { describe, expect, it } from 'vitest';

import { ehJpeg, LIMITE_DE_FOTOS, TAMANHO_MAXIMO_DA_FOTO, validarFotos } from '../../src/domain';

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const foto = (bytes: Uint8Array = JPEG, tamanhoBytes = 1000) => ({ bytes, tamanhoBytes });

describe('ehJpeg (RN-013, S-49): pelo conteúdo, nunca pela extensão', () => {
  it('aceita a assinatura FF D8 FF', () => {
    expect(ehJpeg(JPEG)).toBe(true);
    expect(ehJpeg(Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(true);
  });

  it.each([
    ['PNG', PNG],
    ['GIF', GIF],
    ['texto', new TextEncoder().encode('não sou uma foto')],
    ['vazio', new Uint8Array()],
    ['curto demais', Uint8Array.from([0xff, 0xd8])],
    ['JPEG com a assinatura trocada', Uint8Array.from([0xd8, 0xff, 0xff, 0xe0])],
  ])('recusa %s', (_nome, bytes) => {
    expect(ehJpeg(bytes)).toBe(false);
  });
});

describe('validarFotos (RN-013)', () => {
  it('sem fotos, tudo bem (são opcionais)', () => {
    expect(validarFotos([])).toEqual({ ok: true });
  });

  it('aceita de 1 a 3 JPEG de até 5 MB', () => {
    expect(validarFotos([foto()])).toEqual({ ok: true });
    expect(validarFotos([foto(), foto(), foto(JPEG, TAMANHO_MAXIMO_DA_FOTO)])).toEqual({
      ok: true,
    });
  });

  it('a 4ª foto é recusada com LIMITE_FOTOS', () => {
    expect(LIMITE_DE_FOTOS).toBe(3);
    expect(validarFotos([foto(), foto(), foto(), foto()])).toMatchObject({
      ok: false,
      codigo: 'LIMITE_FOTOS',
    });
  });

  it('foto acima de 5 MB é recusada com FOTO_GRANDE', () => {
    expect(validarFotos([foto(JPEG, TAMANHO_MAXIMO_DA_FOTO + 1)])).toMatchObject({
      ok: false,
      codigo: 'FOTO_GRANDE',
    });
  });

  it.each([
    ['PNG', PNG],
    ['GIF', GIF],
  ])('%s é recusado com FOTO_TIPO_INVALIDO, mesmo que o cliente diga image/jpeg', (_n, bytes) => {
    expect(validarFotos([foto(JPEG), foto(bytes)])).toMatchObject({
      ok: false,
      codigo: 'FOTO_TIPO_INVALIDO',
    });
  });

  it('o limite de quantidade vem antes das outras verificações', () => {
    expect(validarFotos([foto(PNG), foto(), foto(), foto()])).toMatchObject({
      codigo: 'LIMITE_FOTOS',
    });
  });

  it('a mensagem diz qual é a foto com problema (1ª, 2ª…)', () => {
    const r = validarFotos([foto(), foto(PNG)]);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.mensagem).toMatch(/foto 2/i);
  });
});

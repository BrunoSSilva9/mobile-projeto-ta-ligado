import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  contarSegmentosApp1,
  JpegInvalidoError,
  removerMetadados,
} from '../../src/modules/fotos/metadados';
import {
  dimensoes,
  jpegComGps,
  jpegSemMetadados,
  segmentoExifComGps,
} from '../fixtures/construir-foto';

/** Procura uma sequência de texto nos bytes (para provar que o GPS não sobrou em lugar nenhum). */
const contem = (bytes: Uint8Array, texto: string) =>
  Buffer.from(bytes).includes(texto, 0, 'latin1');

const FOTO_COM_GPS = new Uint8Array(readFileSync(join(__dirname, '../fixtures/foto-com-gps.jpg')));

describe('removerMetadados: foto de exemplo com GPS no EXIF (S-57, S-49)', () => {
  it('a foto de exemplo realmente tem EXIF, GPS e XMP (senão o teste não prova nada)', () => {
    expect(contarSegmentosApp1(FOTO_COM_GPS)).toBe(2);
    expect(contem(FOTO_COM_GPS, 'Exif')).toBe(true);
    expect(contem(FOTO_COM_GPS, 'xap')).toBe(true);
    expect(contem(FOTO_COM_GPS, 'GPSLatitude')).toBe(true);
    // O IFD de GPS: latitude S (0x0001, ASCII) e longitude W (0x0003, ASCII).
    expect(
      Buffer.from(FOTO_COM_GPS).includes(Buffer.from([0x01, 0x00, 0x02, 0x00, 0x02, 0x00])),
    ).toBe(true);
  });

  it('depois da limpeza, não sobra segmento APP1 nem nenhuma marca de EXIF, XMP ou GPS', () => {
    const limpa = removerMetadados(FOTO_COM_GPS);

    expect(contarSegmentosApp1(limpa)).toBe(0);
    for (const marca of ['Exif', 'xap', 'GPS', 'adobe', 'exif:']) {
      expect(contem(limpa, marca)).toBe(false);
    }
    expect(limpa.length).toBeLessThan(FOTO_COM_GPS.length);
  });

  it('a imagem continua abrindo, com o mesmo tamanho em pixels (decodificada pelo jpeg-js)', () => {
    const limpa = removerMetadados(FOTO_COM_GPS);

    expect(dimensoes(FOTO_COM_GPS)).toEqual({ largura: 16, altura: 8 });
    expect(dimensoes(limpa)).toEqual({ largura: 16, altura: 8 });
  });

  it('os pixels não mudam: a imagem limpa é igual à original sem metadados', () => {
    const original = jpegSemMetadados();

    expect(Buffer.from(removerMetadados(jpegComGps(original))).equals(Buffer.from(original))).toBe(
      true,
    );
  });

  it('um JPEG sem metadados sai idêntico', () => {
    const original = jpegSemMetadados();

    expect(Buffer.from(removerMetadados(original)).equals(Buffer.from(original))).toBe(true);
  });

  it('é idempotente: limpar de novo não muda nada', () => {
    const uma = removerMetadados(FOTO_COM_GPS);

    expect(Buffer.from(removerMetadados(uma)).equals(Buffer.from(uma))).toBe(true);
  });

  it('não altera o arquivo original', () => {
    const copia = Uint8Array.from(FOTO_COM_GPS);

    removerMetadados(FOTO_COM_GPS);

    expect(Buffer.from(FOTO_COM_GPS).equals(Buffer.from(copia))).toBe(true);
  });

  it('com o EXIF depois de outros segmentos (como na maioria dos celulares), também limpa', () => {
    const base = jpegSemMetadados();
    // SOI, o JFIF (APP0) que o encoder já escreve e, só então, o EXIF.
    const tamanhoDoApp0 = 2 + ((base[4]! << 8) | base[5]!);
    const jfif = base.subarray(2, 2 + tamanhoDoApp0);
    const comExifDepois = Uint8Array.from([
      ...base.subarray(0, 2),
      ...jfif,
      ...segmentoExifComGps(),
      ...base.subarray(2 + tamanhoDoApp0),
    ]);
    expect(contarSegmentosApp1(comExifDepois)).toBe(1);

    const limpa = removerMetadados(comExifDepois);

    expect(contarSegmentosApp1(limpa)).toBe(0);
    expect(contem(limpa, 'Exif')).toBe(false);
    expect(dimensoes(limpa)).toEqual({ largura: 16, altura: 8 });
  });
});

describe('removerMetadados: arquivos inválidos', () => {
  it.each([
    ['vazio', new Uint8Array()],
    ['texto', new TextEncoder().encode('não sou uma foto')],
    ['PNG', Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['começa certo mas o 1º segmento é truncado', Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x10])],
    [
      'o tamanho do segmento passa do fim do arquivo',
      Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 0x00, 0x00]),
    ],
    ['depois do SOI não vem um marcador', Uint8Array.from([0xff, 0xd8, 0x00, 0x01, 0x02, 0x03])],
  ])('%s: lança JpegInvalidoError', (_nome, bytes) => {
    expect(() => removerMetadados(bytes)).toThrow(JpegInvalidoError);
  });
});

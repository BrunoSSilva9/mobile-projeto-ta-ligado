import jpeg from 'jpeg-js';

/**
 * Monta JPEGs de teste (decisão S-57). `jpeg-js` só existe como devDependency: aqui ele gera a
 * imagem e depois se acrescenta, à mão, um segmento EXIF com **GPS** e um XMP, como o celular faz.
 */

/** Imagem de 16 x 8 pixels (degradê) em JPEG, sem nenhum metadado. */
export function jpegSemMetadados(largura = 16, altura = 8): Uint8Array {
  const dados = Buffer.alloc(largura * altura * 4);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4;
      dados[i] = (x * 255) / largura;
      dados[i + 1] = (y * 255) / altura;
      dados[i + 2] = 128;
      dados[i + 3] = 255;
    }
  }
  return new Uint8Array(jpeg.encode({ data: dados, width: largura, height: altura }, 90).data);
}

const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff]; // little-endian (TIFF "II")
const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
const ascii = (texto: string) => [...Buffer.from(texto, 'latin1')];

/** Entrada de IFD: tag, tipo, quantidade e valor (ou deslocamento) de 4 bytes. */
const entrada = (tag: number, tipo: number, quantidade: number, valor: number[]) => [
  ...u16(tag),
  ...u16(tipo),
  ...u32(quantidade),
  ...valor,
];

/** Graus, minutos e segundos como 3 racionais (numerador/denominador). */
const racionais = (g: number, m: number, s: number) => [g, 1, m, 1, s, 1].flatMap((n) => u32(n));

/** Segmento APP1 com EXIF: IFD0 com ponteiro para o IFD de GPS (5 graus 22 min 12 s S; 49 graus 7 min 12 s W). */
export function segmentoExifComGps(): number[] {
  const tiff = [
    ...ascii('II'),
    ...u16(0x2a),
    ...u32(8), // cabeçalho TIFF: IFD0 no deslocamento 8
    ...u16(1),
    ...entrada(0x8825, 4, 1, u32(26)),
    ...u32(0), // IFD0: ponteiro do GPS (em 26)
    ...u16(4), // IFD de GPS: 4 entradas; os racionais ficam a partir de 80
    ...entrada(0x0001, 2, 2, [...ascii('S'), 0, 0, 0]),
    ...entrada(0x0002, 5, 3, u32(80)),
    ...entrada(0x0003, 2, 2, [...ascii('W'), 0, 0, 0]),
    ...entrada(0x0004, 5, 3, u32(104)),
    ...u32(0),
    ...racionais(5, 22, 12),
    ...racionais(49, 7, 12),
  ];
  const corpo = [...ascii('Exif'), 0, 0, ...tiff];
  const tamanho = corpo.length + 2;
  return [0xff, 0xe1, (tamanho >> 8) & 0xff, tamanho & 0xff, ...corpo];
}

/** Segmento APP1 com XMP que também carrega a posição (como alguns aplicativos gravam). */
export function segmentoXmpComGps(): number[] {
  const xml =
    '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><rdf:Description ' +
    'exif:GPSLatitude="5,22.2S" exif:GPSLongitude="49,7.2W"/></rdf:RDF></x:xmpmeta>';
  const corpo = [...ascii('http://ns.adobe.com/xap/1.0/'), 0, ...ascii(xml)];
  const tamanho = corpo.length + 2;
  return [0xff, 0xe1, (tamanho >> 8) & 0xff, tamanho & 0xff, ...corpo];
}

/** O mesmo JPEG com EXIF (GPS) e XMP logo depois do SOI, como sai de um celular. */
export function jpegComGps(base: Uint8Array = jpegSemMetadados()): Uint8Array {
  return Uint8Array.from([
    ...base.subarray(0, 2),
    ...segmentoExifComGps(),
    ...segmentoXmpComGps(),
    ...base.subarray(2),
  ]);
}

/** Largura e altura, lidas decodificando de verdade (prova de que a imagem continua abrindo). */
export function dimensoes(bytes: Uint8Array): { largura: number; altura: number } {
  const imagem = jpeg.decode(Buffer.from(bytes), { useTArray: true });
  return { largura: imagem.width, altura: imagem.height };
}

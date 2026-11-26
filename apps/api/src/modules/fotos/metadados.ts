/** O arquivo não é um JPEG íntegro (marcadores truncados ou fora de ordem). */
export class JpegInvalidoError extends Error {
  constructor(mensagem = 'O arquivo não é um JPEG válido.') {
    super(mensagem);
    this.name = 'JpegInvalidoError';
  }
}

const SOI = 0xd8; // início da imagem
const EOI = 0xd9; // fim da imagem
const SOS = 0xda; // início dos dados da imagem
const APP1 = 0xe1; // EXIF e XMP (localização, aparelho, data...)

/** Marcadores sem tamanho: não têm os 2 bytes de comprimento depois deles. */
const semTamanho = (marcador: number) =>
  marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd8) || marcador === EOI;

/**
 * Remove os metadados de localização de um JPEG (decisão S-57): descarta **todos os segmentos APP1**
 * (EXIF e XMP, onde fica o GPS) e mantém todo o resto, então a imagem continua abrindo igual. Um
 * JPEG sem APP1 sai idêntico. Só JPEG: a API não aceita outros formatos (S-49).
 *
 * Estrutura de um JPEG: `FF D8` (SOI), uma sequência de segmentos `FF <marcador> <tamanho de 2
 * bytes, que inclui os próprios 2 bytes> <dados>` e, a partir de `FF DA` (SOS), os dados da imagem
 * até o `FF D9` (EOI). Depois do SOS nada precisa ser lido: copia-se o resto como veio.
 *
 * @throws JpegInvalidoError se o arquivo não começar com SOI ou os segmentos estiverem truncados.
 */
export function removerMetadados(jpeg: Uint8Array): Uint8Array {
  if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== SOI) throw new JpegInvalidoError();

  const partes: Uint8Array[] = [jpeg.subarray(0, 2)];
  let posicao = 2;

  while (posicao < jpeg.length) {
    if (jpeg[posicao] !== 0xff) throw new JpegInvalidoError();
    // Bytes 0xFF de preenchimento antes do marcador são permitidos.
    let inicio = posicao;
    while (jpeg[inicio + 1] === 0xff && inicio + 2 < jpeg.length) inicio += 1;
    const marcador = jpeg[inicio + 1];
    if (marcador === undefined) throw new JpegInvalidoError();

    if (marcador === SOS) {
      partes.push(jpeg.subarray(inicio)); // dados da imagem: copiados como vieram
      return juntar(partes);
    }
    if (semTamanho(marcador)) {
      partes.push(jpeg.subarray(inicio, inicio + 2));
      posicao = inicio + 2;
      if (marcador === EOI) break;
      continue;
    }

    if (inicio + 4 > jpeg.length) throw new JpegInvalidoError();
    const tamanho = (jpeg[inicio + 2]! << 8) | jpeg[inicio + 3]!;
    const fim = inicio + 2 + tamanho;
    if (tamanho < 2 || fim > jpeg.length) throw new JpegInvalidoError();

    if (marcador !== APP1) partes.push(jpeg.subarray(inicio, fim));
    posicao = fim;
  }
  return juntar(partes);
}

function juntar(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((soma, p) => soma + p.length, 0);
  const saida = new Uint8Array(total);
  let deslocamento = 0;
  for (const parte of partes) {
    saida.set(parte, deslocamento);
    deslocamento += parte.length;
  }
  return saida;
}

/** Quantos segmentos APP1 (EXIF/XMP) o JPEG tem. Usado para conferir a limpeza nos testes. */
export function contarSegmentosApp1(jpeg: Uint8Array): number {
  let total = 0;
  let posicao = 2;
  while (posicao + 3 < jpeg.length && jpeg[posicao] === 0xff) {
    const marcador = jpeg[posicao + 1]!;
    if (marcador === SOS || marcador === EOI) break;
    if (semTamanho(marcador)) {
      posicao += 2;
      continue;
    }
    if (marcador === APP1) total += 1;
    posicao += 2 + ((jpeg[posicao + 2]! << 8) | jpeg[posicao + 3]!);
  }
  return total;
}

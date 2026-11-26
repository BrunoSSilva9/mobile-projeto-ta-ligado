/** Fotos da denúncia (RN-013, decisões S-09 e S-49): até 3, de até 5 MB cada, só JPEG. */
export const LIMITE_DE_FOTOS = 3;
export const TAMANHO_MAXIMO_DA_FOTO = 5 * 1024 * 1024;

/** O que o domínio precisa saber de cada arquivo recebido (sem depender de Express nem de Multer). */
export type FotoRecebida = { bytes: Uint8Array; tamanhoBytes: number };

export type CodigoErroDeFoto = 'LIMITE_FOTOS' | 'FOTO_GRANDE' | 'FOTO_TIPO_INVALIDO';

export type ResultadoDasFotos =
  { ok: true } | { ok: false; codigo: CodigoErroDeFoto; mensagem: string };

/**
 * É um JPEG? Confere a **assinatura do conteúdo** (`FF D8 FF`), nunca a extensão nem o
 * `Content-Type` que o cliente diz (S-49): um PNG renomeado para `.jpg` é recusado.
 */
export function ehJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * Valida o conjunto de fotos de uma denúncia. Ordem: quantidade, depois, foto a foto, tamanho e
 * tipo. A mensagem cita a posição da foto com problema ("foto 2").
 */
export function validarFotos(fotos: readonly FotoRecebida[]): ResultadoDasFotos {
  if (fotos.length > LIMITE_DE_FOTOS) {
    return {
      ok: false,
      codigo: 'LIMITE_FOTOS',
      mensagem: `Envie no máximo ${LIMITE_DE_FOTOS} fotos.`,
    };
  }
  for (const [indice, foto] of fotos.entries()) {
    const posicao = indice + 1;
    if (foto.tamanhoBytes > TAMANHO_MAXIMO_DA_FOTO) {
      return {
        ok: false,
        codigo: 'FOTO_GRANDE',
        mensagem: `A foto ${posicao} tem mais de 5 MB.`,
      };
    }
    if (!ehJpeg(foto.bytes)) {
      return {
        ok: false,
        codigo: 'FOTO_TIPO_INVALIDO',
        mensagem: `A foto ${posicao} precisa ser um JPEG.`,
      };
    }
  }
  return { ok: true };
}

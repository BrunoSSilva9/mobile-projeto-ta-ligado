const FORMATO = /^TL-(\d{4})-(\d{6})$/;

/**
 * Protocolo legível da denúncia (RN-023): `TL-AAAA-NNNNNN` (ano e sequência de 6 dígitos).
 * A sequência é fornecida pelo servidor, de forma atômica, por ano (S-34).
 */
export function formatarProtocolo(ano: number, sequencia: number): string {
  if (!Number.isInteger(ano) || ano < 1000 || ano > 9999) {
    throw new RangeError('O ano do protocolo precisa ter 4 dígitos.');
  }
  if (!Number.isInteger(sequencia) || sequencia < 1 || sequencia > 999_999) {
    throw new RangeError('A sequência do protocolo precisa estar entre 1 e 999999.');
  }
  return `TL-${ano}-${String(sequencia).padStart(6, '0')}`;
}

export function protocoloValido(texto: string): boolean {
  return FORMATO.test(texto);
}

/** Separa ano e sequência de um protocolo válido; `null` se o formato estiver errado. */
export function lerProtocolo(texto: string): { ano: number; sequencia: number } | null {
  const partes = FORMATO.exec(texto);
  if (!partes) return null;
  return { ano: Number(partes[1]), sequencia: Number(partes[2]) };
}

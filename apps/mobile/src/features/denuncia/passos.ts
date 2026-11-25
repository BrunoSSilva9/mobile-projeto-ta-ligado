import type { DadosDaDenuncia } from './schemas';

/**
 * Os 3 passos de "Fazer denúncia" (design system v2). A tela é uma rota só, com o mesmo
 * formulário: cada passo valida só os seus campos (`trigger`) e o envio valida o schema inteiro.
 * Nada aqui muda regra de negócio: o schema, o rascunho, o 409, o offline e o GPS são os mesmos.
 */
export type Passo = 1 | 2 | 3;

export const TOTAL_DE_PASSOS = 3;

export const TITULOS_DOS_PASSOS: Record<Passo, string> = {
  1: 'O que está acontecendo?',
  2: 'Onde está faltando energia?',
  3: 'Quer contar mais alguma coisa?',
};

/** Campos que cada passo valida antes de avançar. */
export const CAMPOS_DO_PASSO: Record<Passo, readonly (keyof DadosDaDenuncia)[]> = {
  1: ['tipo'],
  2: ['bairroId', 'logradouro', 'cep'],
  3: ['pontoReferencia', 'descricao'],
};

/** Em qual passo o campo aparece. */
export function passoDoCampo(campo: string): Passo | null {
  for (const passo of [1, 2, 3] as const) {
    if ((CAMPOS_DO_PASSO[passo] as readonly string[]).includes(campo)) return passo;
  }
  return null;
}

/**
 * O primeiro passo (o mais baixo) que tem algum dos campos com erro, ou `null` se nenhum campo
 * conhecido tem erro. Usado para levar o usuário de volta ao passo certo depois de um erro do
 * servidor ou de um envio inválido.
 */
export function primeiroPassoComErro(campos: readonly string[]): Passo | null {
  const passos = campos
    .map(passoDoCampo)
    .filter((p): p is Passo => p !== null)
    .sort((a, b) => a - b);
  return passos[0] ?? null;
}

/** Texto lido pelo leitor de tela ao entrar num passo. */
export const anuncioDoPasso = (passo: Passo): string =>
  `Passo ${passo} de ${TOTAL_DE_PASSOS}: ${TITULOS_DOS_PASSOS[passo]}`;

/** O endereço está completo o bastante para o usuário só confirmar? (logradouro e bairro) */
export function enderecoCompleto(valores: { logradouro?: string; bairroId?: number }): boolean {
  return (valores.logradouro ?? '').trim().length >= 3 && !!valores.bairroId;
}

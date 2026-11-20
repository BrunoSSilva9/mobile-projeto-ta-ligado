import AsyncStorage from '@react-native-async-storage/async-storage';

import { TIPOS_DE_DENUNCIA, type DadosDaDenuncia } from './schemas';

/**
 * Rascunho do formulário de denúncia (RNF-008, ADR-0005): o que o usuário já digitou fica salvo no
 * aparelho e só é apagado depois que o servidor confirma o registro. Assim, sem internet, nada
 * se perde. Uma chave por usuário, para uma conta não ver o rascunho de outra.
 *
 * As coordenadas NÃO entram no rascunho: um GPS de horas atrás enganaria; o app busca de novo.
 */
export type Rascunho = Partial<DadosDaDenuncia>;

export const chaveDoRascunho = (usuarioId: string) => `taligado.rascunho-denuncia.${usuarioId}`;

const TIPOS = TIPOS_DE_DENUNCIA.map((t) => t.valor) as readonly string[];
const CAMPOS_DE_TEXTO = ['logradouro', 'cep', 'pontoReferencia', 'descricao'] as const;

/** Mantém só o que tem o formato certo; qualquer outra coisa lida do disco é descartada. */
function sanear(bruto: unknown): Rascunho | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const dados = bruto as Record<string, unknown>;
  const rascunho: Rascunho = {};

  if (typeof dados.tipo === 'string' && TIPOS.includes(dados.tipo)) {
    rascunho.tipo = dados.tipo as DadosDaDenuncia['tipo'];
  }
  if (
    typeof dados.bairroId === 'number' &&
    Number.isInteger(dados.bairroId) &&
    dados.bairroId > 0
  ) {
    rascunho.bairroId = dados.bairroId;
  }
  for (const campo of CAMPOS_DE_TEXTO) {
    const valor = dados[campo];
    if (typeof valor === 'string' && valor !== '') rascunho[campo] = valor;
  }
  return Object.keys(rascunho).length > 0 ? rascunho : null;
}

export async function lerRascunho(usuarioId: string): Promise<Rascunho | null> {
  try {
    const texto = await AsyncStorage.getItem(chaveDoRascunho(usuarioId));
    return texto ? sanear(JSON.parse(texto)) : null;
  } catch {
    return null; // disco com problema ou JSON corrompido: começa em branco
  }
}

/** Salva o rascunho. Se o formulário estiver vazio, apaga o que existia. */
export async function salvarRascunho(usuarioId: string, valores: Rascunho): Promise<void> {
  try {
    const limpo = sanear(valores);
    if (limpo) await AsyncStorage.setItem(chaveDoRascunho(usuarioId), JSON.stringify(limpo));
    else await AsyncStorage.removeItem(chaveDoRascunho(usuarioId));
  } catch {
    // Falhar ao guardar o rascunho nunca pode atrapalhar o preenchimento.
  }
}

export async function limparRascunho(usuarioId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(chaveDoRascunho(usuarioId));
  } catch {
    // Sem efeito: o rascunho antigo será sobrescrito na próxima edição.
  }
}

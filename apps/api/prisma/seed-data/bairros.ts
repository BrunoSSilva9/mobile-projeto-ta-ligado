/**
 * ⚠️ DADOS APROXIMADOS PARA FINS DE DEMONSTRAÇÃO.
 *
 * Os nomes de bairros/folhas e as coordenadas do centro abaixo são **aproximados** e servem apenas
 * para o MVP acadêmico (decisão RN-021, pendência PEN-07). A equipe deve revisar antes de qualquer
 * uso real. Não use estes valores como referência geográfica oficial.
 */
export type BairroSeed = {
  nome: string;
  folha: string | null;
  latitude: number;
  longitude: number;
};

/** Folhas principais da Nova Marabá (inclui as citadas no protótipo: 20, 21, 28 e 32). */
const FOLHAS_NOVA_MARABA = [4, 8, 10, 15, 20, 21, 25, 28, 30, 32];

const NOVA_MARABA_CENTRO = { latitude: -5.34, longitude: -49.082 };

const novaMaraba: BairroSeed[] = FOLHAS_NOVA_MARABA.map((folha, i) => ({
  nome: 'Nova Marabá',
  folha: `Folha ${folha}`,
  // Pequeno deslocamento por folha só para espalhar os pontos no mapa de demonstração.
  latitude: Number((NOVA_MARABA_CENTRO.latitude + ((i % 5) - 2) * 0.004).toFixed(6)),
  longitude: Number((NOVA_MARABA_CENTRO.longitude + (Math.floor(i / 5) - 0.5) * 0.008).toFixed(6)),
}));

export const bairros: BairroSeed[] = [
  ...novaMaraba,
  { nome: 'Cidade Nova', folha: null, latitude: -5.359, longitude: -49.105 },
  { nome: 'Marabá Pioneira', folha: null, latitude: -5.366, longitude: -49.122 },
  { nome: 'São Félix', folha: null, latitude: -5.379, longitude: -49.144 },
  { nome: 'Morada Nova', folha: null, latitude: -5.329, longitude: -49.1 },
  // Bairros citados no protótipo (T-04):
  { nome: 'Laranjeiras', folha: null, latitude: -5.347, longitude: -49.09 },
  { nome: 'Liberdade', folha: null, latitude: -5.352, longitude: -49.098 },
  { nome: 'Bairro da Paz', folha: null, latitude: -5.356, longitude: -49.09 },
];

import { http } from '@/services/api';
import { ErroDeApi } from '@/services/http';
import { necessidadeAoEnviar, type DadosDaDenuncia } from './schemas';

export type Bairro = {
  id: number;
  nome: string;
  folha: string | null;
  latitude: number;
  longitude: number;
};

export type BairroProximo = Bairro & { distanciaKm: number };

export type Coordenadas = { latitude: number; longitude: number };

export type DenunciaCriada = {
  id: string;
  protocolo: string;
  status: string;
  tipo: string;
  bairro: { id: number; nome: string };
  criadoEm: string;
};

/** "Nova Marabá (Folha 28)" ou só "Cidade Nova". */
export const nomeDoBairro = (bairro: Pick<Bairro, 'nome' | 'folha'>): string =>
  bairro.folha ? `${bairro.nome} (${bairro.folha})` : bairro.nome;

/** Lista fixa de bairros e folhas de Marabá (RN-021). */
export async function listarBairros(): Promise<Bairro[]> {
  const resposta = await http.get<{ bairros: Bairro[] }>('/bairros');
  return resposta.bairros;
}

/** Bairro de centro mais próximo do GPS (RN-025). `null` quando o usuário está longe demais (404). */
export async function bairroMaisProximo(coordenadas: Coordenadas): Promise<BairroProximo | null> {
  try {
    return await http.get<BairroProximo>('/bairros/proximo', {
      lat: coordenadas.latitude,
      lng: coordenadas.longitude,
    });
  } catch (erro) {
    if (erro instanceof ErroDeApi && erro.status === 404) return null;
    throw erro;
  }
}

/**
 * Necessidade especial no corpo (RN-015, S-46): o "Sim" só vai **com** o consentimento; sem ele,
 * nada é enviado. O "Não" vai sozinho (não é dado de saúde). Sem resposta, nada vai.
 */
function corpoDaNecessidade(dados: DadosDaDenuncia) {
  const situacao = necessidadeAoEnviar(dados);
  if (situacao === 'sim') return { necessidadeEspecial: true, consentimentoNecessidade: true };
  if (situacao === 'nao') return { necessidadeEspecial: false };
  return {};
}

/** Monta o corpo do `POST /denuncias`: campos vazios e coordenadas ausentes não são enviados. */
export function montarCorpoDaDenuncia(dados: DadosDaDenuncia, coordenadas: Coordenadas | null) {
  return {
    tipo: dados.tipo,
    bairroId: dados.bairroId,
    logradouro: dados.logradouro.trim(),
    ...(dados.cep.trim() !== '' ? { cep: dados.cep.trim() } : {}),
    ...(dados.pontoReferencia.trim() !== ''
      ? { pontoReferencia: dados.pontoReferencia.trim() }
      : {}),
    ...(dados.descricao.trim() !== '' ? { descricao: dados.descricao.trim() } : {}),
    ...(dados.faixaPessoas ? { faixaPessoas: dados.faixaPessoas } : {}),
    ...corpoDaNecessidade(dados),
    // Com o GPS negado o envio continua, só que sem coordenadas (RN-012).
    ...(coordenadas ? { latitude: coordenadas.latitude, longitude: coordenadas.longitude } : {}),
  };
}

/** RF-007, RF-012: registra a denúncia e devolve o protocolo. */
export async function criarDenuncia(
  dados: DadosDaDenuncia,
  coordenadas: Coordenadas | null,
): Promise<DenunciaCriada> {
  return http.post<DenunciaCriada>('/denuncias', montarCorpoDaDenuncia(dados, coordenadas));
}

import * as Location from 'expo-location';

import type { Coordenadas } from './api';

/** Quanto tempo esperar o GPS antes de desistir (em ambientes fechados ele pode não responder). */
export const TEMPO_DO_GPS_MS = 15_000;

export type ResultadoDaLocalizacao =
  | { estado: 'ok'; coordenadas: Coordenadas; endereco: string | null }
  | { estado: 'negada'; podePedirDeNovo: boolean }
  | { estado: 'desativada' }
  | { estado: 'indisponivel' };

type EnderecoGeocodificado = Pick<
  Location.LocationGeocodedAddress,
  'street' | 'streetNumber' | 'name'
>;

/**
 * Sugere o logradouro a partir do endereço do GPS: "Rua X, 123". O bairro não entra aqui (ele é
 * escolhido na lista fixa). Devolve `null` quando o GPS não trouxe rua utilizável.
 */
export function montarLogradouro(
  endereco: EnderecoGeocodificado | undefined | null,
): string | null {
  if (!endereco) return null;
  const rua = (endereco.street ?? endereco.name ?? '').trim();
  if (rua === '') return null;
  const numero = (endereco.streetNumber ?? '').trim();
  // Alguns geocodificadores repetem o número no `name`; não duplicamos.
  return numero !== '' && !/s\/?n/i.test(numero) && !rua.includes(numero)
    ? `${rua}, ${numero}`
    : rua;
}

function aposTempo<T>(promessa: Promise<T>, ms: number): Promise<T | 'tempo'> {
  let relogio: ReturnType<typeof setTimeout>;
  const limite = new Promise<'tempo'>((resolver) => {
    relogio = setTimeout(() => resolver('tempo'), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(relogio));
}

/**
 * Pede a permissão de localização (só "ao usar o app") e lê a posição (RF-008, LGPD).
 * Nunca lança: cada falha vira um estado que a tela sabe explicar, e o envio da denúncia continua
 * possível sem coordenadas (RN-012).
 */
export async function obterLocalizacao(
  opcoes: { tempoMs?: number } = {},
): Promise<ResultadoDaLocalizacao> {
  try {
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) {
      return { estado: 'negada', podePedirDeNovo: permissao.canAskAgain };
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      return { estado: 'desativada' };
    }

    const posicao = await aposTempo(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      opcoes.tempoMs ?? TEMPO_DO_GPS_MS,
    );
    if (posicao === 'tempo') return { estado: 'indisponivel' };

    const coordenadas = {
      latitude: posicao.coords.latitude,
      longitude: posicao.coords.longitude,
    };

    let endereco: string | null = null;
    try {
      endereco = montarLogradouro((await Location.reverseGeocodeAsync(coordenadas))[0]);
    } catch {
      // Sem o endereço sugerido, o usuário digita o logradouro; as coordenadas continuam valendo.
    }
    return { estado: 'ok', coordenadas, endereco };
  } catch {
    return { estado: 'indisponivel' };
  }
}

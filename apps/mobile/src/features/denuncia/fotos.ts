import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Fotos da denúncia (RF-009, RN-013, decisão S-49): até 3, só JPEG, reduzidas antes de enviar. */
export const LIMITE_DE_FOTOS = 3;
/** Lado maior da foto enviada. Mantém a foto bem abaixo dos 5 MB que a API aceita. */
export const LADO_MAXIMO_DA_FOTO = 1600;
export const QUALIDADE_DA_FOTO = 0.7;

/** Uma foto já pronta para enviar (JPEG reduzido, sem os metadados da original). */
export type FotoDoFormulario = { id: string; uri: string };

export type ResultadoDaFoto =
  | { estado: 'ok'; fotos: FotoDoFormulario[] }
  | { estado: 'cancelado' }
  /** Permissão da câmera negada; `podePedirDeNovo` = o sistema ainda deixa perguntar. */
  | { estado: 'negada'; podePedirDeNovo: boolean }
  | { estado: 'erro' };

let contador = 0;
const novoId = () => `foto-${Date.now()}-${(contador += 1)}`;

/**
 * Como reduzir: o **lado maior** vai a no máximo 1600 px, mantendo a proporção. Foto que já é
 * menor não é ampliada (`null`), mas ainda é reprocessada para virar JPEG sem metadados.
 */
export function reducaoDaFoto(
  largura: number,
  altura: number,
  lado = LADO_MAXIMO_DA_FOTO,
): { width: number } | { height: number } | null {
  if (Math.max(largura, altura) <= lado) return null;
  return largura >= altura ? { width: lado } : { height: lado };
}

/**
 * Converte **qualquer** foto (câmera ou galeria, JPEG, PNG ou HEIC) em JPEG reduzido (S-49). O
 * `manipulateAsync` decodifica e grava de novo a imagem, o que descarta o EXIF original (inclusive
 * a localização); a API remove os metadados mais uma vez, por garantia.
 */
export async function prepararFoto(origem: {
  uri: string;
  width: number;
  height: number;
}): Promise<FotoDoFormulario> {
  const reducao = reducaoDaFoto(origem.width, origem.height);
  const resultado = await ImageManipulator.manipulateAsync(
    origem.uri,
    reducao ? [{ resize: reducao }] : [],
    { compress: QUALIDADE_DA_FOTO, format: ImageManipulator.SaveFormat.JPEG, base64: false },
  );
  return { id: novoId(), uri: resultado.uri };
}

async function prepararTodas(
  assets: readonly { uri: string; width: number; height: number }[],
): Promise<ResultadoDaFoto> {
  try {
    return { estado: 'ok', fotos: await Promise.all(assets.map(prepararFoto)) };
  } catch {
    return { estado: 'erro' };
  }
}

/** "Tirar foto": pede a permissão da câmera **na hora** (e só aqui) e abre a câmera. */
export async function tirarFoto(): Promise<ResultadoDaFoto> {
  try {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      return { estado: 'negada', podePedirDeNovo: permissao.canAskAgain };
    }
    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      exif: false,
    });
    if (resultado.canceled || resultado.assets.length === 0) return { estado: 'cancelado' };
    return prepararTodas(resultado.assets);
  } catch {
    return { estado: 'erro' };
  }
}

/**
 * "Escolher da galeria": abre o seletor do sistema (que não precisa de permissão de acesso a todas
 * as fotos) e deixa escolher só as que ainda cabem (`restantes`).
 */
export async function escolherDaGaleria(restantes: number): Promise<ResultadoDaFoto> {
  if (restantes <= 0) return { estado: 'cancelado' };
  try {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: restantes,
      quality: 1,
      exif: false,
    });
    if (resultado.canceled || resultado.assets.length === 0) return { estado: 'cancelado' };
    // Se o sistema devolver mais do que cabe, fica só com as que cabem.
    return prepararTodas(resultado.assets.slice(0, restantes));
  } catch {
    return { estado: 'erro' };
  }
}

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  escolherDaGaleria,
  LADO_MAXIMO_DA_FOTO,
  prepararFoto,
  QUALIDADE_DA_FOTO,
  reducaoDaFoto,
  tirarFoto,
} from './fotos';

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const manipular = ImageManipulator.manipulateAsync as jest.Mock;
const permissao = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const camera = ImagePicker.launchCameraAsync as jest.Mock;
const galeria = ImagePicker.launchImageLibraryAsync as jest.Mock;

const asset = (n: number, largura = 4000, altura = 3000) => ({
  uri: `file:///original-${n}.heic`,
  width: largura,
  height: altura,
});

beforeEach(() => {
  jest.clearAllMocks();
  manipular.mockImplementation(async (uri: string) => ({ uri: `${uri}.reduzida.jpg` }));
});

describe('reducaoDaFoto: o lado maior vai a 1600 px (S-49)', () => {
  it('foto deitada: reduz a largura', () => {
    expect(LADO_MAXIMO_DA_FOTO).toBe(1600);
    expect(reducaoDaFoto(4000, 3000)).toEqual({ width: 1600 });
  });

  it('foto em pé: reduz a altura', () => {
    expect(reducaoDaFoto(3000, 4000)).toEqual({ height: 1600 });
  });

  it('quadrada: reduz a largura', () => {
    expect(reducaoDaFoto(3000, 3000)).toEqual({ width: 1600 });
  });

  it.each([
    [1600, 900],
    [800, 600],
    [1600, 1600],
  ])('foto %i x %i já é pequena: não é ampliada', (largura, altura) => {
    expect(reducaoDaFoto(largura, altura)).toBeNull();
  });
});

describe('prepararFoto: sempre JPEG, reduzido, regravado (remove o EXIF)', () => {
  it('foto grande: redimensiona, comprime a 0,7 e salva como JPEG', async () => {
    const foto = await prepararFoto(asset(1));

    expect(manipular).toHaveBeenCalledWith(
      'file:///original-1.heic',
      [{ resize: { width: 1600 } }],
      { compress: QUALIDADE_DA_FOTO, format: 'jpeg', base64: false },
    );
    expect(QUALIDADE_DA_FOTO).toBe(0.7);
    expect(foto.uri).toBe('file:///original-1.heic.reduzida.jpg');
    expect(foto.id).toMatch(/^foto-/);
  });

  it('foto pequena (ou PNG/HEIC): ainda passa pelo conversor, sem redimensionar', async () => {
    await prepararFoto(asset(2, 800, 600));

    expect(manipular).toHaveBeenCalledWith('file:///original-2.heic', [], {
      compress: 0.7,
      format: 'jpeg',
      base64: false,
    });
  });

  it('cada foto recebe um id diferente', async () => {
    const [a, b] = await Promise.all([prepararFoto(asset(1)), prepararFoto(asset(2))]);

    expect(a.id).not.toBe(b.id);
  });
});

describe('tirarFoto: a permissão é pedida na hora (RF-009)', () => {
  it('com a permissão, abre a câmera sem EXIF e devolve a foto convertida', async () => {
    permissao.mockResolvedValue({ granted: true, canAskAgain: true });
    camera.mockResolvedValue({ canceled: false, assets: [asset(1)] });

    const r = await tirarFoto();

    expect(camera).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 1, exif: false });
    expect(r).toMatchObject({
      estado: 'ok',
      fotos: [{ uri: 'file:///original-1.heic.reduzida.jpg' }],
    });
  });

  it('permissão negada (ainda dá para perguntar): não abre a câmera', async () => {
    permissao.mockResolvedValue({ granted: false, canAskAgain: true });

    expect(await tirarFoto()).toEqual({ estado: 'negada', podePedirDeNovo: true });
    expect(camera).not.toHaveBeenCalled();
  });

  it('permissão bloqueada de vez: avisa que só as configurações resolvem', async () => {
    permissao.mockResolvedValue({ granted: false, canAskAgain: false });

    expect(await tirarFoto()).toEqual({ estado: 'negada', podePedirDeNovo: false });
  });

  it('cancelar a câmera não é erro', async () => {
    permissao.mockResolvedValue({ granted: true, canAskAgain: true });
    camera.mockResolvedValue({ canceled: true, assets: null });

    expect(await tirarFoto()).toEqual({ estado: 'cancelado' });
  });

  it('falha na câmera ou na conversão vira "erro", sem lançar', async () => {
    permissao.mockResolvedValue({ granted: true, canAskAgain: true });
    camera.mockRejectedValue(new Error('câmera indisponível'));
    expect(await tirarFoto()).toEqual({ estado: 'erro' });

    camera.mockResolvedValue({ canceled: false, assets: [asset(1)] });
    manipular.mockRejectedValue(new Error('sem memória'));
    expect(await tirarFoto()).toEqual({ estado: 'erro' });
  });
});

describe('escolherDaGaleria: só as que ainda cabem (RN-013)', () => {
  it('pede ao seletor apenas as fotos restantes, em seleção múltipla e sem EXIF', async () => {
    galeria.mockResolvedValue({ canceled: false, assets: [asset(1), asset(2)] });

    const r = await escolherDaGaleria(2);

    expect(galeria).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 2,
      quality: 1,
      exif: false,
    });
    expect(r.estado === 'ok' && r.fotos).toHaveLength(2);
  });

  it('se o sistema devolver mais do que cabe, fica só com as que cabem', async () => {
    galeria.mockResolvedValue({ canceled: false, assets: [asset(1), asset(2), asset(3)] });

    const r = await escolherDaGaleria(1);

    expect(r.estado === 'ok' && r.fotos).toHaveLength(1);
    expect(manipular).toHaveBeenCalledTimes(1);
  });

  it('sem espaço (0 restantes): nem abre o seletor', async () => {
    expect(await escolherDaGaleria(0)).toEqual({ estado: 'cancelado' });
    expect(galeria).not.toHaveBeenCalled();
  });

  it('cancelar e falhar também não lançam', async () => {
    galeria.mockResolvedValue({ canceled: true, assets: null });
    expect(await escolherDaGaleria(3)).toEqual({ estado: 'cancelado' });

    galeria.mockRejectedValue(new Error('x'));
    expect(await escolherDaGaleria(3)).toEqual({ estado: 'erro' });
  });
});

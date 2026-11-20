import { ErroDeApi } from '@/services/http';
import {
  bairroMaisProximo,
  criarDenuncia,
  listarBairros,
  montarCorpoDaDenuncia,
  nomeDoBairro,
} from './api';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/services/api', () => ({
  http: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}));

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

const dados = {
  tipo: 'SEM_ENERGIA' as const,
  bairroId: 3,
  logradouro: ' Rua das Flores, 10 ',
  cep: '',
  pontoReferencia: '',
  descricao: '',
};

describe('montarCorpoDaDenuncia', () => {
  it('envia só o obrigatório quando o resto está vazio e sem GPS (RN-012)', () => {
    expect(montarCorpoDaDenuncia(dados, null)).toEqual({
      tipo: 'SEM_ENERGIA',
      bairroId: 3,
      logradouro: 'Rua das Flores, 10',
    });
  });

  it('inclui os opcionais preenchidos (aparados) e as coordenadas', () => {
    expect(
      montarCorpoDaDenuncia(
        { ...dados, cep: ' 68500-000 ', pontoReferencia: ' perto da padaria ', descricao: ' oi ' },
        { latitude: -5.37, longitude: -49.12 },
      ),
    ).toEqual({
      tipo: 'SEM_ENERGIA',
      bairroId: 3,
      logradouro: 'Rua das Flores, 10',
      cep: '68500-000',
      pontoReferencia: 'perto da padaria',
      descricao: 'oi',
      latitude: -5.37,
      longitude: -49.12,
    });
  });
});

describe('chamadas à API', () => {
  it('criarDenuncia faz POST /denuncias e devolve o protocolo', async () => {
    mockPost.mockResolvedValue({ id: 'd1', protocolo: 'TL-2026-000001' });

    const resultado = await criarDenuncia(dados, null);

    expect(mockPost).toHaveBeenCalledWith('/denuncias', expect.objectContaining({ bairroId: 3 }));
    expect(resultado.protocolo).toBe('TL-2026-000001');
  });

  it('criarDenuncia repassa o erro da API', async () => {
    const erro = new ErroDeApi('DENUNCIA_EM_ABERTO', 'Já tem.', 409, undefined, {
      denunciaEmAbertoId: 'd9',
    });
    mockPost.mockRejectedValue(erro);

    await expect(criarDenuncia(dados, null)).rejects.toBe(erro);
  });

  it('listarBairros devolve só a lista', async () => {
    mockGet.mockResolvedValue({ bairros: [{ id: 1, nome: 'Cidade Nova', folha: null }] });

    expect(await listarBairros()).toEqual([{ id: 1, nome: 'Cidade Nova', folha: null }]);
    expect(mockGet).toHaveBeenCalledWith('/bairros');
  });

  it('bairroMaisProximo envia lat/lng', async () => {
    mockGet.mockResolvedValue({ id: 1, nome: 'Cidade Nova', distanciaKm: 0.4 });

    await bairroMaisProximo({ latitude: -5.37, longitude: -49.12 });

    expect(mockGet).toHaveBeenCalledWith('/bairros/proximo', { lat: -5.37, lng: -49.12 });
  });

  it('bairroMaisProximo devolve null quando está longe de qualquer bairro (404)', async () => {
    mockGet.mockRejectedValue(new ErroDeApi('NAO_ENCONTRADO', 'Nenhum bairro.', 404));

    expect(await bairroMaisProximo({ latitude: 0, longitude: 0 })).toBeNull();
  });

  it('bairroMaisProximo não esconde outros erros', async () => {
    const erro = new ErroDeApi('ERRO_INTERNO', 'Falha.', 500);
    mockGet.mockRejectedValue(erro);

    await expect(bairroMaisProximo({ latitude: 0, longitude: 0 })).rejects.toBe(erro);
  });
});

describe('nomeDoBairro', () => {
  it('junta bairro e folha', () => {
    expect(nomeDoBairro({ nome: 'Nova Marabá', folha: 'Folha 28' })).toBe('Nova Marabá (Folha 28)');
    expect(nomeDoBairro({ nome: 'Cidade Nova', folha: null })).toBe('Cidade Nova');
  });
});

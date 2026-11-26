import {
  atualizarPerfil,
  entrar,
  excluirConta,
  garantirContaDeCidadao,
  registrar,
} from '@/features/auth/api';
import { ErroDeApi } from '@/services/http';
import type { DadosDeSessao } from '@/store/session';
import { VERSAO_TERMOS } from '@/config/constants';

const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/services/api', () => ({
  http: {
    post: (...argumentos: unknown[]) => mockPost(...argumentos),
    patch: (...argumentos: unknown[]) => mockPatch(...argumentos),
    delete: (...argumentos: unknown[]) => mockDelete(...argumentos),
  },
}));

const cidadao: DadosDeSessao = {
  token: 'token.do.cidadao',
  usuario: {
    id: 'u1',
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    telefone: null,
    papel: 'CIDADAO',
  },
};
const operador: DadosDeSessao = {
  token: 'token.do.operador',
  usuario: {
    id: 'u2',
    nome: 'Carlos',
    email: 'carlos@equatorial.com',
    telefone: null,
    papel: 'OPERADOR',
  },
};

const cadastro = {
  nome: 'Maria Silva',
  email: 'maria@exemplo.com',
  telefone: '(94) 90000-0000',
  senha: 'minhasenha1',
  confirmarSenha: 'minhasenha1',
  aceiteTermos: true,
};

beforeEach(() => mockPost.mockReset());

describe('registrar (RF-001, RF-002)', () => {
  it('envia o cadastro para /auth/register com o consentimento e a versão dos termos', async () => {
    mockPost.mockResolvedValue(cidadao);

    const sessao = await registrar(cadastro);

    expect(sessao).toEqual(cidadao);
    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      senha: 'minhasenha1',
      telefone: '(94) 90000-0000',
      aceiteTermos: true,
      versaoTermos: VERSAO_TERMOS,
    });
  });

  it('não envia a confirmação de senha', async () => {
    mockPost.mockResolvedValue(cidadao);
    await registrar(cadastro);

    expect(JSON.stringify(mockPost.mock.calls[0]![1])).not.toContain('confirmarSenha');
  });

  it.each(['', '   '])(
    'telefone em branco ("%s") não vai para a API (é opcional)',
    async (telefone) => {
      mockPost.mockResolvedValue(cidadao);
      await registrar({ ...cadastro, telefone });

      expect(mockPost.mock.calls[0]![1]).not.toHaveProperty('telefone');
    },
  );

  it('remove espaços do telefone', async () => {
    mockPost.mockResolvedValue(cidadao);
    await registrar({ ...cadastro, telefone: '  (94) 90000-0000  ' });

    expect(mockPost.mock.calls[0]![1].telefone).toBe('(94) 90000-0000');
  });

  it('repassa o erro da API (ex.: e-mail já cadastrado)', async () => {
    const erro = new ErroDeApi('EMAIL_JA_CADASTRADO', 'E-mail já cadastrado.', 409);
    mockPost.mockRejectedValue(erro);

    await expect(registrar(cadastro)).rejects.toBe(erro);
  });
});

describe('entrar (RF-003)', () => {
  it('envia e-mail e senha para /auth/login e devolve a sessão', async () => {
    mockPost.mockResolvedValue(cidadao);

    const sessao = await entrar({ email: 'maria@exemplo.com', senha: 'minhasenha1' });

    expect(sessao).toEqual(cidadao);
    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'maria@exemplo.com',
      senha: 'minhasenha1',
    });
  });

  it('repassa credenciais inválidas', async () => {
    const erro = new ErroDeApi('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.', 401);
    mockPost.mockRejectedValue(erro);

    await expect(entrar({ email: 'a@b.com', senha: 'x' })).rejects.toBe(erro);
  });
});

describe('conta de operador no app do cidadão (RF-003, ADR-0001)', () => {
  it('o login de um operador é recusado com instrução para usar o painel', async () => {
    mockPost.mockResolvedValue(operador);

    await expect(entrar({ email: 'carlos@equatorial.com', senha: 'x' })).rejects.toMatchObject({
      codigo: 'PAPEL_INCORRETO',
      message: expect.stringContaining('painel da operadora'),
    });
  });

  it('o cadastro também não aceita uma resposta de operador', async () => {
    mockPost.mockResolvedValue(operador);

    await expect(registrar(cadastro)).rejects.toMatchObject({ codigo: 'PAPEL_INCORRETO' });
  });

  it('garantirContaDeCidadao deixa o cidadão passar e barra o operador', () => {
    expect(garantirContaDeCidadao(cidadao)).toBe(cidadao);
    expect(() => garantirContaDeCidadao(operador)).toThrow(ErroDeApi);
  });
});

describe('atualizarPerfil (RF-005)', () => {
  it('faz PATCH /me só com nome e telefone (o e-mail nunca vai) e devolve o usuário', async () => {
    mockPatch.mockResolvedValue({ ...cidadao.usuario, nome: 'Maria Souza' });

    const usuario = await atualizarPerfil({ nome: 'Maria Souza', telefone: '' });

    expect(mockPatch).toHaveBeenCalledWith('/me', { nome: 'Maria Souza', telefone: '' });
    expect(usuario.nome).toBe('Maria Souza');
  });
});

describe('excluirConta (RF-006, S-59)', () => {
  it('faz DELETE /me com a senha atual no corpo', async () => {
    mockDelete.mockResolvedValue(null);

    await expect(excluirConta('minhasenha1')).resolves.toBeUndefined();

    expect(mockDelete).toHaveBeenCalledWith('/me', { senha: 'minhasenha1' });
  });

  it('repassa o erro da API (ex.: SENHA_INCORRETA)', async () => {
    const erro = new ErroDeApi('SENHA_INCORRETA', 'Senha incorreta.', 403);
    mockDelete.mockRejectedValue(erro);

    await expect(excluirConta('errada')).rejects.toBe(erro);
  });
});

import type { Armazenamento } from '@/services/armazenamento';
import { CHAVE_DA_SESSAO, criarSessao, type DadosDeSessao } from '@/store/session';

/** Armazenamento em memória, com como forçar falhas. */
function armazenamentoFalso(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial));
  const falhas = { ler: false, gravar: false, remover: false };
  const armazenamento: Armazenamento = {
    ler: async (chave) => {
      if (falhas.ler) throw new Error('disco indisponível');
      return dados.get(chave) ?? null;
    },
    gravar: async (chave, valor) => {
      if (falhas.gravar) throw new Error('disco cheio');
      dados.set(chave, valor);
    },
    remover: async (chave) => {
      if (falhas.remover) throw new Error('disco indisponível');
      dados.delete(chave);
    },
  };
  return { armazenamento, dados, falhas };
}

const sessao: DadosDeSessao = {
  token: 'token.jwt.aqui',
  usuario: {
    id: 'u1',
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    telefone: '(94) 90000-0000',
    papel: 'CIDADAO',
  },
};

describe('sessão (RF-003, RF-004, RNF-013)', () => {
  it('começa sem sessão e ainda não hidratada', () => {
    const { armazenamento } = armazenamentoFalso();
    const estado = criarSessao(armazenamento).getState();

    expect(estado).toMatchObject({ token: null, usuario: null, hidratada: false });
  });

  describe('hidratar (ao abrir o app)', () => {
    it('sem nada salvo: fica sem sessão e marca como hidratada', async () => {
      const { armazenamento } = armazenamentoFalso();
      const store = criarSessao(armazenamento);

      await store.getState().hidratar();

      expect(store.getState()).toMatchObject({ token: null, usuario: null, hidratada: true });
    });

    it('restaura a sessão salva', async () => {
      const { armazenamento } = armazenamentoFalso({ [CHAVE_DA_SESSAO]: JSON.stringify(sessao) });
      const store = criarSessao(armazenamento);

      await store.getState().hidratar();

      expect(store.getState()).toMatchObject({
        token: sessao.token,
        usuario: sessao.usuario,
        hidratada: true,
      });
    });

    it('telefone ausente vira null', async () => {
      const { telefone: _telefone, ...semTelefone } = sessao.usuario;
      const { armazenamento } = armazenamentoFalso({
        [CHAVE_DA_SESSAO]: JSON.stringify({ token: 't', usuario: semTelefone }),
      });
      const store = criarSessao(armazenamento);

      await store.getState().hidratar();

      expect(store.getState().usuario?.telefone).toBeNull();
    });

    it.each([
      ['JSON corrompido', '{isso nao e json'],
      ['sem token', JSON.stringify({ usuario: sessao.usuario })],
      ['token vazio', JSON.stringify({ token: '', usuario: sessao.usuario })],
      ['sem usuário', JSON.stringify({ token: 't' })],
      [
        'papel desconhecido',
        JSON.stringify({ token: 't', usuario: { ...sessao.usuario, papel: 'ADMIN' } }),
      ],
      [
        'usuário sem id',
        JSON.stringify({ token: 't', usuario: { ...sessao.usuario, id: undefined } }),
      ],
      ['valor que não é objeto', JSON.stringify('texto')],
      ['null', 'null'],
    ])('descarta e apaga uma sessão salva com %s', async (_nome, salvo) => {
      const { armazenamento, dados } = armazenamentoFalso({ [CHAVE_DA_SESSAO]: salvo });
      const store = criarSessao(armazenamento);

      await store.getState().hidratar();

      expect(store.getState()).toMatchObject({ token: null, usuario: null, hidratada: true });
      expect(dados.has(CHAVE_DA_SESSAO)).toBe(false);
    });

    it('se o armazenamento falhar ao ler, segue sem sessão (e o app abre)', async () => {
      const { armazenamento, falhas } = armazenamentoFalso({
        [CHAVE_DA_SESSAO]: JSON.stringify(sessao),
      });
      falhas.ler = true;
      const store = criarSessao(armazenamento);

      await store.getState().hidratar();

      expect(store.getState()).toMatchObject({ token: null, hidratada: true });
    });
  });

  describe('entrar', () => {
    it('guarda a sessão em memória e no armazenamento seguro', async () => {
      const { armazenamento, dados } = armazenamentoFalso();
      const store = criarSessao(armazenamento);

      await store.getState().entrar(sessao);

      expect(store.getState()).toMatchObject({ token: sessao.token, usuario: sessao.usuario });
      expect(JSON.parse(dados.get(CHAVE_DA_SESSAO)!)).toEqual(sessao);
    });

    it('depois de entrar, uma nova abertura do app recupera a sessão', async () => {
      const { armazenamento } = armazenamentoFalso();
      await criarSessao(armazenamento).getState().entrar(sessao);

      const outroProcesso = criarSessao(armazenamento);
      await outroProcesso.getState().hidratar();

      expect(outroProcesso.getState().usuario?.email).toBe('maria@exemplo.com');
    });

    it('se não conseguir gravar, o erro aparece (não finge que entrou)', async () => {
      const { armazenamento, falhas } = armazenamentoFalso();
      falhas.gravar = true;
      const store = criarSessao(armazenamento);

      await expect(store.getState().entrar(sessao)).rejects.toThrow('disco cheio');
      expect(store.getState().token).toBeNull();
    });
  });

  describe('sair (RF-004)', () => {
    it('limpa a memória e apaga o token do aparelho', async () => {
      const { armazenamento, dados } = armazenamentoFalso();
      const store = criarSessao(armazenamento);
      await store.getState().entrar(sessao);

      await store.getState().sair();

      expect(store.getState()).toMatchObject({ token: null, usuario: null });
      expect(dados.has(CHAVE_DA_SESSAO)).toBe(false);
    });

    it('mesmo que o disco falhe, o usuário sai (o token em memória é descartado)', async () => {
      const { armazenamento, falhas } = armazenamentoFalso();
      const store = criarSessao(armazenamento);
      await store.getState().entrar(sessao);
      falhas.remover = true;

      await expect(store.getState().sair()).resolves.toBeUndefined();

      expect(store.getState().token).toBeNull();
    });

    it('limpa o estado antes de mexer no disco (a tela de login aparece na hora)', async () => {
      const { armazenamento } = armazenamentoFalso();
      const store = criarSessao(armazenamento);
      await store.getState().entrar(sessao);

      const promessa = store.getState().sair();
      expect(store.getState().token).toBeNull(); // antes mesmo de a promessa terminar
      await promessa;
    });
  });
});

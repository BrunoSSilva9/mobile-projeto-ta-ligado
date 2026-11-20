import { criarHttp, ErroDeApi, MENSAGENS } from '@/services/http';

type CorpoSimulado = unknown;

function resposta(status: number, corpo: CorpoSimulado): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as unknown as Response;
}

const respostaSemJson = (status: number): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    },
  }) as unknown as Response;

const erroDaApi = (codigo: string, mensagem: string, extra: Record<string, unknown> = {}) => ({
  erro: { codigo, mensagem, ...extra },
});

function criar(
  fetchImpl: jest.Mock,
  opcoes: {
    token?: string | null;
    aoNaoAutenticado?: jest.Mock;
    timeoutMs?: number;
    baseUrl?: string;
  } = {},
) {
  const aoNaoAutenticado = opcoes.aoNaoAutenticado ?? jest.fn();
  const http = criarHttp({
    baseUrl: opcoes.baseUrl ?? 'http://api.teste:3000',
    obterToken: () => opcoes.token ?? null,
    aoNaoAutenticado,
    timeoutMs: opcoes.timeoutMs,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { http, aoNaoAutenticado };
}

describe('cliente HTTP: requisições', () => {
  it('chama /api/v1 no endereço do servidor e devolve o JSON', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resposta(200, { ok: true }));
    const { http } = criar(fetchImpl);

    await expect(http.get('/me')).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.teste:3000/api/v1/me',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('ignora barras no fim do endereço do servidor', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resposta(200, {}));
    const { http } = criar(fetchImpl, { baseUrl: 'http://api.teste:3000///' });

    await http.get('/me');
    expect(fetchImpl.mock.calls[0]![0]).toBe('http://api.teste:3000/api/v1/me');
  });

  it('monta a query string, codifica os valores e ignora os vazios', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resposta(200, {}));
    const { http } = criar(fetchImpl);

    await http.get('/ocorrencias', {
      q: 'Folha 28',
      status: undefined,
      vazio: '',
      page: 2,
      ok: true,
    });

    expect(fetchImpl.mock.calls[0]![0]).toBe(
      'http://api.teste:3000/api/v1/ocorrencias?q=Folha%2028&page=2&ok=true',
    );
  });

  it('POST envia o corpo em JSON com o Content-Type correto', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resposta(201, { id: '1' }));
    const { http } = criar(fetchImpl);

    await http.post('/denuncias', { tipo: 'SEM_ENERGIA' });

    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ tipo: 'SEM_ENERGIA' });
  });

  it('GET não envia corpo nem Content-Type', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(resposta(200, {}));
    const { http } = criar(fetchImpl);

    await http.get('/me');

    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init.body).toBeUndefined();
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('envia o token da sessão em Authorization (e só quando há token)', async () => {
    const comToken = jest.fn().mockResolvedValue(resposta(200, {}));
    await criar(comToken, { token: 'abc.def' }).http.get('/me');
    expect(comToken.mock.calls[0]![1].headers.Authorization).toBe('Bearer abc.def');

    const semToken = jest.fn().mockResolvedValue(resposta(200, {}));
    await criar(semToken).http.get('/me');
    expect(semToken.mock.calls[0]![1].headers.Authorization).toBeUndefined();
  });
});

describe('cliente HTTP: erros em português (RNF-005)', () => {
  it('converte o erro da API em ErroDeApi, com código, mensagem, status, detalhes e dados', async () => {
    const corpo = erroDaApi('DENUNCIA_EM_ABERTO', 'Você já tem uma denúncia em aberto.', {
      detalhes: [{ campo: 'tipo', mensagem: 'Obrigatório' }],
      dados: { denunciaEmAbertoId: 'uuid-1' },
    });
    const { http } = criar(jest.fn().mockResolvedValue(resposta(409, corpo)));

    const erro = (await http.post('/denuncias', {}).catch((e) => e)) as ErroDeApi;

    expect(erro).toBeInstanceOf(ErroDeApi);
    expect(erro).toMatchObject({
      codigo: 'DENUNCIA_EM_ABERTO',
      message: 'Você já tem uma denúncia em aberto.',
      status: 409,
      detalhes: [{ campo: 'tipo', mensagem: 'Obrigatório' }],
      dados: { denunciaEmAbertoId: 'uuid-1' },
    });
    expect(erro.ehFalhaDeRede).toBe(false);
  });

  describe('sessão expirada', () => {
    it('com token, NAO_AUTENTICADO avisa o app para sair e ainda lança o erro', async () => {
      const aoNaoAutenticado = jest.fn();
      const { http } = criar(
        jest
          .fn()
          .mockResolvedValue(
            resposta(401, erroDaApi('NAO_AUTENTICADO', 'Sessão inválida ou expirada.')),
          ),
        { token: 'velho', aoNaoAutenticado },
      );

      await expect(http.get('/me')).rejects.toMatchObject({
        codigo: 'NAO_AUTENTICADO',
        status: 401,
      });
      expect(aoNaoAutenticado).toHaveBeenCalledTimes(1);
    });

    it('sem token, NAO_AUTENTICADO não dispara o logout (não havia sessão)', async () => {
      const aoNaoAutenticado = jest.fn();
      const { http } = criar(
        jest.fn().mockResolvedValue(resposta(401, erroDaApi('NAO_AUTENTICADO', 'Faça login.'))),
        { aoNaoAutenticado },
      );

      await expect(http.get('/me')).rejects.toBeInstanceOf(ErroDeApi);
      expect(aoNaoAutenticado).not.toHaveBeenCalled();
    });

    it('senha errada no login (401 CREDENCIAIS_INVALIDAS) nunca derruba a sessão', async () => {
      const aoNaoAutenticado = jest.fn();
      const { http } = criar(
        jest
          .fn()
          .mockResolvedValue(
            resposta(401, erroDaApi('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.')),
          ),
        { token: 'qualquer', aoNaoAutenticado },
      );

      await expect(http.post('/auth/login', {})).rejects.toMatchObject({
        codigo: 'CREDENCIAIS_INVALIDAS',
      });
      expect(aoNaoAutenticado).not.toHaveBeenCalled();
    });

    it('um 403 não derruba a sessão', async () => {
      const aoNaoAutenticado = jest.fn();
      const { http } = criar(
        jest
          .fn()
          .mockResolvedValue(
            resposta(403, erroDaApi('SEM_PERMISSAO', 'Você não tem permissão para isso.')),
          ),
        { token: 'valido', aoNaoAutenticado },
      );

      await expect(http.get('/painel/denuncias')).rejects.toMatchObject({
        codigo: 'SEM_PERMISSAO',
      });
      expect(aoNaoAutenticado).not.toHaveBeenCalled();
    });
  });

  it('sem internet: SEM_CONEXAO, status 0 e mensagem clara', async () => {
    const { http } = criar(jest.fn().mockRejectedValue(new TypeError('Network request failed')));

    const erro = (await http.get('/me').catch((e) => e)) as ErroDeApi;

    expect(erro).toBeInstanceOf(ErroDeApi);
    expect(erro).toMatchObject({ codigo: 'SEM_CONEXAO', status: 0, message: MENSAGENS.semConexao });
    expect(erro.ehFalhaDeRede).toBe(true);
  });

  describe('tempo limite (15 s por padrão, RNF-007)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    /** Um `fetch` que nunca responde e rejeita quando a requisição é abortada. */
    const fetchTravado = () =>
      jest.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolver, rejeitar) => {
            init.signal?.addEventListener('abort', () =>
              rejeitar(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
            );
          }),
      );

    it('estoura em 15 s e devolve TEMPO_ESGOTADO', async () => {
      const { http } = criar(fetchTravado() as unknown as jest.Mock);

      const resultado = expect(http.get('/me')).rejects.toMatchObject({
        codigo: 'TEMPO_ESGOTADO',
        status: 0,
        message: MENSAGENS.tempoEsgotado,
      });
      await jest.advanceTimersByTimeAsync(14_999);
      await jest.advanceTimersByTimeAsync(1);
      await resultado;
    });

    it('respeita um tempo limite configurado', async () => {
      const { http } = criar(fetchTravado() as unknown as jest.Mock, { timeoutMs: 500 });

      const resultado = expect(http.get('/me')).rejects.toMatchObject({ codigo: 'TEMPO_ESGOTADO' });
      await jest.advanceTimersByTimeAsync(500);
      await resultado;
    });

    it('não deixa relógio pendente depois de uma resposta rápida', async () => {
      const { http } = criar(jest.fn().mockResolvedValue(resposta(200, {})));

      await http.get('/me');
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('respostas fora do formato da API', () => {
    it('página de erro (502, HTML): mensagem genérica do servidor', async () => {
      const { http } = criar(jest.fn().mockResolvedValue(respostaSemJson(502)));

      await expect(http.get('/me')).rejects.toMatchObject({
        codigo: 'ERRO_INTERNO',
        message: MENSAGENS.erroDoServidor,
        status: 502,
      });
    });

    it('4xx sem o corpo da API: mensagem genérica', async () => {
      const { http } = criar(jest.fn().mockResolvedValue(respostaSemJson(404)));

      await expect(http.get('/x')).rejects.toMatchObject({
        codigo: 'ERRO_DESCONHECIDO',
        message: MENSAGENS.erroGenerico,
        status: 404,
      });
    });

    it('JSON com formato inesperado em um 500', async () => {
      const { http } = criar(jest.fn().mockResolvedValue(resposta(500, { qualquer: 'coisa' })));

      await expect(http.get('/x')).rejects.toMatchObject({ codigo: 'ERRO_INTERNO', status: 500 });
    });

    it('as mensagens padrão estão em português e não expõem detalhes técnicos', () => {
      for (const mensagem of Object.values(MENSAGENS)) {
        expect(mensagem).not.toMatch(/network|failed|undefined|error|json/i);
      }
    });
  });
});

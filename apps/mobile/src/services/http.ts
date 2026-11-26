export type DetalheDeErro = { campo?: string; mensagem: string };

/**
 * Erro normalizado de qualquer chamada à API (RNF-005): sempre tem um código estável e uma
 * mensagem em português que pode ser mostrada ao usuário.
 *
 * Códigos do servidor (docs/10-api.md): VALIDACAO_ERRO, NAO_AUTENTICADO, CREDENCIAIS_INVALIDAS,
 * SEM_PERMISSAO, NAO_ENCONTRADO, EMAIL_JA_CADASTRADO, DENUNCIA_EM_ABERTO, TRANSICAO_INVALIDA,
 * MUITAS_REQUISICOES, ERRO_INTERNO. Códigos criados no app: SEM_CONEXAO e TEMPO_ESGOTADO.
 */
export class ErroDeApi extends Error {
  constructor(
    public readonly codigo: string,
    mensagem: string,
    /** Status HTTP; `0` quando a requisição nem chegou ao servidor. */
    public readonly status: number,
    public readonly detalhes?: DetalheDeErro[],
    public readonly dados?: Record<string, unknown>,
  ) {
    super(mensagem);
    this.name = 'ErroDeApi';
  }

  /** Falha de rede ou tempo esgotado (vale tentar de novo; não é erro do usuário). */
  get ehFalhaDeRede(): boolean {
    return this.status === 0;
  }
}

export const MENSAGENS = {
  semConexao: 'Sem conexão. Verifique sua internet e tente de novo.',
  tempoEsgotado: 'A conexão demorou demais. Tente novamente.',
  erroDoServidor: 'Algo deu errado do nosso lado. Tente novamente em instantes.',
  erroGenerico: 'Não foi possível concluir a operação. Tente novamente.',
} as const;

export type OpcoesDoHttp = {
  /** Endereço do servidor, sem o `/api/v1` (ex.: `http://192.168.0.10:3000`). */
  baseUrl: string;
  /** Token da sessão; `null` quando não há login. */
  obterToken: () => string | null;
  /** Chamado quando o servidor recusa o token da sessão (expirado ou conta removida). */
  aoNaoAutenticado: () => void;
  /** Padrão: 15 s (docs/13, RNF-007). */
  timeoutMs?: number;
  /** Tempo limite dos envios com arquivos (fotos), que demoram mais. Padrão: 60 s. */
  timeoutDeArquivosMs?: number;
  /** Troca o `fetch` (testes). */
  fetchImpl?: typeof fetch;
};

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Monta o erro a partir de uma resposta que não foi 2xx. */
function erroDaResposta(status: number, corpo: unknown): ErroDeApi {
  const erro = (corpo as { erro?: unknown } | null)?.erro as
    | {
        codigo?: unknown;
        mensagem?: unknown;
        detalhes?: DetalheDeErro[];
        dados?: Record<string, unknown>;
      }
    | undefined;

  if (erro && typeof erro.codigo === 'string' && typeof erro.mensagem === 'string') {
    return new ErroDeApi(erro.codigo, erro.mensagem, status, erro.detalhes, erro.dados);
  }
  // Resposta fora do formato da API (ex.: página de erro de um proxy).
  return status >= 500
    ? new ErroDeApi('ERRO_INTERNO', MENSAGENS.erroDoServidor, status)
    : new ErroDeApi('ERRO_DESCONHECIDO', MENSAGENS.erroGenerico, status);
}

/** Cliente HTTP da API: token, tempo limite de 15 s e erros normalizados. */
export function criarHttp(opcoes: OpcoesDoHttp) {
  const {
    baseUrl,
    obterToken,
    aoNaoAutenticado,
    timeoutMs = 15_000,
    timeoutDeArquivosMs = 60_000,
    fetchImpl,
  } = opcoes;
  const raiz = `${baseUrl.replace(/\/+$/, '')}/api/v1`;

  async function requisitar<T>(
    metodo: Metodo,
    caminho: string,
    corpo?: unknown,
    consulta?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const token = obterToken();
    const parametros = consulta
      ? Object.entries(consulta)
          .filter(([, valor]) => valor !== undefined && valor !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    const url = `${raiz}${caminho}${parametros ? `?${parametros}` : ''}`;

    // `FormData` (envio com fotos): o `Content-Type` NÃO é definido à mão, para o fetch incluir o
    // `boundary` do multipart sozinho.
    const ehFormulario = typeof FormData !== 'undefined' && corpo instanceof FormData;
    const controle = new AbortController();
    const relogio = setTimeout(
      () => controle.abort(),
      ehFormulario ? timeoutDeArquivosMs : timeoutMs,
    );

    let resposta: Response;
    try {
      resposta = await (fetchImpl ?? fetch)(url, {
        method: metodo,
        headers: {
          Accept: 'application/json',
          ...(corpo !== undefined && !ehFormulario ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:
          corpo === undefined
            ? undefined
            : ehFormulario
              ? (corpo as FormData)
              : JSON.stringify(corpo),
        signal: controle.signal,
      });
    } catch (erro) {
      if (controle.signal.aborted || (erro as { name?: string })?.name === 'AbortError') {
        throw new ErroDeApi('TEMPO_ESGOTADO', MENSAGENS.tempoEsgotado, 0);
      }
      throw new ErroDeApi('SEM_CONEXAO', MENSAGENS.semConexao, 0);
    } finally {
      clearTimeout(relogio);
    }

    let json: unknown = null;
    try {
      json = await resposta.json();
    } catch {
      // Corpo vazio ou que não é JSON: tratado abaixo, conforme o status.
    }

    if (!resposta.ok) {
      const erro = erroDaResposta(resposta.status, json);
      // Só desconecta se havia sessão: um 401 do login (senha errada) não é sessão expirada.
      if (token && erro.codigo === 'NAO_AUTENTICADO') aoNaoAutenticado();
      throw erro;
    }
    return json as T;
  }

  return {
    get: <T>(caminho: string, consulta?: Record<string, string | number | boolean | undefined>) =>
      requisitar<T>('GET', caminho, undefined, consulta),
    post: <T>(caminho: string, corpo?: unknown) => requisitar<T>('POST', caminho, corpo ?? {}),
    patch: <T>(caminho: string, corpo?: unknown) => requisitar<T>('PATCH', caminho, corpo ?? {}),
    delete: <T>(caminho: string) => requisitar<T>('DELETE', caminho),
  };
}

export type Http = ReturnType<typeof criarHttp>;

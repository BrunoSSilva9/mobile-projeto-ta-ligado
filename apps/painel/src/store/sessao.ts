import { create } from 'zustand';

export type UsuarioDaSessao = {
  id: string;
  nome: string;
  email: string;
  papel: 'CIDADAO' | 'OPERADOR';
};

export type DadosDeSessao = { token: string; usuario: UsuarioDaSessao };

export const CHAVE_DA_SESSAO = 'taligado.painel.sessao';

/** Lê o `exp` do JWT (sem validar a assinatura: quem valida é o servidor). */
export function tokenExpirado(token: string, agoraMs: number = Date.now()): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
      exp?: unknown;
    };
    return typeof json.exp !== 'number' || json.exp * 1000 <= agoraMs;
  } catch {
    return true;
  }
}

function armazenamento(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null; // modo privado ou bloqueado: a sessão fica só em memória
  }
}

/** Confere o que foi salvo; qualquer coisa estranha ou expirada é descartada. */
export function lerSessaoSalva(texto: string | null, agoraMs: number = Date.now()) {
  if (!texto) return null;
  try {
    const dados = JSON.parse(texto) as Partial<DadosDeSessao> | null;
    const u = dados?.usuario;
    if (
      typeof dados?.token === 'string' &&
      u &&
      typeof u.id === 'string' &&
      typeof u.nome === 'string' &&
      typeof u.email === 'string' &&
      u.papel === 'OPERADOR' &&
      !tokenExpirado(dados.token, agoraMs)
    ) {
      return { token: dados.token, usuario: u } as DadosDeSessao;
    }
  } catch {
    // JSON corrompido: trata como "sem sessão".
  }
  return null;
}

type Estado = {
  token: string | null;
  usuario: UsuarioDaSessao | null;
  entrar(dados: DadosDeSessao): void;
  sair(): void;
};

/**
 * Sessão do operador. O token fica em `sessionStorage` (some ao fechar a aba) e nunca em
 * `localStorage` (ADR-0004). Só o papel OPERADOR é aceito.
 */
export const useSessao = create<Estado>((set) => {
  const salva = lerSessaoSalva(armazenamento()?.getItem(CHAVE_DA_SESSAO) ?? null);
  if (!salva) armazenamento()?.removeItem(CHAVE_DA_SESSAO);
  return {
    token: salva?.token ?? null,
    usuario: salva?.usuario ?? null,
    entrar: (dados) => {
      armazenamento()?.setItem(CHAVE_DA_SESSAO, JSON.stringify(dados));
      set({ token: dados.token, usuario: dados.usuario });
    },
    sair: () => {
      armazenamento()?.removeItem(CHAVE_DA_SESSAO);
      set({ token: null, usuario: null });
    },
  };
});

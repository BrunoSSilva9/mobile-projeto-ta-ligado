import { create } from 'zustand';

import { armazenamentoSeguro, type Armazenamento } from '@/services/armazenamento';

export type UsuarioDaSessao = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  papel: 'CIDADAO' | 'OPERADOR';
};

export type DadosDeSessao = {
  token: string;
  usuario: UsuarioDaSessao;
};

export type EstadoDaSessao = {
  token: string | null;
  usuario: UsuarioDaSessao | null;
  /** `false` até o app terminar de ler o armazenamento seguro ao abrir. */
  hidratada: boolean;
  /** Lê a sessão salva (chame uma vez ao abrir o app). */
  hidratar(): Promise<void>;
  /** Guarda a sessão depois de um login ou cadastro. */
  entrar(dados: DadosDeSessao): Promise<void>;
  /** Troca os dados do usuário da sessão (depois de editar o perfil), mantendo o token. */
  atualizarUsuario(usuario: UsuarioDaSessao): Promise<void>;
  /** Encerra a sessão e apaga o token do aparelho (RF-004). */
  sair(): Promise<void>;
};

export const CHAVE_DA_SESSAO = 'taligado.sessao';

/** Confere o formato do que foi lido do disco; qualquer coisa estranha é descartada. */
function lerSessaoSalva(texto: string | null): DadosDeSessao | null {
  if (!texto) return null;
  try {
    const dados = JSON.parse(texto) as Partial<DadosDeSessao> | null;
    const usuario = dados?.usuario;
    if (
      typeof dados?.token === 'string' &&
      dados.token !== '' &&
      usuario &&
      typeof usuario.id === 'string' &&
      typeof usuario.nome === 'string' &&
      typeof usuario.email === 'string' &&
      (usuario.papel === 'CIDADAO' || usuario.papel === 'OPERADOR')
    ) {
      return { token: dados.token, usuario: { ...usuario, telefone: usuario.telefone ?? null } };
    }
  } catch {
    // JSON corrompido: trata como "sem sessão".
  }
  return null;
}

/** Cria a store da sessão. Em produção usa o SecureStore; nos testes, um armazenamento em memória. */
export function criarSessao(armazenamento: Armazenamento) {
  return create<EstadoDaSessao>((set, get) => ({
    token: null,
    usuario: null,
    hidratada: false,

    async hidratar() {
      let salva: DadosDeSessao | null = null;
      try {
        salva = lerSessaoSalva(await armazenamento.ler(CHAVE_DA_SESSAO));
        if (!salva) await armazenamento.remover(CHAVE_DA_SESSAO);
      } catch {
        // Falha ao ler o armazenamento (ex.: dados do app limpos): segue sem sessão.
      }
      set({ token: salva?.token ?? null, usuario: salva?.usuario ?? null, hidratada: true });
    },

    async entrar(dados) {
      await armazenamento.gravar(CHAVE_DA_SESSAO, JSON.stringify(dados));
      set({ token: dados.token, usuario: dados.usuario, hidratada: true });
    },

    async atualizarUsuario(usuario) {
      const { token } = get();
      if (!token) return; // sem sessão não há o que atualizar
      set({ usuario });
      try {
        await armazenamento.gravar(CHAVE_DA_SESSAO, JSON.stringify({ token, usuario }));
      } catch {
        // O estado em memória já mudou; na próxima abertura o app lê os dados da API de novo.
      }
    },

    async sair() {
      // Limpa o estado primeiro: a tela de login aparece na hora, mesmo se o disco falhar.
      set({ token: null, usuario: null });
      try {
        await armazenamento.remover(CHAVE_DA_SESSAO);
      } catch {
        // O token em memória já foi descartado; nada mais a fazer.
      }
    },
  }));
}

/** Sessão do app (usa o armazenamento seguro do aparelho). */
export const useSessao = criarSessao(armazenamentoSeguro);

import { create } from 'zustand';

/**
 * Mensagem que a tela de login mostra uma vez, vinda de quem acabou de sair (ex.: "Sua conta foi
 * excluída."). Fica fora da navegação porque, ao encerrar a sessão, o roteador troca de tela sozinho
 * e os parâmetros da rota se perderiam.
 */
export const useAvisoDeEntrada = create<{
  mensagem: string | null;
  definir: (mensagem: string) => void;
  limpar: () => void;
}>((set) => ({
  mensagem: null,
  definir: (mensagem) => set({ mensagem }),
  limpar: () => set({ mensagem: null }),
}));

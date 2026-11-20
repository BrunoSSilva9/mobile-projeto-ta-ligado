import { QueryClient } from '@tanstack/react-query';

import { ErroDeApi } from './http';

/**
 * Cache de dados do servidor (TanStack Query). Leituras tentam de novo até 2 vezes, mas só quando
 * o problema pode passar sozinho (rede ou erro 5xx): um 4xx (login, validação, 404) não melhora
 * repetindo. Envios (mutations) nunca repetem sozinhos, para não duplicar uma denúncia (ADR-0005).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Os dados salvos no aparelho valem 24 h (ADR-0005); o cache em memória precisa durar o mesmo.
      gcTime: 24 * 60 * 60 * 1000,
      retry: (tentativas, erro) => {
        if (tentativas >= 2) return false;
        return !(erro instanceof ErroDeApi) || erro.ehFalhaDeRede || erro.status >= 500;
      },
    },
    // `always`: sem rede o envio falha na hora ("Sem conexão") em vez de ficar em pausa e disparar
    // sozinho quando a rede voltar (uma denúncia tardia ou duplicada, ADR-0005).
    mutations: { retry: false, networkMode: 'always' },
  },
});

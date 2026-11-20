import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { opcoesDePersistencia } from '@/services/persistencia';
import { queryClient } from '@/services/query-client';

/**
 * Cache de dados do app. Em produção ele é salvo no aparelho (leitura offline, ADR-0005); nos
 * testes fica só em memória, porque o salvamento agenda temporizadores e o Jest não encerraria.
 */
export function ProvedorDeCache({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'test') {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={opcoesDePersistencia}>
      {children}
    </PersistQueryClientProvider>
  );
}

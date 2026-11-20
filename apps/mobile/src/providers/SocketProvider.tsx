import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  aplicarEventoDeStatus,
  eventoDeStatusValido,
  refazerConsultasDeDenuncias,
} from '@/features/acompanhamento/cache';
import {
  aplicarStatusDoBairro,
  atualizarListaDeOcorrencias,
  eventoDoBairroValido,
  refazerConsultasPublicas,
} from '@/features/ocorrencias/cache';
import { encerrarSessao } from '@/services/api';
import { conectarSocket, type EstadoDaConexao } from '@/services/socket';
import { useSessao } from '@/store/session';

const ConexaoContext = createContext<EstadoDaConexao>('conectando');

/** Estado da conexão em tempo real, para telas mostrarem "Reconectando…". */
export const useEstadoDaConexao = () => useContext(ConexaoContext);

/**
 * Mantém o WebSocket aberto enquanto há sessão (RF-024). Cada evento de status vai para o cache do
 * TanStack Query; ao reconectar, as consultas de denúncias são refeitas (RNF-009). Ao sair da conta
 * o provider deixa de existir e a conexão é encerrada.
 */
export function SocketProvider({ children }: { children: ReactNode }) {
  const token = useSessao((s) => s.token);
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoDaConexao>('conectando');

  useEffect(() => {
    if (!token) return;

    const socket = conectarSocket({
      token,
      aoConectar: (reconectou) => {
        setEstado('conectado');
        if (reconectou) {
          void refazerConsultasDeDenuncias(queryClient);
          void refazerConsultasPublicas(queryClient);
        }
      },
      aoCair: () => setEstado((atual) => (atual === 'conectando' ? atual : 'reconectando')),
      aoSerRecusado: () => void encerrarSessao(),
    });

    socket.on('denuncia:status-atualizado', (bruto: unknown) => {
      const evento = eventoDeStatusValido(bruto);
      if (evento) aplicarEventoDeStatus(queryClient, evento);
    });

    // Visão pública (RF-023): o selo e o círculo do bairro mudam na hora; a lista é buscada de novo.
    socket.on('bairro:status-atualizado', (bruto: unknown) => {
      const evento = eventoDoBairroValido(bruto);
      if (evento) aplicarStatusDoBairro(queryClient, evento);
    });
    socket.on('ocorrencia:atualizada', () => {
      void atualizarListaDeOcorrencias(queryClient);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token, queryClient]);

  return <ConexaoContext.Provider value={estado}>{children}</ConexaoContext.Provider>;
}

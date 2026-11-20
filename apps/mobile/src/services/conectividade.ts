import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { focusManager, onlineManager, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Aparelho com rede? `isInternetReachable === false` (sinal sem internet) também conta como offline. */
export function estaOnline(estado: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>) {
  return estado.isConnected !== false && estado.isInternetReachable !== false;
}

/**
 * Liga o TanStack Query ao aparelho (ADR-0005): sem rede, as leituras ficam em pausa e mostram o
 * que está no cache; ao voltar a rede ou ao voltar ao primeiro plano, as consultas são refeitas.
 * Chame uma vez, ao abrir o app.
 */
export function configurarConectividade() {
  onlineManager.setEventListener((definirOnline) =>
    NetInfo.addEventListener((estado) => definirOnline(estaOnline(estado))),
  );
  focusManager.setEventListener((tratarFoco) => {
    const assinatura = AppState.addEventListener('change', (estado: AppStateStatus) =>
      tratarFoco(estado === 'active'),
    );
    return () => assinatura.remove();
  });
}

/** `true` com rede. Começa em `true` (não pisca "sem conexão" ao abrir) e acompanha o NetInfo. */
export function useConectado(): boolean {
  const [conectado, setConectado] = useState(true);
  useEffect(() => {
    let ativo = true;
    void NetInfo.fetch().then((estado) => {
      if (ativo) setConectado(estaOnline(estado));
    });
    const cancelar = NetInfo.addEventListener((estado) => setConectado(estaOnline(estado)));
    return () => {
      ativo = false;
      cancelar();
    };
  }, []);
  return conectado;
}

/**
 * Quando os dados em tela foram atualizados pela última vez (a consulta bem-sucedida mais recente),
 * em ms, ou `null` se não há nenhuma.
 */
export function useUltimaAtualizacao(): number | null {
  const cache = useQueryClient().getQueryCache();
  const ms = useSyncExternalStore(
    (avisar) => cache.subscribe(avisar),
    () =>
      cache
        .getAll()
        .reduce(
          (maior, q) =>
            q.state.status === 'success' ? Math.max(maior, q.state.dataUpdatedAt) : maior,
          0,
        ),
  );
  return ms > 0 ? ms : null;
}

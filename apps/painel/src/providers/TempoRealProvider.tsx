import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  aplicarCriacao,
  aplicarMudancaDeStatus,
  CHAVE_BAIRROS,
  CHAVE_INDICADORES,
  chaveDoDetalhe,
  eventoDeCriacaoValido,
  eventoDeStatusValido,
  refazerConsultas,
} from '../features/denuncias/cache';
import { nomeDoBairro, rotuloDoTipo } from '../features/denuncias/tipos';
import { encerrarSessao } from '../services/api';
import { conectarSocket, type EstadoDaConexao } from '../services/socket';
import { criarContextoDeAudio, tocarAlerta } from '../services/som';
import { useSessao } from '../store/sessao';
import { TempoRealContext, type AlertaDeDenuncia } from './tempo-real-contexto';

/** Quanto tempo o alerta fica na tela e a linha fica destacada. */
export const TEMPO_DO_ALERTA_MS = 15_000;
export const TEMPO_DO_DESTAQUE_MS = 10_000;

/**
 * Mantém o WebSocket do operador aberto enquanto há sessão (RF-027). Uma denúncia nova entra na
 * lista, gera o alerta visual (e o sonoro, se o operador ativou o som) sem recarregar; uma mudança
 * de status atualiza as listas e o detalhe. Ao reconectar, as consultas são refeitas.
 */
export function TempoRealProvider({ children }: { children: ReactNode }) {
  const token = useSessao((s) => s.token);
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoDaConexao>('conectando');
  const [alertas, setAlertas] = useState<AlertaDeDenuncia[]>([]);
  const [destaques, setDestaques] = useState<ReadonlySet<string>>(new Set());
  const [somAtivo, setSomAtivo] = useState(false);
  const contextoDeAudio = useRef<AudioContext | null>(null);
  const somAtivoRef = useRef(false);
  const temporizadores = useRef(new Set<ReturnType<typeof setTimeout>>());

  const agendar = useCallback((acao: () => void, ms: number) => {
    const id = setTimeout(() => {
      temporizadores.current.delete(id);
      acao();
    }, ms);
    temporizadores.current.add(id);
  }, []);

  const dispensarAlerta = useCallback((id: string) => {
    setAlertas((atuais) => atuais.filter((a) => a.id !== id));
  }, []);

  // Só depois do clique em "Ativar som" o navegador deixa criar o áudio (S-19).
  const alternarSom = useCallback(() => {
    if (somAtivoRef.current) {
      somAtivoRef.current = false;
      setSomAtivo(false);
      return;
    }
    contextoDeAudio.current ??= criarContextoDeAudio();
    if (!contextoDeAudio.current) return; // navegador sem áudio: fica só o alerta visual
    somAtivoRef.current = true;
    setSomAtivo(true);
    tocarAlerta(contextoDeAudio.current); // confirma que está funcionando
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = conectarSocket({
      token,
      aoConectar: (reconectou) => {
        setEstado('conectado');
        if (reconectou) void refazerConsultas(queryClient);
      },
      aoCair: () => setEstado((atual) => (atual === 'conectando' ? atual : 'reconectando')),
      aoSerRecusado: encerrarSessao,
    });

    socket.on('denuncia:criada', (bruto: unknown) => {
      const evento = eventoDeCriacaoValido(bruto);
      if (!evento) return;
      aplicarCriacao(queryClient, evento);
      void queryClient.invalidateQueries({ queryKey: CHAVE_BAIRROS });
      void queryClient.invalidateQueries({ queryKey: CHAVE_INDICADORES });

      setAlertas((atuais) =>
        atuais.some((a) => a.id === evento.id)
          ? atuais
          : [
              ...atuais,
              {
                id: evento.id,
                protocolo: evento.protocolo,
                // RN-015: a prioritária já chega dizendo que é prioritária.
                texto: `${evento.prioritaria ? 'Nova denúncia prioritária' : 'Nova denúncia'}: ${rotuloDoTipo(evento.tipo)} em ${nomeDoBairro(evento.bairro)}`,
              },
            ],
      );
      setDestaques((atuais) => new Set(atuais).add(evento.id));
      agendar(() => dispensarAlerta(evento.id), TEMPO_DO_ALERTA_MS);
      agendar(
        () =>
          setDestaques((atuais) => {
            const novos = new Set(atuais);
            novos.delete(evento.id);
            return novos;
          }),
        TEMPO_DO_DESTAQUE_MS,
      );

      if (somAtivoRef.current && contextoDeAudio.current) tocarAlerta(contextoDeAudio.current);
    });

    socket.on('denuncia:status-atualizado', (bruto: unknown) => {
      const evento = eventoDeStatusValido(bruto);
      if (!evento) return;
      aplicarMudancaDeStatus(queryClient, evento);
      void queryClient.invalidateQueries({ queryKey: CHAVE_BAIRROS });
      void queryClient.invalidateQueries({ queryKey: CHAVE_INDICADORES });
      // O detalhe aberto busca de novo (traz o nome de quem alterou e o histórico completo).
      void queryClient.invalidateQueries({ queryKey: chaveDoDetalhe(evento.id) });
    });

    const pendentes = temporizadores.current;
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      pendentes.forEach(clearTimeout);
      pendentes.clear();
    };
  }, [token, queryClient, agendar, dispensarAlerta]);

  return (
    <TempoRealContext.Provider
      value={{ estado, alertas, destaques, somAtivo, alternarSom, dispensarAlerta }}
    >
      {children}
    </TempoRealContext.Provider>
  );
}

import { Aviso } from '@/components/Aviso';
import { formatarDataHora } from '@/features/acompanhamento/formatacao';
import { useEstadoDaConexao } from '@/providers/SocketProvider';
import { useConectado, useUltimaAtualizacao } from '@/services/conectividade';

/**
 * Faixa de aviso de conexão (ADR-0005), com ícone e texto:
 * - sem rede no aparelho: "Sem conexão", com a data da última atualização (o que está na tela
 *   vem do cache). Em telas de formulário (`escrita`) lembra que o envio precisa de internet;
 * - rede ok, mas o tempo real caiu: "Reconectando…".
 */
export function AvisoDeConexao({ escrita = false }: { escrita?: boolean }) {
  const conectado = useConectado();
  const estado = useEstadoDaConexao();
  const ultima = useUltimaAtualizacao();

  if (!conectado) {
    return (
      <Aviso tom="atencao" icone="cloud-offline-outline">
        {escrita
          ? 'Sem conexão. Você pode preencher: o rascunho fica salvo no aparelho, mas o envio precisa de internet.'
          : `Sem conexão. Você está vendo a última atualização${ultima ? `, de ${formatarDataHora(new Date(ultima).toISOString())}` : ''}.`}
      </Aviso>
    );
  }
  if (estado === 'reconectando') {
    return (
      <Aviso tom="atencao" icone="sync">
        Reconectando… as atualizações em tempo real estão pausadas.
      </Aviso>
    );
  }
  return null;
}

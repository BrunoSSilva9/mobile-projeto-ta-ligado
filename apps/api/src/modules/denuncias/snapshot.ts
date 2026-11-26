import type { Bairro, Denuncia } from '@prisma/client';

import { ehPrioritaria } from '../../domain';
import type { DenunciaSnapshot } from '../../realtime/publicador';

const num = (valor: { toNumber(): number } | null): number | null =>
  valor === null ? null : valor.toNumber();

/** Monta o snapshot que os eventos em tempo real usam, a partir de uma denúncia lida do banco. */
export function paraSnapshot(d: Denuncia & { bairro: Bairro }): DenunciaSnapshot {
  return {
    id: d.id,
    protocolo: d.protocolo,
    tipo: d.tipo,
    status: d.status,
    prioritaria: ehPrioritaria(d.necessidadeEspecial),
    autorId: d.autorId,
    bairro: { id: d.bairro.id, nome: d.bairro.nome, folha: d.bairro.folha },
    logradouro: d.logradouro,
    descricao: d.descricao,
    latitude: num(d.latitude),
    longitude: num(d.longitude),
    previsaoReparo: d.previsaoReparo,
    justificativa: d.justificativa,
    criadoEm: d.criadoEm,
  };
}

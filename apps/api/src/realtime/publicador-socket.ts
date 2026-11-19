import type { PrismaClient } from '@prisma/client';
import type { Server } from 'socket.io';

import { projetarOcorrenciaPublica } from '../domain';
import { obterStatusDoBairro } from '../modules/bairros/status';
import { EVENTOS, SALAS } from './eventos';
import type { DenunciaCriadaEvento, Publicador, StatusAtualizadoEvento } from './publicador';

/**
 * Publicador que emite os eventos pelo Socket.IO (docs/10-api.md).
 *
 * Quem recebe o quê:
 * - `denuncia:criada`            -> operadores (dados completos, inclusive o autor)
 * - `denuncia:status-atualizado` -> o autor (sala `usuario:{id}`) e os operadores
 * - `ocorrencia:atualizada`      -> cidadãos, versão pública **anonimizada** (RN-014)
 * - `bairro:status-atualizado`   -> cidadãos, status recalculado do bairro (RN-007)
 *
 * O `io` é ligado depois (`conectar`), porque o servidor HTTP precisa do app Express pronto
 * antes de o Socket.IO ser criado. Até lá, nada é emitido.
 */
export class PublicadorSocketIO implements Publicador {
  private io?: Server;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly relogio: () => Date = () => new Date(),
  ) {}

  conectar(io: Server): void {
    this.io = io;
  }

  async denunciaCriada(d: DenunciaCriadaEvento): Promise<void> {
    const io = this.io;
    if (!io) return;

    io.to(SALAS.operadores).emit(EVENTOS.denunciaCriada, {
      id: d.id,
      protocolo: d.protocolo,
      prioritaria: d.prioritaria,
      tipo: d.tipo,
      status: d.status,
      bairro: { id: d.bairro.id, nome: d.bairro.nome, folha: d.bairro.folha },
      logradouro: d.logradouro,
      descricao: d.descricao,
      latitude: d.latitude,
      longitude: d.longitude,
      autor: { id: d.autor.id, nome: d.autor.nome, telefone: d.autor.telefone },
      criadoEm: d.criadoEm.toISOString(),
    });

    io.to(SALAS.cidadaos).emit(EVENTOS.ocorrenciaAtualizada, projetarOcorrenciaPublica(d));
    await this.emitirStatusDoBairro(d.bairro.id);
  }

  async statusAtualizado({
    denuncia: d,
    statusAnterior,
    alteradoEm,
    por,
  }: StatusAtualizadoEvento): Promise<void> {
    const io = this.io;
    if (!io) return;

    // Autor (se a conta ainda existir) e operadores. `to([...])` entrega uma vez por conexão.
    const destinatarios = d.autorId
      ? [SALAS.usuario(d.autorId), SALAS.operadores]
      : [SALAS.operadores];
    io.to(destinatarios).emit(EVENTOS.statusAtualizado, {
      id: d.id,
      protocolo: d.protocolo,
      statusAnterior,
      status: d.status,
      previsaoReparo: d.previsaoReparo?.toISOString() ?? null,
      justificativa: d.justificativa,
      alteradoEm: alteradoEm.toISOString(),
      por,
    });

    io.to(SALAS.cidadaos).emit(EVENTOS.ocorrenciaAtualizada, projetarOcorrenciaPublica(d));
    await this.emitirStatusDoBairro(d.bairro.id);
  }

  /** Lê o banco (já com o commit feito) e avisa os cidadãos do status atual do bairro. */
  private async emitirStatusDoBairro(bairroId: number): Promise<void> {
    const status = await obterStatusDoBairro(this.prisma, bairroId, this.relogio());
    if (status) this.io?.to(SALAS.cidadaos).emit(EVENTOS.bairroStatusAtualizado, status);
  }
}

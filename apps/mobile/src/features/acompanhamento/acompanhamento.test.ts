import { QueryClient } from '@tanstack/react-query';

import type { DenunciaDetalhe, EventoDeStatus, MinhasDenuncias } from './api';
import {
  aplicarEventoAoDetalhe,
  aplicarEventoDeStatus,
  CHAVE_MINHAS,
  chaveDoDetalhe,
  eventoDeStatusValido,
} from './cache';
import { formatarData, formatarDataHora } from './formatacao';
import { contarEmAberto } from './hooks';
import { rotuloDoStatus, statusEmAberto } from './status';
import { colors } from '@/theme';

const detalhe: DenunciaDetalhe = {
  id: 'd1',
  protocolo: 'TL-2026-000001',
  tipo: 'SEM_ENERGIA',
  status: 'RECEBIDA',
  logradouro: 'Rua A',
  cep: null,
  pontoReferencia: null,
  bairro: { id: 1, nome: 'Cidade Nova', folha: null },
  descricao: null,
  latitude: null,
  longitude: null,
  previsaoReparo: null,
  justificativa: null,
  historico: [
    {
      statusAnterior: null,
      statusNovo: 'RECEBIDA',
      por: 'Você',
      criadoEm: '2026-11-19T12:00:00.000Z',
    },
  ],
  criadoEm: '2026-11-19T12:00:00.000Z',
  atualizadoEm: '2026-11-19T12:00:00.000Z',
};

const evento: EventoDeStatus = {
  id: 'd1',
  protocolo: 'TL-2026-000001',
  statusAnterior: 'RECEBIDA',
  status: 'EM_ATENDIMENTO',
  previsaoReparo: '2026-11-19T16:00:00.000Z',
  justificativa: null,
  alteradoEm: '2026-11-19T12:10:00.000Z',
  por: 'Equatorial Pará',
};

const lista = (): MinhasDenuncias => ({
  pagina: 1,
  total: 2,
  itens: [
    {
      id: 'd1',
      protocolo: 'TL-2026-000001',
      tipo: 'SEM_ENERGIA',
      status: 'RECEBIDA',
      bairro: 'Cidade Nova',
      folha: null,
      criadoEm: '2026-11-19T12:00:00.000Z',
      previsaoReparo: null,
    },
    {
      id: 'd0',
      protocolo: 'TL-2026-000000',
      tipo: 'OSCILACAO',
      status: 'RESOLVIDA',
      bairro: 'Nova Marabá',
      folha: 'Folha 28',
      criadoEm: '2026-11-01T12:00:00.000Z',
      previsaoReparo: null,
    },
  ],
});

describe('aplicarEventoAoDetalhe (RF-024)', () => {
  it('muda o status, a previsão e acrescenta ao histórico', () => {
    const novo = aplicarEventoAoDetalhe(detalhe, evento);

    expect(novo.status).toBe('EM_ATENDIMENTO');
    expect(novo.previsaoReparo).toBe('2026-11-19T16:00:00.000Z');
    expect(novo.atualizadoEm).toBe(evento.alteradoEm);
    expect(novo.historico).toHaveLength(2);
    expect(novo.historico[1]).toMatchObject({
      statusAnterior: 'RECEBIDA',
      statusNovo: 'EM_ATENDIMENTO',
      por: 'Equatorial Pará',
    });
  });

  it('não altera o objeto original', () => {
    aplicarEventoAoDetalhe(detalhe, evento);
    expect(detalhe.status).toBe('RECEBIDA');
    expect(detalhe.historico).toHaveLength(1);
  });

  it('o mesmo evento recebido duas vezes não duplica o histórico', () => {
    const uma = aplicarEventoAoDetalhe(detalhe, evento);
    const duas = aplicarEventoAoDetalhe({ ...uma, atualizadoEm: detalhe.atualizadoEm }, evento);

    expect(duas.historico).toHaveLength(2);
  });

  it('evento antigo (fora de ordem) é ignorado', () => {
    const atual = aplicarEventoAoDetalhe(detalhe, evento);
    const antigo: EventoDeStatus = {
      ...evento,
      statusAnterior: 'RECEBIDA',
      status: 'RECEBIDA',
      alteradoEm: '2026-11-19T12:05:00.000Z',
    };

    expect(aplicarEventoAoDetalhe(atual, antigo)).toBe(atual);
  });

  it('só a previsão mudou (mesmo status): atualiza sem criar linha no histórico', () => {
    const emAtendimento = aplicarEventoAoDetalhe(detalhe, evento);
    const novo = aplicarEventoAoDetalhe(emAtendimento, {
      ...evento,
      statusAnterior: 'EM_ATENDIMENTO',
      status: 'EM_ATENDIMENTO',
      previsaoReparo: '2026-11-19T18:00:00.000Z',
      alteradoEm: '2026-11-19T12:20:00.000Z',
    });

    expect(novo.previsaoReparo).toBe('2026-11-19T18:00:00.000Z');
    expect(novo.historico).toHaveLength(2);
  });

  it('improcedente guarda a justificativa e a mostra no histórico', () => {
    const novo = aplicarEventoAoDetalhe(detalhe, {
      ...evento,
      status: 'IMPROCEDENTE',
      previsaoReparo: null,
      justificativa: 'Não há falta de energia no local.',
    });

    expect(novo.justificativa).toBe('Não há falta de energia no local.');
    expect(novo.historico.at(-1)?.justificativa).toBe('Não há falta de energia no local.');
  });
});

describe('aplicarEventoDeStatus (cache do TanStack Query)', () => {
  const novoCache = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    qc.setQueryData(chaveDoDetalhe('d1'), detalhe);
    qc.setQueryData([...CHAVE_MINHAS], lista());
    return qc;
  };

  it('atualiza o detalhe e o item da lista, sem tocar nos outros', () => {
    const qc = novoCache();

    expect(aplicarEventoDeStatus(qc, evento)).toBe(true);

    expect(qc.getQueryData<DenunciaDetalhe>(chaveDoDetalhe('d1'))?.status).toBe('EM_ATENDIMENTO');
    const itens = qc.getQueryData<MinhasDenuncias>([...CHAVE_MINHAS])!.itens;
    expect(itens[0]).toMatchObject({ id: 'd1', status: 'EM_ATENDIMENTO' });
    expect(itens[1]).toMatchObject({ id: 'd0', status: 'RESOLVIDA' });
  });

  it('atualiza a lista mesmo sem o detalhe em cache (e não cria o detalhe)', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    qc.setQueryData([...CHAVE_MINHAS], lista());

    expect(aplicarEventoDeStatus(qc, evento)).toBe(true);
    expect(qc.getQueryData(chaveDoDetalhe('d1'))).toBeUndefined();
  });

  it('denúncia que não está em nenhum cache: nada muda e devolve false', () => {
    const qc = novoCache();

    expect(aplicarEventoDeStatus(qc, { ...evento, id: 'outra' })).toBe(false);
    expect(qc.getQueryData<DenunciaDetalhe>(chaveDoDetalhe('d1'))?.status).toBe('RECEBIDA');
  });

  it('cache vazio não quebra', () => {
    expect(
      aplicarEventoDeStatus(
        new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } }),
        evento,
      ),
    ).toBe(false);
  });
});

describe('eventoDeStatusValido', () => {
  it('aceita o formato do contrato', () => {
    expect(eventoDeStatusValido(evento)).toEqual(evento);
  });

  it('completa o que for opcional', () => {
    expect(
      eventoDeStatusValido({
        id: 'd1',
        statusAnterior: 'RECEBIDA',
        status: 'RESOLVIDA',
        alteradoEm: '2026-11-19T12:10:00.000Z',
      }),
    ).toMatchObject({ previsaoReparo: null, justificativa: null, por: 'Equatorial Pará' });
  });

  it.each([
    null,
    'texto',
    {},
    { ...evento, id: '' },
    { ...evento, status: undefined },
    { ...evento, statusAnterior: 3 },
    { ...evento, alteradoEm: 'ontem' },
  ])('descarta %j', (ruim) => {
    expect(eventoDeStatusValido(ruim)).toBeNull();
  });
});

describe('status', () => {
  it('rótulos em português e valor desconhecido devolvido como veio', () => {
    expect(rotuloDoStatus('EM_ATENDIMENTO')).toBe('Em atendimento');
    expect(rotuloDoStatus('IMPROCEDENTE')).toBe('Improcedente');
    expect(rotuloDoStatus('XYZ')).toBe('XYZ');
  });

  it('cada status tem ícone e texto próprios no design system (a cor não é a única pista)', () => {
    const chaves = [
      'RECEBIDA',
      'EM_ATENDIMENTO',
      'RESOLVIDA',
      'IMPROCEDENTE',
      'CANCELADA',
    ] as const;
    const icones = chaves.map((c) => colors.andamento[c].icone);
    expect(new Set(icones).size).toBe(chaves.length);
    expect(new Set(chaves.map(rotuloDoStatus)).size).toBe(chaves.length);
  });

  it('em aberto = recebida ou em atendimento', () => {
    expect(['RECEBIDA', 'EM_ATENDIMENTO'].every(statusEmAberto)).toBe(true);
    expect(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'].some(statusEmAberto)).toBe(false);
  });

  it('contarEmAberto', () => {
    expect(contarEmAberto(lista().itens)).toBe(1);
    expect(contarEmAberto([])).toBe(0);
  });
});

describe('formatação de datas (horário de Marabá, UTC−3)', () => {
  it('converte de UTC para o horário de Marabá', () => {
    expect(formatarDataHora('2026-11-19T17:05:00.000Z')).toBe('19/11/2026 às 14:05');
  });

  it('muda o dia quando a conversão atravessa a meia-noite', () => {
    expect(formatarDataHora('2026-11-20T01:30:00.000Z')).toBe('19/11/2026 às 22:30');
    expect(formatarData('2026-11-20T01:30:00.000Z')).toBe('19/11/2026');
  });

  it('vazio ou inválido vira texto vazio', () => {
    expect(formatarDataHora(null)).toBe('');
    expect(formatarDataHora('')).toBe('');
    expect(formatarDataHora('abc')).toBe('');
    expect(formatarData(undefined)).toBe('');
  });
});

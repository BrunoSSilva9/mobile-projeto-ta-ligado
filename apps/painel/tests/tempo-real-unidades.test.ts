import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import {
  erroDaJustificativa,
  acoesDoOperador,
  previsaoParaIso,
} from '../src/features/denuncias/acoes';
import {
  aplicarCriacao,
  aplicarMudancaDeStatus,
  CHAVE_LISTAS,
  combinaComFiltros,
  eventoDeCriacaoValido,
  eventoDeStatusValido,
  inserirNaLista,
} from '../src/features/denuncias/cache';
import { FILTROS_INICIAIS, type Filtros } from '../src/features/denuncias/consulta';
import type { DenunciaDoPainel, ListaDoPainel } from '../src/features/denuncias/tipos';
import { criarContextoDeAudio, tocarAlerta } from '../src/services/som';
import { DENUNCIA_A, DENUNCIA_B } from './ajudas';

const A = DENUNCIA_A as unknown as DenunciaDoPainel; // prioritária, sem energia, Nova Marabá
const B = DENUNCIA_B as unknown as DenunciaDoPainel; // normal, oscilação, Cidade Nova

const nova = (extra: Partial<DenunciaDoPainel> = {}): DenunciaDoPainel => ({
  ...B,
  id: 'nova',
  protocolo: 'TL-2026-000099',
  status: 'RECEBIDA',
  ...extra,
});

describe('acoesDoOperador (RN-004)', () => {
  it('recebida: iniciar ou improcedente', () => {
    expect(acoesDoOperador('RECEBIDA')).toEqual(['EM_ATENDIMENTO', 'IMPROCEDENTE']);
  });
  it('em atendimento: resolver ou improcedente', () => {
    expect(acoesDoOperador('EM_ATENDIMENTO')).toEqual(['RESOLVIDA', 'IMPROCEDENTE']);
  });
  it.each(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'] as const)('%s: sem ações', (s) => {
    expect(acoesDoOperador(s)).toEqual([]);
  });
});

describe('justificativa e previsão', () => {
  it('justificativa de 10 a 500 caracteres (RN-010)', () => {
    expect(erroDaJustificativa('curta')).toMatch(/pelo menos 10/);
    expect(erroDaJustificativa('   123456789   ')).toMatch(/pelo menos 10/);
    expect(erroDaJustificativa('1234567890')).toBeNull();
    expect(erroDaJustificativa('a'.repeat(500))).toBeNull();
    expect(erroDaJustificativa('a'.repeat(501))).toMatch(/no máximo 500/);
  });

  it('previsão: vazia, futura, passada e inválida (RN-009)', () => {
    const agora = Date.parse('2026-11-19T12:00:00Z');
    expect(previsaoParaIso('', agora)).toBeNull();
    expect(previsaoParaIso('2026-11-19T11:00', new Date('2026-11-19T12:00').getTime())).toBe(
      'passado',
    );
    expect(previsaoParaIso('2026-11-19T18:30', new Date('2026-11-19T12:00').getTime())).toBe(
      new Date('2026-11-19T18:30').toISOString(),
    );
    expect(previsaoParaIso('lixo', agora)).toBe('invalida');
  });
});

describe('combinaComFiltros', () => {
  const f = (extra: Partial<Filtros>): Filtros => ({ ...FILTROS_INICIAIS, ...extra });

  it('em aberto aceita recebida e em atendimento, recusa as encerradas', () => {
    expect(combinaComFiltros(A, f({}))).toBe(true);
    expect(combinaComFiltros({ ...A, status: 'RESOLVIDA' }, f({}))).toBe(false);
  });
  it('status específico e "todos"', () => {
    expect(combinaComFiltros({ ...A, status: 'RESOLVIDA' }, f({ status: 'RESOLVIDA' }))).toBe(true);
    expect(combinaComFiltros(A, f({ status: 'RESOLVIDA' }))).toBe(false);
    expect(combinaComFiltros({ ...A, status: 'CANCELADA' }, f({ status: 'TODOS' }))).toBe(true);
  });
  it('tipo, bairro e prioritárias', () => {
    expect(combinaComFiltros(A, f({ tipo: 'OSCILACAO' }))).toBe(false);
    expect(combinaComFiltros(A, f({ tipo: 'SEM_ENERGIA' }))).toBe(true);
    expect(combinaComFiltros(A, f({ bairroId: 1 }))).toBe(false);
    expect(combinaComFiltros(A, f({ bairroId: 2 }))).toBe(true);
    expect(combinaComFiltros(B, f({ prioritarias: true }))).toBe(false);
    expect(combinaComFiltros(A, f({ prioritarias: true }))).toBe(true);
  });
});

describe('inserirNaLista (ordem da RN-015)', () => {
  const lista = (itens: DenunciaDoPainel[]): ListaDoPainel => ({
    itens,
    pagina: 1,
    total: itens.length,
  });

  it('normal entra no fim; prioritária entra depois das outras prioritárias', () => {
    const base = lista([A, B]);

    expect(inserirNaLista(base, nova()).itens.map((i) => i.id)).toEqual(['d1', 'd0', 'nova']);
    expect(inserirNaLista(base, nova({ prioritaria: true })).itens.map((i) => i.id)).toEqual([
      'd1',
      'nova',
      'd0',
    ]);
  });

  it('soma ao total e não altera a lista original', () => {
    const base = lista([A]);
    const nova1 = inserirNaLista(base, nova());
    expect(nova1.total).toBe(2);
    expect(base.itens).toHaveLength(1);
  });

  it('evento repetido não duplica', () => {
    const base = lista([A]);
    expect(inserirNaLista(base, A)).toBe(base);
  });

  it('página cheia: só soma ao total (a denúncia aparece na página certa depois)', () => {
    const cheia = lista(Array.from({ length: 100 }, (_, i) => ({ ...B, id: `x${i}` })));
    const r = inserirNaLista(cheia, nova());
    expect(r.itens).toHaveLength(100);
    expect(r.total).toBe(101);
  });
});

describe('aplicarCriacao e aplicarMudancaDeStatus (cache)', () => {
  const novoCache = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    qc.setQueryData([...CHAVE_LISTAS, FILTROS_INICIAIS, 1], { itens: [A, B], pagina: 1, total: 2 });
    qc.setQueryData([...CHAVE_LISTAS, { ...FILTROS_INICIAIS, tipo: 'SEM_ENERGIA' }, 1], {
      itens: [A],
      pagina: 1,
      total: 1,
    });
    qc.setQueryData([...CHAVE_LISTAS, FILTROS_INICIAIS, 2], { itens: [], pagina: 2, total: 2 });
    return qc;
  };
  const itens = (qc: QueryClient, filtros: Filtros, pagina = 1) =>
    qc.getQueryData<ListaDoPainel>([...CHAVE_LISTAS, filtros, pagina])!;

  const evento = {
    id: 'nova',
    protocolo: 'TL-2026-000099',
    prioritaria: false,
    tipo: 'OSCILACAO' as const,
    status: 'RECEBIDA' as const,
    bairro: { id: 1, nome: 'Cidade Nova', folha: null },
    logradouro: 'Rua X',
    latitude: null,
    longitude: null,
    criadoEm: '2026-11-19T18:00:00.000Z',
  };

  it('a denúncia nova entra só nas listas cujos filtros combinam, e só na página 1', () => {
    const qc = novoCache();

    aplicarCriacao(qc, evento);

    expect(itens(qc, FILTROS_INICIAIS).itens.map((i) => i.id)).toEqual(['d1', 'd0', 'nova']);
    expect(itens(qc, { ...FILTROS_INICIAIS, tipo: 'SEM_ENERGIA' }).itens).toHaveLength(1);
    expect(itens(qc, FILTROS_INICIAIS, 2).itens).toHaveLength(0);
  });

  it('mudança de status atualiza o item; se sair dos filtros, ele some da lista', () => {
    const qc = novoCache();

    aplicarMudancaDeStatus(qc, {
      id: 'd0',
      status: 'EM_ATENDIMENTO',
      previsaoReparo: '2026-11-20T10:00:00Z',
    });
    expect(itens(qc, FILTROS_INICIAIS).itens[1]).toMatchObject({
      status: 'EM_ATENDIMENTO',
      previsaoReparo: '2026-11-20T10:00:00Z',
    });

    aplicarMudancaDeStatus(qc, { id: 'd1', status: 'RESOLVIDA', previsaoReparo: null });
    const lista = itens(qc, FILTROS_INICIAIS);
    expect(lista.itens.map((i) => i.id)).toEqual(['d0']);
    expect(lista.total).toBe(1);
    expect(itens(qc, { ...FILTROS_INICIAIS, tipo: 'SEM_ENERGIA' }).itens).toHaveLength(0);
  });

  it('denúncia que não está nas listas não muda nada', () => {
    const qc = novoCache();
    aplicarMudancaDeStatus(qc, { id: 'outra', status: 'RESOLVIDA', previsaoReparo: null });
    expect(itens(qc, FILTROS_INICIAIS).itens).toHaveLength(2);
  });
});

describe('validação dos eventos', () => {
  const ok = {
    id: 'n',
    protocolo: 'TL-1',
    prioritaria: true,
    tipo: 'SEM_ENERGIA',
    status: 'RECEBIDA',
    bairro: { id: 3, nome: 'Cidade Nova', folha: null },
    logradouro: 'Av. VP-3',
    latitude: -5.3,
    longitude: -49.1,
    criadoEm: '2026-11-19T18:00:00Z',
    autor: { id: 'u', nome: 'Maria', telefone: null },
  };

  it('denuncia:criada aceita o contrato (e ignora o resto)', () => {
    const e = eventoDeCriacaoValido(ok)!;
    expect(e).toMatchObject({ id: 'n', prioritaria: true, latitude: -5.3 });
    expect(e).not.toHaveProperty('autor');
  });

  it('denuncia:criada completa o que for opcional', () => {
    const e = eventoDeCriacaoValido({
      ...ok,
      logradouro: undefined,
      latitude: null,
      prioritaria: undefined,
    })!;
    expect(e).toMatchObject({ logradouro: '', latitude: null, prioritaria: false });
  });

  it.each([
    null,
    'x',
    {},
    { ...ok, id: '' },
    { ...ok, bairro: undefined },
    { ...ok, bairro: { id: 'a', nome: 'x' } },
  ])('denuncia:criada descarta %j', (ruim) => {
    expect(eventoDeCriacaoValido(ruim)).toBeNull();
  });

  it('denuncia:status-atualizado', () => {
    expect(eventoDeStatusValido({ id: 'a', status: 'RESOLVIDA', previsaoReparo: null })).toEqual({
      id: 'a',
      status: 'RESOLVIDA',
      previsaoReparo: null,
    });
    expect(eventoDeStatusValido({ id: 'a' })).toBeNull();
    expect(eventoDeStatusValido(null)).toBeNull();
  });
});

describe('som do alerta (S-19)', () => {
  const contextoFalso = (estado = 'running') => {
    const osciladores: Array<{ start: ReturnType<typeof vi.fn>; frequency: { value: number } }> =
      [];
    const ctx = {
      state: estado,
      currentTime: 0,
      destination: {},
      resume: vi.fn(),
      createOscillator: vi.fn(() => {
        const o = {
          type: '',
          frequency: { value: 0 },
          connect: vi.fn(function (this: unknown, x: unknown) {
            return x;
          }),
          start: vi.fn(),
          stop: vi.fn(),
        };
        osciladores.push(o);
        return o;
      }),
      createGain: vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn((x: unknown) => x),
      })),
    };
    return { ctx: ctx as unknown as AudioContext, osciladores, bruto: ctx };
  };

  it('toca dois tons (880 Hz e 660 Hz)', () => {
    const { ctx, osciladores } = contextoFalso();
    tocarAlerta(ctx);
    expect(osciladores.map((o) => o.frequency.value)).toEqual([880, 660]);
    expect(osciladores.every((o) => o.start.mock.calls.length === 1)).toBe(true);
  });

  it('retoma o áudio se o navegador o suspendeu', () => {
    const { ctx, bruto } = contextoFalso('suspended');
    tocarAlerta(ctx);
    expect(bruto.resume).toHaveBeenCalled();
  });

  it('nunca lança, mesmo se o áudio falhar', () => {
    const { ctx, bruto } = contextoFalso();
    bruto.createOscillator.mockImplementation(() => {
      throw new Error('sem áudio');
    });
    expect(() => tocarAlerta(ctx)).not.toThrow();
  });

  it('criarContextoDeAudio: devolve null sem suporte ou se o navegador recusar', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(criarContextoDeAudio()).toBeNull();
    vi.stubGlobal('AudioContext', function () {
      throw new Error('bloqueado');
    });
    expect(criarContextoDeAudio()).toBeNull();
    vi.unstubAllGlobals();
  });
});

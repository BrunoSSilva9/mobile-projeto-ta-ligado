import { describe, expect, it } from 'vitest';

import { resumirPorBairro, type DenunciaParaResumo } from '../../src/domain';

const d = (
  bairroId: number,
  nome: string,
  extra: Partial<DenunciaParaResumo> = {},
): DenunciaParaResumo => ({
  bairroId,
  nome,
  folha: null,
  tipo: 'SEM_ENERGIA',
  status: 'RECEBIDA',
  prioritaria: false,
  ...extra,
});

describe('resumirPorBairro (RN-016, RF-034)', () => {
  it('sem denúncias, lista vazia', () => {
    expect(resumirPorBairro([])).toEqual([]);
  });

  it('conta, por bairro, as em aberto por tipo e por status e as prioritárias', () => {
    const r = resumirPorBairro([
      d(1, 'Cidade Nova'),
      d(1, 'Cidade Nova', { tipo: 'OSCILACAO', status: 'EM_ATENDIMENTO', prioritaria: true }),
      d(1, 'Cidade Nova', { tipo: 'SEM_ENERGIA', status: 'EM_ATENDIMENTO' }),
    ]);

    expect(r).toEqual([
      {
        bairroId: 1,
        nome: 'Cidade Nova',
        folha: null,
        emAberto: 3,
        porTipo: { SEM_ENERGIA: 2, OSCILACAO: 1 },
        porStatus: { RECEBIDA: 1, EM_ATENDIMENTO: 2 },
        prioritarias: 1,
      },
    ]);
  });

  it('só conta o que está em aberto (as encerradas ficam de fora)', () => {
    const r = resumirPorBairro([
      d(1, 'A'),
      d(1, 'A', { status: 'RESOLVIDA' }),
      d(1, 'A', { status: 'IMPROCEDENTE' }),
      d(1, 'A', { status: 'CANCELADA' }),
    ]);

    expect(r[0]!.emAberto).toBe(1);
  });

  it('um bairro só com denúncias encerradas não aparece', () => {
    expect(resumirPorBairro([d(1, 'A', { status: 'RESOLVIDA' })])).toEqual([]);
  });

  it('separa os bairros e guarda a folha', () => {
    const r = resumirPorBairro([
      d(1, 'Nova Marabá', { folha: 'Folha 28' }),
      d(2, 'Cidade Nova'),
      d(1, 'Nova Marabá', { folha: 'Folha 28' }),
    ]);

    expect(r.map((b) => [b.bairroId, b.folha, b.emAberto])).toEqual([
      [1, 'Folha 28', 2],
      [2, null, 1],
    ]);
  });

  it('ordem: mais prioritárias, depois mais denúncias em aberto, depois o nome (A a Z)', () => {
    const r = resumirPorBairro([
      d(1, 'Zeta'),
      d(1, 'Zeta'),
      d(1, 'Zeta'),
      d(2, 'Beta'),
      d(3, 'Alfa'),
      d(4, 'Omega', { prioritaria: true }),
      d(5, 'Delta', { prioritaria: true }),
      d(5, 'Delta'),
    ]);

    expect(r.map((b) => b.nome)).toEqual(['Delta', 'Omega', 'Zeta', 'Alfa', 'Beta']);
  });

  it('o nome desempata sem diferenciar acentos nem caixa', () => {
    const r = resumirPorBairro([d(1, 'Éden'), d(2, 'abacaxi'), d(3, 'Zona')]);

    expect(r.map((b) => b.nome)).toEqual(['abacaxi', 'Éden', 'Zona']);
  });

  it('não altera a lista recebida', () => {
    const entrada = [d(2, 'B'), d(1, 'A')];
    const copia = JSON.stringify(entrada);

    resumirPorBairro(entrada);

    expect(JSON.stringify(entrada)).toBe(copia);
  });
});

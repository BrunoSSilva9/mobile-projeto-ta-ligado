import { describe, expect, it } from 'vitest';

import {
  acoesDisponiveis,
  TODOS_OS_STATUS,
  validarTransicao,
  type Ator,
  type StatusDenuncia,
} from '../../src/domain';

const operador: Ator = { papel: 'OPERADOR', ehAutor: false };
const autor: Ator = { papel: 'CIDADAO', ehAutor: true };
const outroCidadao: Ator = { papel: 'CIDADAO', ehAutor: false };

const JUSTIFICATIVA = 'Local sem interrupção confirmada pela equipe.';

/** Tabela de RN-004, escrita à parte da implementação para servir de oráculo. */
const TRANSICOES_VALIDAS: {
  de: StatusDenuncia;
  para: StatusDenuncia;
  quem: 'operador' | 'autor';
}[] = [
  { de: 'RECEBIDA', para: 'EM_ATENDIMENTO', quem: 'operador' },
  { de: 'RECEBIDA', para: 'IMPROCEDENTE', quem: 'operador' },
  { de: 'RECEBIDA', para: 'CANCELADA', quem: 'autor' },
  { de: 'EM_ATENDIMENTO', para: 'RESOLVIDA', quem: 'operador' },
  { de: 'EM_ATENDIMENTO', para: 'IMPROCEDENTE', quem: 'operador' },
];

function quemFaz(de: StatusDenuncia, para: StatusDenuncia) {
  return TRANSICOES_VALIDAS.find((t) => t.de === de && t.para === para)?.quem;
}

describe('validarTransicao: tabela de RN-004', () => {
  it.each(TRANSICOES_VALIDAS)('permite $de -> $para para o $quem', ({ de, para, quem }) => {
    const ator = quem === 'operador' ? operador : autor;
    const resultado = validarTransicao({ de, para, ator, justificativa: JUSTIFICATIVA });
    expect(resultado).toEqual({ ok: true });
  });

  describe('matriz completa de estados (5 x 5) e atores', () => {
    const atores = [
      { nome: 'operador', ator: operador, papel: 'operador' as const },
      { nome: 'autor', ator: autor, papel: 'autor' as const },
      { nome: 'outro cidadão', ator: outroCidadao, papel: null },
    ];

    for (const { nome, ator, papel } of atores) {
      for (const de of TODOS_OS_STATUS) {
        for (const para of TODOS_OS_STATUS) {
          const quem = quemFaz(de, para);
          let esperado: 'ok' | 'TRANSICAO_INVALIDA' | 'SEM_PERMISSAO';
          if (!quem) esperado = 'TRANSICAO_INVALIDA';
          else if (quem === papel) esperado = 'ok';
          else esperado = 'SEM_PERMISSAO';

          it(`${nome}: ${de} -> ${para} => ${esperado}`, () => {
            const resultado = validarTransicao({ de, para, ator, justificativa: JUSTIFICATIVA });
            if (esperado === 'ok') {
              expect(resultado).toEqual({ ok: true });
            } else {
              expect(resultado).toMatchObject({ ok: false, codigo: esperado });
            }
          });
        }
      }
    }
  });

  it('estados finais não mudam, nem pelo operador nem em lote', () => {
    for (const final of ['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'] as const) {
      for (const para of TODOS_OS_STATUS) {
        expect(
          validarTransicao({ de: final, para, ator: operador, justificativa: JUSTIFICATIVA }),
        ).toMatchObject({ ok: false, codigo: 'TRANSICAO_INVALIDA' });
        expect(
          validarTransicao({
            de: final,
            para,
            ator: operador,
            justificativa: JUSTIFICATIVA,
            lote: true,
          }),
        ).toMatchObject({ ok: false, codigo: 'TRANSICAO_INVALIDA' });
      }
    }
  });
});

describe('validarTransicao: justificativa de improcedência (RN-010)', () => {
  const base = { de: 'RECEBIDA', para: 'IMPROCEDENTE', ator: operador } as const;

  it.each([
    ['ausente', undefined],
    ['nula', null],
    ['vazia', ''],
    ['só espaços', '            '],
    ['com 9 caracteres', 'abcdefghi'],
    ['com 501 caracteres', 'a'.repeat(501)],
  ])('recusa justificativa %s', (_nome, justificativa) => {
    expect(validarTransicao({ ...base, justificativa })).toMatchObject({
      ok: false,
      codigo: 'JUSTIFICATIVA_OBRIGATORIA',
    });
  });

  it.each([
    ['com exatamente 10 caracteres', 'abcdefghij'],
    ['com exatamente 500 caracteres', 'a'.repeat(500)],
    ['com espaços nas pontas (conta o texto aparado)', '   texto com dez   '],
  ])('aceita justificativa %s', (_nome, justificativa) => {
    expect(validarTransicao({ ...base, justificativa })).toEqual({ ok: true });
  });

  it('não exige justificativa para os outros status', () => {
    expect(validarTransicao({ de: 'RECEBIDA', para: 'EM_ATENDIMENTO', ator: operador })).toEqual({
      ok: true,
    });
    expect(validarTransicao({ de: 'EM_ATENDIMENTO', para: 'RESOLVIDA', ator: operador })).toEqual({
      ok: true,
    });
    expect(validarTransicao({ de: 'RECEBIDA', para: 'CANCELADA', ator: autor })).toEqual({
      ok: true,
    });
  });

  it('a falta de permissão tem precedência sobre a justificativa', () => {
    expect(validarTransicao({ ...base, ator: autor, justificativa: '' })).toMatchObject({
      codigo: 'SEM_PERMISSAO',
    });
  });
});

describe('validarTransicao: cancelamento pelo autor (RN-005)', () => {
  it('o autor cancela enquanto RECEBIDA', () => {
    expect(validarTransicao({ de: 'RECEBIDA', para: 'CANCELADA', ator: autor })).toEqual({
      ok: true,
    });
  });

  it('outro cidadão não cancela a denúncia alheia', () => {
    expect(
      validarTransicao({ de: 'RECEBIDA', para: 'CANCELADA', ator: outroCidadao }),
    ).toMatchObject({
      ok: false,
      codigo: 'SEM_PERMISSAO',
    });
  });

  it('o operador também não cancela pelo autor', () => {
    expect(validarTransicao({ de: 'RECEBIDA', para: 'CANCELADA', ator: operador })).toMatchObject({
      ok: false,
      codigo: 'SEM_PERMISSAO',
    });
  });

  it('depois que o atendimento começa, o autor não cancela mais', () => {
    expect(
      validarTransicao({ de: 'EM_ATENDIMENTO', para: 'CANCELADA', ator: autor }),
    ).toMatchObject({
      ok: false,
      codigo: 'TRANSICAO_INVALIDA',
    });
  });

  it('um cidadão nunca executa transições do operador, mesmo sendo o autor', () => {
    expect(validarTransicao({ de: 'RECEBIDA', para: 'EM_ATENDIMENTO', ator: autor })).toMatchObject(
      {
        codigo: 'SEM_PERMISSAO',
      },
    );
    expect(
      validarTransicao({ de: 'EM_ATENDIMENTO', para: 'RESOLVIDA', ator: autor }),
    ).toMatchObject({
      codigo: 'SEM_PERMISSAO',
    });
  });
});

describe('validarTransicao: resolução em lote (RN-016, S-01)', () => {
  it('sem o lote, RECEBIDA -> RESOLVIDA é inválida', () => {
    expect(validarTransicao({ de: 'RECEBIDA', para: 'RESOLVIDA', ator: operador })).toMatchObject({
      ok: false,
      codigo: 'TRANSICAO_INVALIDA',
    });
  });

  it('com o lote, o operador resolve direto uma denúncia RECEBIDA', () => {
    expect(
      validarTransicao({ de: 'RECEBIDA', para: 'RESOLVIDA', ator: operador, lote: true }),
    ).toEqual({
      ok: true,
    });
  });

  it('com o lote, EM_ATENDIMENTO -> RESOLVIDA continua válida', () => {
    expect(
      validarTransicao({ de: 'EM_ATENDIMENTO', para: 'RESOLVIDA', ator: operador, lote: true }),
    ).toEqual({
      ok: true,
    });
  });

  it('cidadão não usa o lote', () => {
    expect(
      validarTransicao({ de: 'RECEBIDA', para: 'RESOLVIDA', ator: autor, lote: true }),
    ).toMatchObject({
      ok: false,
      codigo: 'SEM_PERMISSAO',
    });
  });

  it('o lote não abre outras exceções', () => {
    expect(
      validarTransicao({ de: 'RECEBIDA', para: 'CANCELADA', ator: operador, lote: true }),
    ).toMatchObject({
      codigo: 'SEM_PERMISSAO',
    });
    expect(
      validarTransicao({ de: 'EM_ATENDIMENTO', para: 'RECEBIDA', ator: operador, lote: true }),
    ).toMatchObject({
      codigo: 'TRANSICAO_INVALIDA',
    });
  });

  it('o status igual ao atual nunca é uma transição', () => {
    expect(validarTransicao({ de: 'RECEBIDA', para: 'RECEBIDA', ator: operador })).toMatchObject({
      codigo: 'TRANSICAO_INVALIDA',
    });
  });
});

describe('acoesDisponiveis', () => {
  it('operador em RECEBIDA: iniciar atendimento ou improcedente', () => {
    expect(acoesDisponiveis('RECEBIDA', operador)).toEqual(['EM_ATENDIMENTO', 'IMPROCEDENTE']);
  });

  it('operador em EM_ATENDIMENTO: resolver ou improcedente', () => {
    expect(acoesDisponiveis('EM_ATENDIMENTO', operador)).toEqual(['RESOLVIDA', 'IMPROCEDENTE']);
  });

  it('autor em RECEBIDA: só cancelar', () => {
    expect(acoesDisponiveis('RECEBIDA', autor)).toEqual(['CANCELADA']);
  });

  it('autor em EM_ATENDIMENTO: nada', () => {
    expect(acoesDisponiveis('EM_ATENDIMENTO', autor)).toEqual([]);
  });

  it('outro cidadão: nada em nenhum status', () => {
    for (const status of TODOS_OS_STATUS) {
      expect(acoesDisponiveis(status, outroCidadao)).toEqual([]);
    }
  });

  it('estados finais: nada, nem para o operador', () => {
    for (const status of ['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'] as const) {
      expect(acoesDisponiveis(status, operador)).toEqual([]);
      expect(acoesDisponiveis(status, autor)).toEqual([]);
    }
  });

  it('é coerente com validarTransicao: toda ação oferecida é aceita', () => {
    const atores = [operador, autor, outroCidadao];
    for (const ator of atores) {
      for (const de of TODOS_OS_STATUS) {
        for (const para of acoesDisponiveis(de, ator)) {
          expect(validarTransicao({ de, para, ator, justificativa: JUSTIFICATIVA })).toEqual({
            ok: true,
          });
        }
      }
    }
  });
});

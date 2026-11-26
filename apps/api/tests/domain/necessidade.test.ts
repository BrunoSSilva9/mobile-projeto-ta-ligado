import { describe, expect, it } from 'vitest';

import {
  camposSensiveisAoMudarStatus,
  ehPrioritaria,
  TODOS_OS_STATUS,
  validarNecessidade,
} from '../../src/domain';

describe('validarNecessidade (RN-015, S-46)', () => {
  it('"Sim" com o consentimento específico: aceita e manda registrar o consentimento', () => {
    expect(validarNecessidade({ necessidadeEspecial: true, consentimento: true })).toEqual({
      ok: true,
      necessidadeEspecial: true,
      registrarConsentimento: true,
    });
  });

  it.each([undefined, false])('"Sim" sem o consentimento (%s): recusa', (consentimento) => {
    expect(validarNecessidade({ necessidadeEspecial: true, consentimento })).toMatchObject({
      ok: false,
      codigo: 'CONSENTIMENTO_OBRIGATORIO',
    });
  });

  it('"Não": aceita, sem consentimento (não há dado de saúde)', () => {
    expect(validarNecessidade({ necessidadeEspecial: false, consentimento: true })).toEqual({
      ok: true,
      necessidadeEspecial: false,
      registrarConsentimento: false,
    });
  });

  it('sem resposta: fica nulo (não informado)', () => {
    expect(validarNecessidade({})).toEqual({
      ok: true,
      necessidadeEspecial: null,
      registrarConsentimento: false,
    });
  });
});

describe('ehPrioritaria (RN-015)', () => {
  it('só o "Sim" é prioritário; "Não", não informado e apagado não são', () => {
    expect(ehPrioritaria(true)).toBe(true);
    expect(ehPrioritaria(false)).toBe(false);
    expect(ehPrioritaria(null)).toBe(false);
    expect(ehPrioritaria(undefined)).toBe(false);
  });
});

describe('camposSensiveisAoMudarStatus (RN-026, S-47)', () => {
  it.each(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'] as const)(
    'ao entrar em %s, apaga a resposta e o consentimento',
    (status) => {
      expect(camposSensiveisAoMudarStatus(status)).toEqual({
        necessidadeEspecial: null,
        consentimentoNecessidadeEm: null,
      });
    },
  );

  it.each(['RECEBIDA', 'EM_ATENDIMENTO'] as const)('em %s, não mexe em nada', (status) => {
    expect(camposSensiveisAoMudarStatus(status)).toEqual({});
  });

  it('cobre todos os status do domínio', () => {
    const apagam = TODOS_OS_STATUS.filter(
      (s) => Object.keys(camposSensiveisAoMudarStatus(s)).length > 0,
    );
    expect(apagam).toEqual(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA']);
  });
});

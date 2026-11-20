import { describe, expect, it } from 'vitest';

import {
  calcularStatusBairro,
  estaEmAberto,
  ehStatusFinal,
  redeEstavel,
  TODOS_OS_STATUS,
  type DenunciaParaStatus,
} from '../../src/domain';

const semEnergia = (status: DenunciaParaStatus['status'] = 'RECEBIDA'): DenunciaParaStatus => ({
  tipo: 'SEM_ENERGIA',
  status,
});
const oscilacao = (status: DenunciaParaStatus['status'] = 'RECEBIDA'): DenunciaParaStatus => ({
  tipo: 'OSCILACAO',
  status,
});

describe('calcularStatusBairro (RN-007)', () => {
  it('sem denúncias => NORMAL', () => {
    expect(calcularStatusBairro([])).toBe('NORMAL');
  });

  it('apenas oscilação em aberto => OSCILACAO', () => {
    expect(calcularStatusBairro([oscilacao(), oscilacao('EM_ATENDIMENTO')])).toBe('OSCILACAO');
  });

  it('qualquer sem energia em aberto => SEM_LUZ', () => {
    expect(calcularStatusBairro([semEnergia()])).toBe('SEM_LUZ');
    expect(calcularStatusBairro([semEnergia('EM_ATENDIMENTO')])).toBe('SEM_LUZ');
  });

  it('sem energia tem precedência sobre oscilação', () => {
    expect(calcularStatusBairro([oscilacao(), semEnergia(), oscilacao()])).toBe('SEM_LUZ');
  });

  it.each(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'] as const)(
    'ignora denúncias %s (estado final)',
    (final) => {
      expect(calcularStatusBairro([semEnergia(final), oscilacao(final)])).toBe('NORMAL');
    },
  );

  it('uma sem energia já resolvida não esconde uma oscilação em aberto', () => {
    expect(calcularStatusBairro([semEnergia('RESOLVIDA'), oscilacao()])).toBe('OSCILACAO');
  });

  it('uma oscilação resolvida não impede o SEM_LUZ de outra denúncia', () => {
    expect(calcularStatusBairro([oscilacao('RESOLVIDA'), semEnergia()])).toBe('SEM_LUZ');
  });

  it('não altera a lista recebida', () => {
    const lista = [semEnergia(), oscilacao()];
    const copia = structuredClone(lista);
    calcularStatusBairro(lista);
    expect(lista).toEqual(copia);
  });
});

describe('redeEstavel (RN-008)', () => {
  it('estável só quando o bairro está NORMAL', () => {
    expect(redeEstavel('NORMAL')).toBe(true);
    expect(redeEstavel('OSCILACAO')).toBe(false);
    expect(redeEstavel('SEM_LUZ')).toBe(false);
  });
});

describe('status em aberto e finais (RN-003)', () => {
  it('RECEBIDA e EM_ATENDIMENTO estão em aberto; os demais são finais', () => {
    const emAberto = TODOS_OS_STATUS.filter(estaEmAberto);
    const finais = TODOS_OS_STATUS.filter(ehStatusFinal);
    expect(emAberto).toEqual(['RECEBIDA', 'EM_ATENDIMENTO']);
    expect(finais).toEqual(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA']);
  });

  it('todo status é aberto ou final, nunca os dois', () => {
    for (const status of TODOS_OS_STATUS) {
      expect(estaEmAberto(status)).toBe(!ehStatusFinal(status));
    }
  });
});

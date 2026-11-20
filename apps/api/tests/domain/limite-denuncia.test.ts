import { describe, expect, it } from 'vitest';

import { podeCriarDenuncia } from '../../src/domain';

describe('podeCriarDenuncia (RN-006)', () => {
  it('sem denúncias anteriores, pode criar', () => {
    expect(podeCriarDenuncia([])).toBe(true);
  });

  it.each(['RECEBIDA', 'EM_ATENDIMENTO'] as const)('com uma %s em aberto, não pode', (status) => {
    expect(podeCriarDenuncia([status])).toBe(false);
  });

  it.each(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'] as const)(
    'com denúncia %s (final), pode criar outra',
    (status) => {
      expect(podeCriarDenuncia([status])).toBe(true);
    },
  );

  it('várias finais e nenhuma em aberto: pode', () => {
    expect(podeCriarDenuncia(['RESOLVIDA', 'CANCELADA', 'IMPROCEDENTE', 'RESOLVIDA'])).toBe(true);
  });

  it('uma em aberto no meio de várias finais: não pode', () => {
    expect(podeCriarDenuncia(['RESOLVIDA', 'EM_ATENDIMENTO', 'CANCELADA'])).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { menorPrevisaoFutura, validarMudancaDePrevisao, validarPrevisao } from '../../src/domain';

const agora = new Date('2026-11-18T14:00:00Z');
const depois = (minutos: number) => new Date(agora.getTime() + minutos * 60_000);

describe('validarPrevisao (RN-009)', () => {
  it('aceita uma data futura', () => {
    expect(validarPrevisao(depois(80), agora)).toEqual({ ok: true });
  });

  it('recusa uma data passada', () => {
    expect(validarPrevisao(depois(-1), agora)).toMatchObject({
      ok: false,
      codigo: 'PREVISAO_NO_PASSADO',
    });
  });

  it('recusa o instante atual (não é futuro)', () => {
    expect(validarPrevisao(new Date(agora), agora)).toMatchObject({ ok: false });
  });

  it('recusa uma data inválida', () => {
    expect(validarPrevisao(new Date('lixo'), agora)).toMatchObject({
      ok: false,
      codigo: 'PREVISAO_NO_PASSADO',
    });
  });
});

describe('menorPrevisaoFutura (RN-009, S-03)', () => {
  it('devolve a menor previsão futura', () => {
    const resultado = menorPrevisaoFutura([depois(120), depois(30), depois(60)], agora);
    expect(resultado).toEqual(depois(30));
  });

  it('ignora previsões vencidas e vazias', () => {
    const resultado = menorPrevisaoFutura([depois(-10), null, undefined, depois(45)], agora);
    expect(resultado).toEqual(depois(45));
  });

  it('devolve null quando não há nenhuma previsão futura', () => {
    expect(menorPrevisaoFutura([], agora)).toBeNull();
    expect(menorPrevisaoFutura([null, undefined], agora)).toBeNull();
    expect(menorPrevisaoFutura([depois(-5), new Date(agora)], agora)).toBeNull();
  });
});

describe('validarMudancaDePrevisao (RN-009, RF-033, S-60)', () => {
  const abertas = ['RECEBIDA', 'EM_ATENDIMENTO'] as const;
  const encerradas = ['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'] as const;

  it.each(abertas)('em %s: aceita definir ou trocar por uma data futura', (status) => {
    expect(validarMudancaDePrevisao({ status, previsao: depois(80), agora })).toEqual({ ok: true });
  });

  it.each(abertas)('em %s: aceita REMOVER a previsão (null)', (status) => {
    expect(validarMudancaDePrevisao({ status, previsao: null, agora })).toEqual({ ok: true });
  });

  it.each(abertas)('em %s: recusa data passada, o instante atual e data inválida', (status) => {
    for (const previsao of [depois(-1), new Date(agora), new Date('lixo')]) {
      expect(validarMudancaDePrevisao({ status, previsao, agora })).toMatchObject({
        ok: false,
        codigo: 'PREVISAO_NO_PASSADO',
      });
    }
  });

  it.each(encerradas)('em %s: nada pode mudar (nem definir, nem remover)', (status) => {
    for (const previsao of [depois(80), null]) {
      expect(validarMudancaDePrevisao({ status, previsao, agora })).toMatchObject({
        ok: false,
        codigo: 'TRANSICAO_INVALIDA',
      });
    }
  });

  it('denúncia encerrada é recusada antes de olhar a data', () => {
    expect(
      validarMudancaDePrevisao({ status: 'RESOLVIDA', previsao: depois(-60), agora }),
    ).toMatchObject({ codigo: 'TRANSICAO_INVALIDA' });
  });
});

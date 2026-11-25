import { colors } from '@/theme';
import {
  andamentoDe,
  iconeDaSituacao,
  ROTULOS_DA_SITUACAO,
  ROTULOS_DO_ANDAMENTO,
  rotuloDaSituacao,
  rotuloDoAndamento,
  situacaoDoBairro,
  situacaoDaOcorrencia,
  situacaoDoTipo,
} from './situacao';

describe('situação da energia (linguagem do dia a dia)', () => {
  it('textos: Sem energia, Oscilando e Normal', () => {
    expect(ROTULOS_DA_SITUACAO).toEqual({
      semEnergia: 'Sem energia',
      oscilando: 'Oscilando',
      normal: 'Normal',
    });
    expect(rotuloDaSituacao('oscilando')).toBe('Oscilando');
  });

  it('cada situação tem um ícone diferente', () => {
    expect(iconeDaSituacao('semEnergia')).toBe('flash-off');
    expect(iconeDaSituacao('oscilando')).toBe('pulse');
    expect(iconeDaSituacao('normal')).toBe('checkmark-circle');
    expect(iconeDaSituacao('semEnergia')).toBe(colors.situacao.semEnergia.icone);
  });

  it.each([
    ['SEM_LUZ', 'semEnergia'],
    ['OSCILACAO', 'oscilando'],
    ['NORMAL', 'normal'],
    ['qualquer outra coisa', 'normal'],
  ])('status do bairro %s vira %s', (status, esperado) => {
    expect(situacaoDoBairro(status)).toBe(esperado);
  });

  it.each([
    ['SEM_ENERGIA', 'semEnergia'],
    ['OSCILACAO', 'oscilando'],
  ])('tipo da denúncia %s vira %s', (tipo, esperado) => {
    expect(situacaoDoTipo(tipo)).toBe(esperado);
  });

  it('nenhum texto aparece em maiúsculas', () => {
    for (const texto of [
      ...Object.values(ROTULOS_DA_SITUACAO),
      ...Object.values(ROTULOS_DO_ANDAMENTO),
    ]) {
      expect(texto).not.toBe(texto.toUpperCase());
    }
  });
});

describe('andamento da denúncia', () => {
  it.each([
    ['RECEBIDA', 'Recebida'],
    ['EM_ATENDIMENTO', 'Em atendimento'],
    ['RESOLVIDA', 'Resolvida'],
    ['IMPROCEDENTE', 'Improcedente'],
    ['CANCELADA', 'Cancelada'],
  ])('%s → %s', (status, rotulo) => {
    expect(rotuloDoAndamento(status)).toBe(rotulo);
    expect(andamentoDe(status)).toBe(status);
  });

  it('status desconhecido: sem andamento, e o texto vem como estava', () => {
    expect(andamentoDe('OUTRO')).toBeNull();
    expect(rotuloDoAndamento('OUTRO')).toBe('OUTRO');
  });
});

describe('situacaoDaOcorrencia (marcador do mapa)', () => {
  it.each([
    ['SEM_ENERGIA', 'RECEBIDA', 'semEnergia'],
    ['SEM_ENERGIA', 'EM_ATENDIMENTO', 'semEnergia'],
    ['OSCILACAO', 'RECEBIDA', 'oscilando'],
    ['SEM_ENERGIA', 'RESOLVIDA', 'normal'],
    ['OSCILACAO', 'RESOLVIDA', 'normal'],
  ])('%s em %s → %s', (tipo, status, esperado) => {
    expect(situacaoDaOcorrencia({ tipo, status })).toBe(esperado);
  });
});

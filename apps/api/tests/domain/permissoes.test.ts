import { describe, expect, it } from 'vitest';

import {
  arredondarCoordenada,
  podeVerDenuncia,
  projetarOcorrenciaPublica,
  temPapel,
  type DenunciaParaProjecao,
} from '../../src/domain';

const maria = { id: 'maria', papel: 'CIDADAO' } as const;
const joao = { id: 'joao', papel: 'CIDADAO' } as const;
const carlos = { id: 'carlos', papel: 'OPERADOR' } as const;

describe('temPapel (RN-001)', () => {
  it('aceita só os papéis permitidos', () => {
    expect(temPapel(carlos, 'OPERADOR')).toBe(true);
    expect(temPapel(maria, 'OPERADOR')).toBe(false);
    expect(temPapel(maria, 'CIDADAO', 'OPERADOR')).toBe(true);
    expect(temPapel(maria)).toBe(false);
  });
});

describe('podeVerDenuncia (RN-014)', () => {
  it('o autor vê a própria denúncia', () => {
    expect(podeVerDenuncia(maria, { autorId: 'maria' })).toBe(true);
  });

  it('outro cidadão não vê', () => {
    expect(podeVerDenuncia(joao, { autorId: 'maria' })).toBe(false);
  });

  it('o operador vê qualquer uma', () => {
    expect(podeVerDenuncia(carlos, { autorId: 'maria' })).toBe(true);
    expect(podeVerDenuncia(carlos, { autorId: null })).toBe(true);
  });

  it('denúncia anonimizada não pertence a nenhum cidadão', () => {
    expect(podeVerDenuncia(maria, { autorId: null })).toBe(false);
  });
});

describe('arredondarCoordenada', () => {
  it('arredonda para 3 casas decimais (~110 m)', () => {
    expect(arredondarCoordenada(-5.371234)).toBe(-5.371);
    expect(arredondarCoordenada(-49.12399)).toBe(-49.124);
    expect(arredondarCoordenada(10)).toBe(10);
  });
});

describe('projetarOcorrenciaPublica (RN-014)', () => {
  /** Denúncia "suja": traz campos privados que NUNCA podem sair na visão pública. */
  const denunciaCompleta = {
    id: 'd-1',
    protocolo: 'TL-2026-000123',
    tipo: 'SEM_ENERGIA',
    status: 'RECEBIDA',
    autorId: 'maria',
    autor: { nome: 'Maria Silva', telefone: '(94) 90000-0000', email: 'maria@exemplo.com' },
    bairro: { id: 3, nome: 'Nova Marabá', folha: 'Folha 28' },
    logradouro: 'Av. VP-3',
    cep: '68500-000',
    pontoReferencia: 'Perto da rotatória',
    descricao: 'Estalo forte no poste',
    latitude: -5.371234,
    longitude: -49.123456,
    faixaPessoas: 'DE_4_A_8',
    necessidadeEspecial: true,
    consentimentoNecessidadeEm: new Date('2026-11-18T14:02:10Z'),
    fotos: [{ id: 'f-1', arquivo: 'abc.jpg' }],
    previsaoReparo: new Date('2026-11-18T16:20:00Z'),
    justificativa: null,
    criadoEm: new Date('2026-11-18T14:02:10Z'),
  } as const;

  it('mantém só os campos públicos', () => {
    const publica = projetarOcorrenciaPublica(denunciaCompleta as unknown as DenunciaParaProjecao);

    expect(Object.keys(publica).sort()).toEqual(
      [
        'bairro',
        'criadoEm',
        'descricao',
        'folha',
        'id',
        'latitude',
        'logradouro',
        'longitude',
        'status',
        'tipo',
      ].sort(),
    );
    expect(publica).toMatchObject({
      id: 'd-1',
      tipo: 'SEM_ENERGIA',
      status: 'RECEBIDA',
      bairro: 'Nova Marabá',
      folha: 'Folha 28',
      logradouro: 'Av. VP-3',
      descricao: 'Estalo forte no poste',
      criadoEm: '2026-11-18T14:02:10.000Z',
    });
  });

  it('arredonda as coordenadas para 3 casas', () => {
    const publica = projetarOcorrenciaPublica(denunciaCompleta as unknown as DenunciaParaProjecao);
    expect(publica.latitude).toBe(-5.371);
    expect(publica.longitude).toBe(-49.123);
  });

  it('nunca expõe dados pessoais nem campos privados (inspeção do JSON inteiro)', () => {
    const json = JSON.stringify(
      projetarOcorrenciaPublica(denunciaCompleta as unknown as DenunciaParaProjecao),
    );

    for (const proibido of [
      'Maria Silva',
      'maria@exemplo.com',
      '90000-0000',
      'TL-2026-000123',
      'autor',
      'protocolo',
      'telefone',
      'fotos',
      'abc.jpg',
      'Idosa',
      'necessidade',
      'DE_4_A_8',
      '68500-000',
      'rotatória',
      '-5.371234',
      '-49.123456',
    ]) {
      expect(json).not.toContain(proibido);
    }
  });

  it('mantém coordenadas ausentes como null (GPS negado)', () => {
    const publica = projetarOcorrenciaPublica({
      ...(denunciaCompleta as unknown as DenunciaParaProjecao),
      latitude: null,
      longitude: null,
      descricao: null,
    });
    expect(publica.latitude).toBeNull();
    expect(publica.longitude).toBeNull();
    expect(publica.descricao).toBeNull();
  });
});

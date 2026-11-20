import { describe, expect, it } from 'vitest';

import {
  FILTROS_INICIAIS,
  filtrosSaoOsIniciais,
  montarConsulta,
} from '../src/features/denuncias/consulta';
import { formatarDataHora, tempoDesde } from '../src/features/denuncias/formatacao';
import { corDoPino, temCoordenadas } from '../src/features/denuncias/mapa';
import {
  nomeDoBairro,
  rotuloDoStatus,
  rotuloDoTipo,
  statusEmAberto,
} from '../src/features/denuncias/tipos';
import { lerSessaoSalva, tokenExpirado } from '../src/store/sessao';
import { tokenFalso } from './ajudas';

describe('montarConsulta (RF-029)', () => {
  it('padrão: em aberto, primeira página, 100 por página', () => {
    expect(montarConsulta(FILTROS_INICIAIS)).toEqual({
      status: 'RECEBIDA,EM_ATENDIMENTO',
      page: 1,
      limite: 100,
    });
  });

  it('"Todos" não envia status', () => {
    expect(montarConsulta({ ...FILTROS_INICIAIS, status: 'TODOS' })).not.toHaveProperty('status');
  });

  it('um status específico', () => {
    expect(montarConsulta({ ...FILTROS_INICIAIS, status: 'RESOLVIDA' }).status).toBe('RESOLVIDA');
  });

  it('combina tipo, bairro e prioritárias', () => {
    expect(
      montarConsulta({ status: 'TODOS', tipo: 'OSCILACAO', bairroId: 3, prioritarias: true }, 2),
    ).toEqual({ tipo: 'OSCILACAO', bairroId: 3, prioritarias: true, page: 2, limite: 100 });
  });

  it('não envia filtros vazios ou desligados', () => {
    const q = montarConsulta({ ...FILTROS_INICIAIS, tipo: '', bairroId: '', prioritarias: false });
    expect(Object.keys(q).sort()).toEqual(['limite', 'page', 'status']);
  });

  it('filtrosSaoOsIniciais', () => {
    expect(filtrosSaoOsIniciais(FILTROS_INICIAIS)).toBe(true);
    expect(filtrosSaoOsIniciais({ ...FILTROS_INICIAIS, tipo: 'OSCILACAO' })).toBe(false);
    expect(filtrosSaoOsIniciais({ ...FILTROS_INICIAIS, prioritarias: true })).toBe(false);
    expect(filtrosSaoOsIniciais({ ...FILTROS_INICIAIS, bairroId: 0 })).toBe(false);
  });
});

describe('tempoDesde', () => {
  const agora = Date.parse('2026-11-19T12:00:00Z');
  it.each([
    ['2026-11-19T11:59:40Z', 'agora'],
    ['2026-11-19T11:55:00Z', 'há 5 min'],
    ['2026-11-19T09:00:00Z', 'há 3 h'],
    ['2026-11-18T11:00:00Z', 'há 1 dia'],
    ['2026-11-16T12:00:00Z', 'há 3 dias'],
    ['2026-11-19T12:30:00Z', 'agora'],
    ['abc', ''],
  ])('%s → %s', (iso, esperado) => {
    expect(tempoDesde(iso, agora)).toBe(esperado);
  });
});

describe('formatarDataHora', () => {
  it('usa o horário de Marabá (UTC−3)', () => {
    expect(formatarDataHora('2026-11-20T01:30:00Z')).toBe('19/11/2026 22:30');
    expect(formatarDataHora(null)).toBe('');
    expect(formatarDataHora('x')).toBe('');
  });
});

describe('tipos e mapa', () => {
  it('rótulos e bairro com folha', () => {
    expect(rotuloDoStatus('EM_ATENDIMENTO')).toBe('Em atendimento');
    expect(rotuloDoTipo('OSCILACAO')).toBe('Oscilação');
    expect(rotuloDoStatus('X')).toBe('X');
    expect(nomeDoBairro({ nome: 'Nova Marabá', folha: 'Folha 28' })).toBe('Nova Marabá (Folha 28)');
    expect(nomeDoBairro({ nome: 'Cidade Nova', folha: null })).toBe('Cidade Nova');
    expect(statusEmAberto('RECEBIDA')).toBe(true);
    expect(statusEmAberto('RESOLVIDA')).toBe(false);
  });

  it('cor do pino: vermelho, âmbar ou cinza (encerrada)', () => {
    expect(corDoPino({ tipo: 'SEM_ENERGIA', status: 'RECEBIDA' })).toBe('#ba1a1a');
    expect(corDoPino({ tipo: 'OSCILACAO', status: 'EM_ATENDIMENTO' })).toBe('#ce8300');
    expect(corDoPino({ tipo: 'SEM_ENERGIA', status: 'RESOLVIDA' })).toBe('#6e7a6d');
  });

  it('temCoordenadas exige latitude e longitude', () => {
    expect(temCoordenadas({ latitude: null, longitude: null } as never)).toBe(false);
    expect(temCoordenadas({ latitude: 1, longitude: null } as never)).toBe(false);
    expect(temCoordenadas({ latitude: 1, longitude: 2 } as never)).toBe(true);
  });
});

describe('sessão (ADR-0004)', () => {
  it('tokenExpirado lê o exp do JWT', () => {
    expect(tokenExpirado(tokenFalso(Math.floor(Date.now() / 1000) + 60))).toBe(false);
    expect(tokenExpirado(tokenFalso(Math.floor(Date.now() / 1000) - 60))).toBe(true);
  });

  it.each(['', 'abc', 'a.b.c', 'a.e30.c'])('token inválido "%s" conta como expirado', (t) => {
    expect(tokenExpirado(t)).toBe(true);
  });

  const usuario = { id: 'u', nome: 'N', email: 'e@e.com', papel: 'OPERADOR' };

  it('lerSessaoSalva aceita operador com token válido', () => {
    const token = tokenFalso();
    expect(lerSessaoSalva(JSON.stringify({ token, usuario }))).toEqual({ token, usuario });
  });

  it('descarta token expirado, papel CIDADAO, formato estranho e JSON quebrado', () => {
    expect(lerSessaoSalva(JSON.stringify({ token: tokenFalso(1), usuario }))).toBeNull();
    expect(
      lerSessaoSalva(
        JSON.stringify({ token: tokenFalso(), usuario: { ...usuario, papel: 'CIDADAO' } }),
      ),
    ).toBeNull();
    expect(lerSessaoSalva(JSON.stringify({ token: tokenFalso() }))).toBeNull();
    expect(lerSessaoSalva('{quebrado')).toBeNull();
    expect(lerSessaoSalva(null)).toBeNull();
  });
});

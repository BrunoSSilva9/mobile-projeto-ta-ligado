import { agruparPorBairro, situacaoDoAviso } from './agrupar';
import type { OcorrenciaPublica } from './tipos';

let contador = 0;
const aviso = (extra: Partial<OcorrenciaPublica> = {}): OcorrenciaPublica => ({
  id: `o${++contador}`,
  tipo: 'SEM_ENERGIA',
  status: 'RECEBIDA',
  bairro: 'Nova Marabá',
  folha: 'Folha 28',
  logradouro: 'Av. VP-8',
  descricao: null,
  latitude: null,
  longitude: null,
  criadoEm: '2026-11-19T12:00:00.000Z',
  ...extra,
});

const BAIRROS = [
  { nome: 'Nova Marabá', folha: 'Folha 28', latitude: -5.37, longitude: -49.12 },
  { nome: 'Cidade Nova', folha: null, latitude: -5.35, longitude: -49.1 },
];

describe('situacaoDoAviso', () => {
  it.each([
    [{ tipo: 'SEM_ENERGIA', status: 'RECEBIDA' }, 'semEnergia'],
    [{ tipo: 'SEM_ENERGIA', status: 'EM_ATENDIMENTO' }, 'semEnergia'],
    [{ tipo: 'OSCILACAO', status: 'RECEBIDA' }, 'oscilando'],
    [{ tipo: 'OSCILACAO', status: 'EM_ATENDIMENTO' }, 'oscilando'],
    [{ tipo: 'SEM_ENERGIA', status: 'RESOLVIDA' }, 'normal'],
    [{ tipo: 'OSCILACAO', status: 'RESOLVIDA' }, 'normal'],
  ] as const)('%j → %s', (entrada, esperado) => {
    expect(situacaoDoAviso(entrada)).toBe(esperado);
  });
});

describe('agruparPorBairro (decisão R-03)', () => {
  it('sem ocorrências, não há lugares', () => {
    expect(agruparPorBairro([], BAIRROS)).toEqual([]);
    expect(agruparPorBairro([])).toEqual([]);
  });

  it('um aviso vira um lugar com 1 aviso, o centro do bairro e a data do aviso', () => {
    const [lugar] = agruparPorBairro([aviso()], BAIRROS);

    expect(lugar).toEqual({
      chave: 'Nova Marabá|Folha 28',
      nome: 'Nova Marabá',
      folha: 'Folha 28',
      situacao: 'semEnergia',
      avisos: 1,
      maisRecente: '2026-11-19T12:00:00.000Z',
      centro: { latitude: -5.37, longitude: -49.12 },
    });
  });

  it('vários avisos do mesmo bairro viram um lugar só, com a contagem', () => {
    const lugares = agruparPorBairro([aviso(), aviso(), aviso()], BAIRROS);

    expect(lugares).toHaveLength(1);
    expect(lugares[0]!.avisos).toBe(3);
  });

  it('o mesmo nome com folhas diferentes são lugares diferentes', () => {
    const lugares = agruparPorBairro(
      [aviso({ folha: 'Folha 28' }), aviso({ folha: 'Folha 32' }), aviso({ folha: null })],
      BAIRROS,
    );

    expect(lugares.map((l) => l.chave).sort()).toEqual([
      'Nova Marabá|',
      'Nova Marabá|Folha 28',
      'Nova Marabá|Folha 32',
    ]);
  });

  describe('a situação do lugar é a mais grave entre os avisos (Sem energia > Oscilando > Normal)', () => {
    it.each([
      [['OSCILACAO', 'SEM_ENERGIA'], 'semEnergia'],
      [['SEM_ENERGIA', 'OSCILACAO'], 'semEnergia'],
      [['OSCILACAO', 'OSCILACAO'], 'oscilando'],
    ] as const)('tipos em aberto %j → %s', (tipos, esperado) => {
      const lugares = agruparPorBairro(tipos.map((tipo) => aviso({ tipo })));

      expect(lugares[0]!.situacao).toBe(esperado);
    });

    it('um aviso em aberto vale mais que um resolvido (o resolvido conta como Normal)', () => {
      const lugares = agruparPorBairro([
        aviso({ tipo: 'SEM_ENERGIA', status: 'RESOLVIDA' }),
        aviso({ tipo: 'OSCILACAO', status: 'RECEBIDA' }),
      ]);

      expect(lugares[0]!.situacao).toBe('oscilando');
      expect(lugares[0]!.avisos).toBe(2);
    });

    it('um lugar só com avisos resolvidos é Normal', () => {
      const lugares = agruparPorBairro([
        aviso({ status: 'RESOLVIDA' }),
        aviso({ status: 'RESOLVIDA', tipo: 'OSCILACAO' }),
      ]);

      expect(lugares[0]!.situacao).toBe('normal');
    });
  });

  describe('"Há X min" conta a partir do aviso mais recente do lugar', () => {
    it('escolhe a data mais recente, em qualquer ordem de chegada', () => {
      const datas = [
        '2026-11-19T10:00:00.000Z',
        '2026-11-19T12:30:00.000Z',
        '2026-11-19T11:00:00.000Z',
      ];

      for (const ordem of [datas, [...datas].reverse(), [datas[1]!, datas[0]!, datas[2]!]]) {
        const [lugar] = agruparPorBairro(ordem.map((criadoEm) => aviso({ criadoEm })));
        expect(lugar!.maisRecente).toBe('2026-11-19T12:30:00.000Z');
      }
    });

    it('compara datas de verdade (não texto): fusos diferentes no mesmo instante', () => {
      const [lugar] = agruparPorBairro([
        aviso({ criadoEm: '2026-11-19T12:00:00.000Z' }),
        aviso({ criadoEm: '2026-11-19T08:30:00-03:00' }), // 11:30 UTC: mais antigo
      ]);

      expect(lugar!.maisRecente).toBe('2026-11-19T12:00:00.000Z');
    });
  });

  describe('ordem da lista', () => {
    it('o mais grave primeiro e, empatando, o aviso mais recente primeiro', () => {
      const lugares = agruparPorBairro([
        aviso({ bairro: 'A', folha: null, tipo: 'OSCILACAO', criadoEm: '2026-11-19T12:00:00Z' }),
        aviso({ bairro: 'B', folha: null, tipo: 'SEM_ENERGIA', criadoEm: '2026-11-19T10:00:00Z' }),
        aviso({ bairro: 'C', folha: null, tipo: 'SEM_ENERGIA', criadoEm: '2026-11-19T11:00:00Z' }),
        aviso({ bairro: 'D', folha: null, status: 'RESOLVIDA', criadoEm: '2026-11-19T13:00:00Z' }),
        aviso({ bairro: 'E', folha: null, tipo: 'OSCILACAO', criadoEm: '2026-11-19T12:30:00Z' }),
      ]);

      expect(lugares.map((l) => l.nome)).toEqual(['C', 'B', 'E', 'A', 'D']);
    });

    it('com tudo igual, desempata pelo nome (ordem estável)', () => {
      const mesmaData = '2026-11-19T12:00:00Z';
      const lugares = agruparPorBairro([
        aviso({ bairro: 'Zeta', folha: null, criadoEm: mesmaData }),
        aviso({ bairro: 'Alfa', folha: null, criadoEm: mesmaData }),
      ]);

      expect(lugares.map((l) => l.nome)).toEqual(['Alfa', 'Zeta']);
    });
  });

  describe('centro do bairro (para o "Ver")', () => {
    it('vem de /bairros/status, casando por nome e folha', () => {
      const lugares = agruparPorBairro(
        [aviso(), aviso({ bairro: 'Cidade Nova', folha: null })],
        BAIRROS,
      );

      expect(lugares.find((l) => l.nome === 'Cidade Nova')!.centro).toEqual({
        latitude: -5.35,
        longitude: -49.1,
      });
    });

    it('bairro que não está na lista de status fica sem centro (e o resto segue funcionando)', () => {
      const [lugar] = agruparPorBairro([aviso({ bairro: 'Bairro Novo', folha: null })], BAIRROS);

      expect(lugar!.centro).toBeNull();
      expect(lugar!.avisos).toBe(1);
    });

    it('a mesma folha com nome diferente não casa', () => {
      const [lugar] = agruparPorBairro([aviso({ folha: 'Folha 99' })], BAIRROS);

      expect(lugar!.centro).toBeNull();
    });
  });

  it('não altera a lista de entrada', () => {
    const entrada = [
      aviso({ criadoEm: '2026-11-19T10:00:00Z' }),
      aviso({ criadoEm: '2026-11-19T12:00:00Z' }),
    ];
    const copia = JSON.parse(JSON.stringify(entrada));

    agruparPorBairro(entrada, BAIRROS);

    expect(entrada).toEqual(copia);
  });
});

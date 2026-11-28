import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isoParaCampoDeData } from '../src/features/denuncias/acoes';
import { tituloDoHistorico } from '../src/features/denuncias/tipos';
import { useSessao } from '../src/store/sessao';
import {
  DETALHE,
  erroDaApi,
  limparTudo,
  renderizar,
  resposta,
  SESSAO_DE_OPERADOR,
  simularApi,
} from './ajudas';
import { limparSockets } from './socket';

const PREVISAO = '2030-11-20T20:00:00.000Z'; // 17:00 em Marabá (UTC−3)
const campo = (iso: string) => isoParaCampoDeData(iso);

beforeEach(async () => {
  limparTudo();
  await limparSockets();
  useSessao.getState().entrar(SESSAO_DE_OPERADOR);
});
afterEach(limparTudo);

const abrir = async (rotas: Parameters<typeof simularApi>[0] = {}) => {
  const f = simularApi(rotas);
  renderizar('/denuncias/d1');
  await screen.findByRole('heading', { name: 'TL-2026-000002' });
  return f;
};

const bloco = () => within(screen.getByRole('region', { name: 'Previsão de reparo' }));
const chamadasDePrevisao = (f: ReturnType<typeof simularApi>) =>
  f.mock.calls
    .filter(
      ([u, i]) => String(u).endsWith('/previsao') && (i as { method?: string })?.method === 'PATCH',
    )
    .map(([, i]) => JSON.parse((i as { body: string }).body) as Record<string, unknown>);
const lerDetalhe = (f: ReturnType<typeof simularApi>) =>
  f.mock.calls.filter(([u]) => /\/painel\/denuncias\/d1$/.test(String(u))).length;

describe('P-03 Previsão de reparo (RF-033, RN-009, S-60)', () => {
  it.each(['RECEBIDA', 'EM_ATENDIMENTO'])(
    'em %s: mostra o bloco, "Sem previsão" e o campo',
    async (status) => {
      await abrir({ detalhe: () => resposta(200, { ...DETALHE, status }) });

      expect(bloco().getByText('Sem previsão de reparo')).toBeInTheDocument();
      expect(bloco().getByLabelText('Nova previsão de reparo')).toBeInTheDocument();
      expect(bloco().getByRole('button', { name: 'Salvar previsão' })).toBeInTheDocument();
      expect(bloco().queryByRole('button', { name: 'Remover previsão' })).toBeNull(); // nada a remover
    },
  );

  it.each(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'])(
    'em %s: o bloco não aparece',
    async (status) => {
      await abrir({
        detalhe: () =>
          resposta(200, {
            ...DETALHE,
            status,
            previsaoReparo: PREVISAO,
            justificativa: 'Sem falta de luz.',
          }),
      });

      expect(screen.queryByRole('region', { name: 'Previsão de reparo' })).toBeNull();
    },
  );

  it('com previsão: mostra a atual (horário de Marabá), preenche o campo e oferece "Remover previsão"', async () => {
    await abrir({ detalhe: () => resposta(200, { ...DETALHE, previsaoReparo: PREVISAO }) });

    expect(bloco().getByText('20/11/2030 17:00')).toBeInTheDocument();
    expect((bloco().getByLabelText('Nova previsão de reparo') as HTMLInputElement).value).toBe(
      campo(PREVISAO),
    );
    expect(bloco().getByRole('button', { name: 'Remover previsão' })).toBeInTheDocument();
  });

  it('salvar envia a data em ISO 8601, atualiza a tela com a resposta e não mexe no status', async () => {
    const f = await abrir({
      previsao: () => resposta(200, { ...DETALHE, previsaoReparo: PREVISAO }),
    });
    fireEvent.change(bloco().getByLabelText('Nova previsão de reparo'), {
      target: { value: campo(PREVISAO) },
    });

    fireEvent.click(bloco().getByRole('button', { name: 'Salvar previsão' }));

    await waitFor(() => expect(chamadasDePrevisao(f)).toHaveLength(1));
    expect(chamadasDePrevisao(f)[0]).toEqual({
      previsaoReparo: new Date(campo(PREVISAO)).toISOString(),
    });
    expect(await bloco().findByText('20/11/2030 17:00')).toBeInTheDocument();
    expect(bloco().getByRole('button', { name: 'Remover previsão' })).toBeInTheDocument();
    expect(f.mock.calls.some(([u]) => String(u).endsWith('/status'))).toBe(false);
  });

  it('remover envia null e a tela volta a "Sem previsão de reparo"', async () => {
    const f = await abrir({
      detalhe: () => resposta(200, { ...DETALHE, previsaoReparo: PREVISAO }),
      previsao: () => resposta(200, { ...DETALHE, previsaoReparo: null }),
    });

    fireEvent.click(bloco().getByRole('button', { name: 'Remover previsão' }));

    await waitFor(() => expect(chamadasDePrevisao(f)).toEqual([{ previsaoReparo: null }]));
    expect(await bloco().findByText('Sem previsão de reparo')).toBeInTheDocument();
    expect(bloco().queryByRole('button', { name: 'Remover previsão' })).toBeNull();
    expect((bloco().getByLabelText('Nova previsão de reparo') as HTMLInputElement).value).toBe('');
  });

  it('campo vazio ao salvar: orienta a usar "Remover previsão" e não chama a API', async () => {
    const f = await abrir();

    fireEvent.click(bloco().getByRole('button', { name: 'Salvar previsão' }));

    expect(
      await bloco().findByText('Informe a data e a hora da previsão, ou use "Remover previsão".'),
    ).toBeInTheDocument();
    expect(chamadasDePrevisao(f)).toHaveLength(0);
  });

  it('data no passado: avisa na tela (RN-009) e não chama a API', async () => {
    const f = await abrir();
    fireEvent.change(bloco().getByLabelText('Nova previsão de reparo'), {
      target: { value: '2020-01-01T10:00' },
    });

    fireEvent.click(bloco().getByRole('button', { name: 'Salvar previsão' }));

    expect(
      await bloco().findByText('A previsão de reparo precisa ser uma data futura.'),
    ).toBeInTheDocument();
    expect(chamadasDePrevisao(f)).toHaveLength(0);
  });

  it('erro da API (422 PREVISAO_NO_PASSADO) aparece no bloco', async () => {
    await abrir({
      previsao: () =>
        resposta(422, erroDaApi('PREVISAO_NO_PASSADO', 'A previsão precisa ser futura.')),
    });
    fireEvent.change(bloco().getByLabelText('Nova previsão de reparo'), {
      target: { value: campo(PREVISAO) },
    });

    fireEvent.click(bloco().getByRole('button', { name: 'Salvar previsão' }));

    expect(await bloco().findByText('A previsão precisa ser futura.')).toBeInTheDocument();
  });

  it('o status mudou antes (422 TRANSICAO_INVALIDA): busca a situação atual e o bloco some', async () => {
    let detalhe: Record<string, unknown> = { ...DETALHE };
    const f = await abrir({
      detalhe: () => resposta(200, detalhe),
      previsao: () => {
        detalhe = { ...DETALHE, status: 'CANCELADA' };
        return resposta(422, erroDaApi('TRANSICAO_INVALIDA', 'Não pode mais.'));
      },
    });
    const antes = lerDetalhe(f);
    fireEvent.change(bloco().getByLabelText('Nova previsão de reparo'), {
      target: { value: campo(PREVISAO) },
    });

    fireEvent.click(bloco().getByRole('button', { name: 'Salvar previsão' }));

    await waitFor(() => expect(lerDetalhe(f)).toBeGreaterThan(antes));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Previsão de reparo' })).toBeNull(),
    );
  });

  it('enquanto salva, os botões ficam desativados (sem dois cliques)', async () => {
    let concluir: (r: Response) => void = () => undefined;
    await abrir({ previsao: () => new Promise<Response>((r) => (concluir = r)) as never });
    fireEvent.change(bloco().getByLabelText('Nova previsão de reparo'), {
      target: { value: campo(PREVISAO) },
    });

    fireEvent.click(bloco().getByRole('button', { name: 'Salvar previsão' }));

    await waitFor(() =>
      expect(bloco().getByRole('button', { name: 'Salvar previsão' })).toBeDisabled(),
    );
    expect(bloco().getByRole('status')).toHaveTextContent('Salvando…');
    concluir(resposta(200, { ...DETALHE, previsaoReparo: PREVISAO }));
  });
});

describe('P-03 Histórico com as mudanças da previsão (RN-011, S-60)', () => {
  const historico = [
    {
      statusAnterior: null,
      statusNovo: 'RECEBIDA',
      evento: 'STATUS',
      previsaoReparo: null,
      papel: 'CIDADAO',
      por: 'Maria Silva',
      justificativa: null,
      criadoEm: '2030-11-19T17:00:00.000Z',
    },
    {
      statusAnterior: 'RECEBIDA',
      statusNovo: 'EM_ATENDIMENTO',
      evento: 'STATUS',
      previsaoReparo: PREVISAO,
      papel: 'OPERADOR',
      por: 'Carlos Operador',
      justificativa: null,
      criadoEm: '2030-11-19T17:10:00.000Z',
    },
    {
      statusAnterior: 'EM_ATENDIMENTO',
      statusNovo: 'EM_ATENDIMENTO',
      evento: 'PREVISAO',
      previsaoReparo: '2030-11-21T13:00:00.000Z',
      papel: 'OPERADOR',
      por: 'Carlos Operador',
      justificativa: null,
      criadoEm: '2030-11-19T18:00:00.000Z',
    },
    {
      statusAnterior: 'EM_ATENDIMENTO',
      statusNovo: 'EM_ATENDIMENTO',
      evento: 'PREVISAO',
      previsaoReparo: null,
      papel: 'OPERADOR',
      por: 'Carlos Operador',
      justificativa: null,
      criadoEm: '2030-11-19T19:00:00.000Z',
    },
  ];

  it('o detalhe do painel mostra a previsão definida, trocada e removida, em ordem', async () => {
    await abrir({
      detalhe: () => resposta(200, { ...DETALHE, status: 'EM_ATENDIMENTO', historico }),
    });

    const itens = within(screen.getByRole('region', { name: 'Histórico' })).getAllByRole(
      'listitem',
    );
    expect(itens).toHaveLength(4);
    expect(itens[0]).toHaveTextContent('Recebida');
    expect(itens[1]).toHaveTextContent('Em atendimento');
    expect(itens[1]).toHaveTextContent('Previsão de reparo: 20/11/2030 17:00'); // junto do status
    expect(itens[2]).toHaveTextContent('Previsão de reparo: 21/11/2030 10:00');
    expect(itens[2]).toHaveTextContent('Carlos Operador');
    expect(itens[3]).toHaveTextContent('Previsão de reparo removida');
  });

  it('registros antigos, sem `evento`, continuam sendo mudanças de status', async () => {
    await abrir();

    const itens = within(screen.getByRole('region', { name: 'Histórico' })).getAllByRole(
      'listitem',
    );
    expect(itens[0]).toHaveTextContent('Recebida');
  });
});

describe('tituloDoHistorico e isoParaCampoDeData', () => {
  const formatar = (iso: string) => `<${iso}>`;

  it('STATUS (ou sem evento): o nome do status', () => {
    expect(
      tituloDoHistorico(
        { evento: 'STATUS', statusNovo: 'RESOLVIDA', previsaoReparo: null },
        formatar,
      ),
    ).toBe('Resolvida');
    expect(tituloDoHistorico({ statusNovo: 'RECEBIDA' }, formatar)).toBe('Recebida');
  });

  it('PREVISAO: a data, ou "removida" quando é nula', () => {
    expect(
      tituloDoHistorico(
        { evento: 'PREVISAO', statusNovo: 'RECEBIDA', previsaoReparo: 'X' },
        formatar,
      ),
    ).toBe('Previsão de reparo: <X>');
    expect(
      tituloDoHistorico(
        { evento: 'PREVISAO', statusNovo: 'RECEBIDA', previsaoReparo: null },
        formatar,
      ),
    ).toBe('Previsão de reparo removida');
  });

  it('isoParaCampoDeData: formato do datetime-local; vazio e inválido viram ""', () => {
    expect(isoParaCampoDeData(null)).toBe('');
    expect(isoParaCampoDeData('lixo')).toBe('');
    expect(isoParaCampoDeData(PREVISAO)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

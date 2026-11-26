import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
import { emitir, limparSockets } from './socket';

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

const chamadasDeStatus = (f: ReturnType<typeof simularApi>) =>
  f.mock.calls
    .filter(
      ([u, i]) => String(u).endsWith('/status') && (i as { method?: string })?.method === 'PATCH',
    )
    .map(([, i]) => JSON.parse((i as { body: string }).body) as Record<string, unknown>);

describe('P-03 Detalhe da denúncia (RF-030, RF-036)', () => {
  it('mostra autor, local, ocorrência e histórico', async () => {
    await abrir();

    const autor = within(screen.getByRole('region', { name: 'Autor' }));
    expect(autor.getByText('Maria Silva')).toBeInTheDocument();
    expect(autor.getByText('(94) 90000-0000')).toBeInTheDocument();

    const local = within(screen.getByRole('region', { name: 'Local' }));
    expect(local.getByText('Rua das Flores, 10')).toBeInTheDocument();
    expect(local.getByText('Nova Marabá (Folha 28)')).toBeInTheDocument();
    expect(local.getByText('68500-000')).toBeInTheDocument();
    expect(local.getByText('perto da padaria')).toBeInTheDocument();
    expect(local.getByText('-5.37000, -49.12000')).toBeInTheDocument();

    const ocorrencia = within(screen.getByRole('region', { name: 'Ocorrência' }));
    expect(ocorrencia.getByText('Sem energia')).toBeInTheDocument();
    expect(ocorrencia.getByText('sem luz desde as 14h')).toBeInTheDocument();
    expect(ocorrencia.getByText('4 a 8 pessoas')).toBeInTheDocument();
    expect(
      ocorrencia.getByText('Sim, prioridade (autorizado pelo cidadão em 19/11/2026 14:00)'),
    ).toBeInTheDocument();

    const historico = within(screen.getByRole('region', { name: 'Histórico' }));
    expect(historico.getByText(/Maria Silva · 19\/11\/2026 14:00/)).toBeInTheDocument();
  });

  it('mostra o selo de status e o de prioritária', async () => {
    await abrir();

    const topo = within(screen.getByRole('heading', { name: 'TL-2026-000002' }).closest('header')!);
    expect(topo.getByText('Recebida')).toBeInTheDocument();
    expect(topo.getByText('Prioritária')).toBeInTheDocument();
  });

  it('sem coordenadas e sem telefone, avisa em vez de deixar em branco', async () => {
    await abrir({
      detalhe: () =>
        resposta(200, {
          ...DETALHE,
          latitude: null,
          longitude: null,
          autor: { id: 'u1', nome: 'Maria', telefone: null },
        }),
    });

    expect(screen.getByText('Sem coordenadas (GPS não usado)')).toBeInTheDocument();
    expect(screen.getByText('Não informado')).toBeInTheDocument();
  });

  it.each([
    ['"Não"', { necessidadeEspecial: false, consentimentoNecessidadeEm: null }, 'Não'],
    [
      'sem resposta, em aberto',
      { necessidadeEspecial: null, consentimentoNecessidadeEm: null },
      'Não informada',
    ],
    [
      'apagada ao encerrar (RN-026)',
      {
        status: 'RESOLVIDA',
        prioritaria: false,
        necessidadeEspecial: null,
        consentimentoNecessidadeEm: null,
      },
      'Informação apagada ao encerrar a denúncia',
    ],
  ])(
    'necessidade especial %s: mostra o texto certo, sem texto livre (S-46)',
    async (_n, extra, texto) => {
      await abrir({ detalhe: () => resposta(200, { ...DETALHE, ...extra }) });

      const ocorrencia = within(screen.getByRole('region', { name: 'Ocorrência' }));
      expect(ocorrencia.getByText('Necessidade especial')).toBeInTheDocument();
      expect(ocorrencia.getByText(texto)).toBeInTheDocument();
    },
  );

  it('mostra a faixa como "Pessoas no local"', async () => {
    await abrir();

    const ocorrencia = within(screen.getByRole('region', { name: 'Ocorrência' }));
    expect(ocorrencia.getByText('Pessoas no local')).toBeInTheDocument();
  });

  it('não encontrada (404): mensagem simples', async () => {
    simularApi({
      detalhe: () => resposta(404, erroDaApi('NAO_ENCONTRADO', 'Denúncia não encontrada.')),
    });
    renderizar('/denuncias/d1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Denúncia não encontrada.');
  });

  it('erro: mostra a mensagem e permite tentar de novo', async () => {
    let falhar = true;
    simularApi({
      detalhe: () =>
        falhar
          ? resposta(403, erroDaApi('SEM_PERMISSAO', 'Sem permissão.'))
          : resposta(200, DETALHE),
    });
    renderizar('/denuncias/d1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão.');

    falhar = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('heading', { name: 'TL-2026-000002' })).toBeInTheDocument();
  });

  it('"Voltar à lista" leva ao painel', async () => {
    await abrir();

    fireEvent.click(screen.getByRole('link', { name: /Voltar à lista/ }));

    expect(await screen.findByRole('heading', { name: 'Denúncias' })).toBeInTheDocument();
  });
});

describe('P-03 Ações conforme o status (RN-004)', () => {
  it('recebida: "Iniciar atendimento" e "Improcedente"; sem "Resolver"', async () => {
    await abrir();

    expect(screen.getByRole('button', { name: 'Iniciar atendimento' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Improcedente' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolver' })).toBeNull();
  });

  it('em atendimento: "Resolver" e "Improcedente"; sem "Iniciar atendimento"', async () => {
    await abrir({ detalhe: () => resposta(200, { ...DETALHE, status: 'EM_ATENDIMENTO' }) });

    expect(screen.getByRole('button', { name: 'Resolver' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Improcedente' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar atendimento' })).toBeNull();
    expect(screen.queryByLabelText(/Previsão de reparo/)).toBeNull();
  });

  it.each(['RESOLVIDA', 'IMPROCEDENTE', 'CANCELADA'])(
    '%s: nenhuma ação, só o aviso',
    async (status) => {
      await abrir({ detalhe: () => resposta(200, { ...DETALHE, status }) });

      expect(screen.queryByRole('button', { name: 'Iniciar atendimento' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Resolver' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Improcedente' })).toBeNull();
      expect(screen.getByText(/não pode mais mudar de status/)).toBeInTheDocument();
    },
  );

  it('com a denúncia encerrada, esconde a previsão de reparo antiga', async () => {
    await abrir({
      detalhe: () =>
        resposta(200, {
          ...DETALHE,
          status: 'RESOLVIDA',
          previsaoReparo: '2026-11-20T10:00:00.000Z',
        }),
    });

    expect(screen.queryByText('Previsão de reparo')).toBeNull();
  });
});

describe('P-03 Iniciar atendimento e resolver (RF-031, RF-033)', () => {
  it('iniciar atendimento envia só o status e atualiza a tela com a resposta', async () => {
    const f = await abrir({
      atualizar: () =>
        resposta(200, {
          ...DETALHE,
          status: 'EM_ATENDIMENTO',
          historico: [
            ...DETALHE.historico,
            {
              statusAnterior: 'RECEBIDA',
              statusNovo: 'EM_ATENDIMENTO',
              papel: 'OPERADOR',
              por: 'Carlos Operador',
              justificativa: null,
              criadoEm: '2026-11-19T17:10:00.000Z',
            },
          ],
        }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));

    expect(await screen.findByRole('button', { name: 'Resolver' })).toBeInTheDocument();
    expect(chamadasDeStatus(f)).toEqual([{ status: 'EM_ATENDIMENTO' }]);
    expect(
      within(screen.getByRole('region', { name: 'Histórico' })).getByText(/Carlos Operador/),
    ).toBeInTheDocument();
  });

  it('com previsão de reparo futura, envia a data em ISO 8601', async () => {
    const f = await abrir();
    const futuro = new Date(Date.now() + 3 * 3_600_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const valor = `${futuro.getFullYear()}-${pad(futuro.getMonth() + 1)}-${pad(futuro.getDate())}T${pad(futuro.getHours())}:${pad(futuro.getMinutes())}`;

    fireEvent.change(screen.getByLabelText('Previsão de reparo (opcional)'), {
      target: { value: valor },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));

    await waitFor(() => expect(chamadasDeStatus(f)).toHaveLength(1));
    expect(chamadasDeStatus(f)[0]).toEqual({
      status: 'EM_ATENDIMENTO',
      previsaoReparo: new Date(valor).toISOString(),
    });
  });

  it('previsão no passado: avisa e não chama a API (RN-009)', async () => {
    const f = await abrir();

    fireEvent.change(screen.getByLabelText('Previsão de reparo (opcional)'), {
      target: { value: '2020-01-01T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A previsão de reparo precisa ser uma data futura.',
    );
    expect(chamadasDeStatus(f)).toHaveLength(0);
  });

  it('resolver envia RESOLVIDA e some o painel de ações', async () => {
    const f = await abrir({
      detalhe: () => resposta(200, { ...DETALHE, status: 'EM_ATENDIMENTO' }),
      atualizar: () => resposta(200, { ...DETALHE, status: 'RESOLVIDA' }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Resolver' }));

    expect(await screen.findByText(/não pode mais mudar de status/)).toBeInTheDocument();
    expect(chamadasDeStatus(f)).toEqual([{ status: 'RESOLVIDA' }]);
  });

  it('enquanto salva, os botões ficam desabilitados e um segundo clique não duplica', async () => {
    let concluir: (r: Response) => void = () => undefined;
    const f = await abrir({
      atualizar: () => new Promise<Response>((r) => (concluir = r)) as never,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));

    await screen.findByText('Salvando…');
    expect(screen.getByRole('button', { name: 'Iniciar atendimento' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Improcedente' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));
    concluir(resposta(200, { ...DETALHE, status: 'EM_ATENDIMENTO' }));

    await screen.findByRole('button', { name: 'Resolver' });
    expect(chamadasDeStatus(f)).toHaveLength(1);
  });
});

describe('P-03 Improcedente com justificativa (RN-010)', () => {
  const abrirFormulario = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Improcedente' }));

  it('abre o campo de justificativa e permite voltar', async () => {
    await abrir();

    abrirFormulario();
    expect(screen.getByLabelText('Justificativa (obrigatória)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar atendimento' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('button', { name: 'Iniciar atendimento' })).toBeInTheDocument();
  });

  it('justificativa curta ou vazia: avisa e não chama a API', async () => {
    const f = await abrir();
    abrirFormulario();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar improcedência' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/pelo menos 10 caracteres/);
    expect(screen.getByLabelText('Justificativa (obrigatória)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    fireEvent.change(screen.getByLabelText('Justificativa (obrigatória)'), {
      target: { value: 'curta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar improcedência' }));

    expect(chamadasDeStatus(f)).toHaveLength(0);
  });

  it('com justificativa válida envia IMPROCEDENTE e mostra o motivo no histórico', async () => {
    const motivo = 'Local sem interrupção confirmada pela equipe.';
    const f = await abrir({
      atualizar: () =>
        resposta(200, {
          ...DETALHE,
          status: 'IMPROCEDENTE',
          justificativa: motivo,
          historico: [
            ...DETALHE.historico,
            {
              statusAnterior: 'RECEBIDA',
              statusNovo: 'IMPROCEDENTE',
              papel: 'OPERADOR',
              por: 'Carlos Operador',
              justificativa: motivo,
              criadoEm: '2026-11-19T17:20:00.000Z',
            },
          ],
        }),
    });
    abrirFormulario();

    fireEvent.change(screen.getByLabelText('Justificativa (obrigatória)'), {
      target: { value: `  ${motivo}  ` },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar improcedência' }));

    expect(await screen.findByText(/não pode mais mudar de status/)).toBeInTheDocument();
    expect(chamadasDeStatus(f)).toEqual([{ status: 'IMPROCEDENTE', justificativa: motivo }]);
    expect(screen.getAllByText(motivo).length).toBeGreaterThanOrEqual(2); // ocorrência + histórico
  });
});

describe('P-03 Conflitos e erros (S-29)', () => {
  it('422 TRANSICAO_INVALIDA: avisa que o status mudou e busca a situação atual', async () => {
    let atual = DETALHE as Record<string, unknown>;
    const f = await abrir({
      detalhe: () => resposta(200, atual),
      atualizar: () => {
        atual = { ...DETALHE, status: 'EM_ATENDIMENTO' }; // outro operador chegou antes
        return resposta(
          422,
          erroDaApi('TRANSICAO_INVALIDA', 'Não é possível mudar de RECEBIDA para EM_ATENDIMENTO.'),
        );
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));

    expect(await screen.findByText(/O status mudou enquanto você decidia/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Resolver' })).toBeInTheDocument();
    expect(
      f.mock.calls.filter(
        ([u, i]) =>
          !String(u).endsWith('/status') &&
          String(u).includes('/painel/denuncias/d1') &&
          !(i as { method?: string })?.method?.match(/PATCH/),
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('outro erro (ex.: justificativa recusada pelo servidor) mostra a mensagem', async () => {
    await abrir({
      atualizar: () =>
        resposta(
          422,
          erroDaApi('JUSTIFICATIVA_OBRIGATORIA', 'Informe a justificativa da improcedência.'),
        ),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Improcedente' }));
    fireEvent.change(screen.getByLabelText('Justificativa (obrigatória)'), {
      target: { value: 'uma justificativa longa o bastante' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar improcedência' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe a justificativa da improcedência.',
    );
  });

  it('sem conexão ao salvar: mostra o erro e mantém os botões para tentar de novo', async () => {
    await abrir({
      atualizar: () => {
        throw new TypeError('Failed to fetch');
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar atendimento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Sem conexão/);
    expect(screen.getByRole('button', { name: 'Iniciar atendimento' })).toBeEnabled();
  });
});

describe('P-03 Em tempo real', () => {
  it('quando o status muda em outro lugar, o detalhe aberto busca de novo', async () => {
    let atual = DETALHE as Record<string, unknown>;
    await abrir({ detalhe: () => resposta(200, atual) });
    expect(screen.getByRole('button', { name: 'Iniciar atendimento' })).toBeInTheDocument();

    atual = { ...DETALHE, status: 'EM_ATENDIMENTO' };
    await emitir('denuncia:status-atualizado', {
      id: 'd1',
      status: 'EM_ATENDIMENTO',
      previsaoReparo: null,
    });

    expect(await screen.findByRole('button', { name: 'Resolver' })).toBeInTheDocument();
  });
});

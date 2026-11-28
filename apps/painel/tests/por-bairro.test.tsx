import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSessao } from '../src/store/sessao';
import {
  erroDaApi,
  limparTudo,
  renderizar,
  resposta,
  RESUMO_DE_BAIRROS,
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
  renderizar('/');
  fireEvent.click(await screen.findByRole('tab', { name: 'Por bairro' }));
  await screen.findByRole('heading', { name: 'Nova Marabá (Folha 28)' });
  return f;
};

const chamadasDeLote = (f: ReturnType<typeof simularApi>) =>
  f.mock.calls.filter(([u]) => String(u).endsWith('/resolver'));
const leituras = (f: ReturnType<typeof simularApi>) =>
  f.mock.calls.filter(([u]) => String(u).endsWith('/painel/bairros')).length;
const botaoDe = (nome: string) =>
  screen.getByRole('button', { name: `Resolver todas do bairro ${nome}` });

describe('P-02 aba "Por bairro" (RF-034, RN-016)', () => {
  it('tem a aba ao lado de Lista e Mapa e mostra um cartão por bairro com as contagens', async () => {
    await abrir();

    expect(screen.getByRole('tab', { name: 'Lista' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mapa' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Por bairro', selected: true })).toBeInTheDocument();

    const cartoes = screen.getAllByRole('listitem');
    expect(cartoes).toHaveLength(2);
    const nova = within(cartoes[0]!);
    expect(nova.getByText('3 denúncias em aberto')).toBeInTheDocument();
    expect(nova.getByText(/1 prioritária/)).toBeInTheDocument();
    expect(nova.getByText('Sem energia: 2 · Oscilação: 1')).toBeInTheDocument();
    expect(nova.getByText('Recebidas: 2 · Em atendimento: 1')).toBeInTheDocument();
    const cidade = within(cartoes[1]!);
    expect(cidade.getByText('1 denúncia em aberto')).toBeInTheDocument();
    expect(cidade.queryByText(/prioritária/)).toBeNull();
  });

  it('os filtros da lista não aparecem nesta aba e voltam ao trocar de aba', async () => {
    await abrir();
    expect(screen.queryByLabelText('Status')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Lista' }));

    expect(await screen.findByLabelText('Status')).toBeInTheDocument();
  });

  it('sem denúncias em aberto, diz que não há bairros', async () => {
    simularApi({ resumoBairros: () => resposta(200, { bairros: [] }) });
    renderizar('/');
    fireEvent.click(await screen.findByRole('tab', { name: 'Por bairro' }));

    expect(await screen.findByText('Nenhum bairro com denúncias em aberto.')).toBeInTheDocument();
  });

  it('erro ao carregar: mostra a mensagem e deixa tentar de novo', async () => {
    let falhar = true;
    simularApi({
      resumoBairros: () =>
        falhar
          ? resposta(500, erroDaApi('ERRO_INTERNO', 'Erro inesperado no servidor.'))
          : resposta(200, { bairros: RESUMO_DE_BAIRROS }),
    });
    renderizar('/');
    fireEvent.click(await screen.findByRole('tab', { name: 'Por bairro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro inesperado no servidor.');

    falhar = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByRole('heading', { name: 'Nova Marabá (Folha 28)' }),
    ).toBeInTheDocument();
  });
});

describe('Resolver todas do bairro: confirmação (RN-016)', () => {
  it('abre o diálogo com o título, o aviso e o foco em "Cancelar"', async () => {
    await abrir();

    fireEvent.click(botaoDe('Nova Marabá (Folha 28)'));

    const dialogo = await screen.findByRole('alertdialog', {
      name: 'Resolver todas do bairro Nova Marabá (Folha 28)?',
    });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveTextContent('As 3 denúncias em aberto deste bairro serão marcadas');
    expect(dialogo).toHaveTextContent('não pode ser desfeita');
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('Cancelar fecha o diálogo, não chama a API e devolve o foco ao botão', async () => {
    const f = await abrir();
    const botao = botaoDe('Nova Marabá (Folha 28)');
    botao.focus();
    fireEvent.click(botao);
    await screen.findByRole('alertdialog');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(chamadasDeLote(f)).toHaveLength(0);
    expect(botao).toHaveFocus();
  });

  it('Esc também cancela, sem chamar a API', async () => {
    const f = await abrir();
    fireEvent.click(botaoDe('Cidade Nova'));
    const dialogo = await screen.findByRole('alertdialog');

    fireEvent.keyDown(dialogo, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(chamadasDeLote(f)).toHaveLength(0);
  });

  it('o foco fica preso no diálogo (Tab e Shift+Tab alternam entre os dois botões)', async () => {
    await abrir();
    fireEvent.click(botaoDe('Cidade Nova'));
    const dialogo = await screen.findByRole('alertdialog');
    const cancelar = within(dialogo).getByRole('button', { name: 'Cancelar' });
    const confirmar = within(dialogo).getByRole('button', { name: 'Resolver todas' });

    confirmar.focus();
    fireEvent.keyDown(confirmar, { key: 'Tab' });
    expect(cancelar).toHaveFocus();

    fireEvent.keyDown(cancelar, { key: 'Tab', shiftKey: true });
    expect(confirmar).toHaveFocus();
  });

  it('o texto do diálogo usa o singular quando há uma só denúncia', async () => {
    await abrir();

    fireEvent.click(botaoDe('Cidade Nova'));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'A denúncia em aberto deste bairro será marcada como resolvida',
    );
  });
});

describe('Resolver todas do bairro: resultado', () => {
  it('confirmar chama a API com confirmacao: true, anuncia o resultado e atualiza os cartões', async () => {
    let resolvido = false;
    const f = await abrir({
      resumoBairros: () =>
        resposta(200, { bairros: resolvido ? [RESUMO_DE_BAIRROS[1]] : RESUMO_DE_BAIRROS }),
      resolverBairro: () => {
        resolvido = true;
        return resposta(200, { resolvidas: 3 });
      },
    });
    fireEvent.click(botaoDe('Nova Marabá (Folha 28)'));
    await screen.findByRole('alertdialog');

    fireEvent.click(screen.getByRole('button', { name: 'Resolver todas' }));

    expect(
      await screen.findByText('3 denúncias resolvidas em Nova Marabá (Folha 28).'),
    ).toBeInTheDocument();
    const chamadas = chamadasDeLote(f);
    expect(chamadas).toHaveLength(1);
    expect(String(chamadas[0]![0])).toContain('/painel/bairros/2/resolver');
    expect(JSON.parse((chamadas[0]![1] as { body: string }).body)).toEqual({ confirmacao: true });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Nova Marabá (Folha 28)' })).toBeNull(),
    );
    expect(screen.getByRole('heading', { name: 'Cidade Nova' })).toBeInTheDocument();
  });

  it('uma só resolvida usa o singular', async () => {
    await abrir({ resolverBairro: () => resposta(200, { resolvidas: 1 }) });
    fireEvent.click(botaoDe('Cidade Nova'));
    await screen.findByRole('alertdialog');

    fireEvent.click(screen.getByRole('button', { name: 'Resolver todas' }));

    expect(await screen.findByText('1 denúncia resolvida em Cidade Nova.')).toBeInTheDocument();
  });

  it('erro da API: o diálogo continua aberto com a mensagem em role="alert"', async () => {
    await abrir({
      resolverBairro: () =>
        resposta(500, erroDaApi('ERRO_INTERNO', 'Erro inesperado no servidor.')),
    });
    fireEvent.click(botaoDe('Cidade Nova'));
    await screen.findByRole('alertdialog');

    fireEvent.click(screen.getByRole('button', { name: 'Resolver todas' }));

    const aviso = await within(screen.getByRole('alertdialog')).findByRole('alert');
    expect(aviso).toHaveTextContent('Erro inesperado no servidor.');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
  });
});

describe('Tempo real na aba "Por bairro"', () => {
  it('um evento de status busca o resumo de novo', async () => {
    const f = await abrir();
    const antes = leituras(f);

    await emitir('denuncia:status-atualizado', {
      id: 'd9',
      protocolo: 'TL-2026-000009',
      status: 'RESOLVIDA',
      statusAnterior: 'RECEBIDA',
      alteradoEm: new Date().toISOString(),
      por: 'Equatorial Pará',
      tipo: 'SEM_ENERGIA',
      bairro: { id: 2, nome: 'Nova Marabá', folha: 'Folha 28' },
      previsaoReparo: null,
    });

    await waitFor(() => expect(leituras(f)).toBeGreaterThan(antes));
  });
});

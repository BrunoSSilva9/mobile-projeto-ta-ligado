import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSessao } from '../src/store/sessao';
import {
  erroDaApi,
  INDICADORES,
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

const leituras = (f: ReturnType<typeof simularApi>) =>
  f.mock.calls.filter(([u]) => String(u).endsWith('/painel/indicadores')).length;

const painel = async () =>
  within(await screen.findByRole('region', { name: 'Indicadores dos últimos 30 dias' }));

describe('P-02 indicadores dos últimos 30 dias (RF-018, RN-017, S-52)', () => {
  it('mostra os quatro indicadores com números formatados e a taxa em porcentagem', async () => {
    simularApi();
    renderizar('/');

    const i = await painel();

    expect(i.getByText('Últimos 30 dias')).toBeInTheDocument();
    for (const [rotulo, valor] of [
      ['Usuários cadastrados', '40.532'],
      ['Denúncias registradas', '698'],
      ['Em atendimento', '107'],
      ['Resolvidas', '591'],
    ]) {
      const termo = i.getByText(rotulo!);
      expect(termo.nextElementSibling).toHaveTextContent(valor!);
    }
    expect(i.getByText('Taxa de resolução: 85%')).toBeInTheDocument();
  });

  it('com tudo zero, mostra zeros e 0%', async () => {
    simularApi({
      indicadores: () =>
        resposta(200, {
          ...INDICADORES,
          usuariosCadastrados: 0,
          denunciasRegistradas: 0,
          emAtendimento: 0,
          resolvidas: 0,
          taxaResolucao: 0,
        }),
    });
    renderizar('/');

    const i = await painel();

    expect(i.getByText('Taxa de resolução: 0%')).toBeInTheDocument();
    expect(i.getByText('Resolvidas').nextElementSibling).toHaveTextContent('0');
  });

  it('aparece em qualquer aba (Lista, Mapa e Por bairro)', async () => {
    simularApi();
    renderizar('/');
    await painel();

    for (const aba of ['Mapa', 'Por bairro', 'Lista']) {
      fireEvent.click(screen.getByRole('tab', { name: aba }));
      expect(
        screen.getByRole('region', { name: 'Indicadores dos últimos 30 dias' }),
      ).toBeInTheDocument();
    }
  });

  it('erro: avisa sem derrubar o painel e deixa tentar de novo', async () => {
    let falhar = true;
    simularApi({
      indicadores: () =>
        falhar
          ? resposta(500, erroDaApi('ERRO_INTERNO', 'Erro inesperado no servidor.'))
          : resposta(200, INDICADORES),
    });
    renderizar('/');

    expect(await screen.findByText(/Não foi possível carregar os indicadores/)).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument(); // a lista segue funcionando

    falhar = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect((await painel()).getByText('Taxa de resolução: 85%')).toBeInTheDocument();
  });

  it('um evento de status busca os indicadores de novo', async () => {
    const f = simularApi();
    renderizar('/');
    await painel();
    const antes = leituras(f);

    await emitir('denuncia:status-atualizado', {
      id: 'd9',
      protocolo: 'TL-2026-000009',
      status: 'RESOLVIDA',
      statusAnterior: 'EM_ATENDIMENTO',
      alteradoEm: new Date().toISOString(),
      por: 'Equatorial Pará',
      tipo: 'SEM_ENERGIA',
      bairro: { id: 2, nome: 'Nova Marabá', folha: 'Folha 28' },
      previsaoReparo: null,
    });

    await waitFor(() => expect(leituras(f)).toBeGreaterThan(antes));
  });
});

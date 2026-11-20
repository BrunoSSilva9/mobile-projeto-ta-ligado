import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessao } from '../src/store/sessao';
import {
  DENUNCIA_A,
  DENUNCIA_B,
  erroDaApi,
  limparTudo,
  renderizar,
  resposta,
  SESSAO_DE_OPERADOR,
  simularApi,
  urlsDeDenuncias,
} from './ajudas';

// O Leaflet precisa de layout real (jsdom não tem). O mapa vira marcadores simples que expõem as props.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({
    children,
    center,
    pathOptions,
  }: {
    children: ReactNode;
    center: [number, number];
    pathOptions: { color: string };
  }) => (
    <div data-testid="pino" data-centro={center.join(',')} data-cor={pathOptions.color}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  limparTudo();
  useSessao.getState().entrar(SESSAO_DE_OPERADOR);
});
afterEach(limparTudo);

const tabela = () => screen.findByRole('table');

describe('P-02 Painel: lista (RF-028)', () => {
  it('mostra protocolo, tipo, bairro/rua, status e tempo desde o envio', async () => {
    simularApi();
    renderizar('/');

    const linhas = within(await tabela()).getAllByRole('row');
    expect(linhas).toHaveLength(3); // cabeçalho + 2
    const a = within(linhas[1]!);
    expect(a.getByText('TL-2026-000002')).toBeInTheDocument();
    expect(a.getByText('Sem energia')).toBeInTheDocument();
    expect(a.getByText('Nova Marabá (Folha 28)')).toBeInTheDocument();
    expect(a.getByText('Rua das Flores, 10')).toBeInTheDocument();
    expect(a.getByText('Recebida')).toBeInTheDocument();
    expect(a.getByText('há 5 min')).toBeInTheDocument();
    const b = within(linhas[2]!);
    expect(b.getByText('há 3 h')).toBeInTheDocument();
    expect(b.getByText('Em atendimento')).toBeInTheDocument();
  });

  it('a denúncia prioritária é marcada (na tela e para leitor de tela)', async () => {
    simularApi();
    renderizar('/');

    const linhas = within(await tabela()).getAllByRole('row');
    expect(within(linhas[1]!).getByText('Prioritária')).toBeInTheDocument();
    expect(within(linhas[2]!).getByText('Normal')).toBeInTheDocument();
  });

  it('mantém a ordem recebida da API (prioritárias no topo, RN-015)', async () => {
    simularApi({
      denuncias: () => resposta(200, { itens: [DENUNCIA_B, DENUNCIA_A], pagina: 1, total: 2 }),
    });
    renderizar('/');

    const linhas = within(await tabela()).getAllByRole('row');
    expect(within(linhas[1]!).getByText('TL-2026-000001')).toBeInTheDocument();
  });

  it('"Abrir" leva ao detalhe daquela denúncia, com nome acessível', async () => {
    simularApi();
    renderizar('/');

    const abrir = await screen.findByRole('link', { name: 'Abrir denúncia TL-2026-000002' });

    expect(abrir).toHaveAttribute('href', '/denuncias/d1');
    fireEvent.click(abrir);
    expect(await screen.findByRole('heading', { name: 'TL-2026-000002' })).toBeInTheDocument();
  });

  it('a tabela tem legenda e cabeçalhos de coluna (acessibilidade)', async () => {
    simularApi();
    renderizar('/');

    const t = await tabela();
    expect(within(t).getByText('Denúncias recebidas')).toBeInTheDocument();
    expect(within(t).getAllByRole('columnheader').length).toBeGreaterThanOrEqual(6);
  });

  it('mostra a contagem total', async () => {
    simularApi();
    renderizar('/');

    expect(await screen.findByText('2 denúncias')).toBeInTheDocument();
  });

  it('sem resultados: "Nenhuma denúncia encontrada"', async () => {
    simularApi({ denuncias: () => resposta(200, { itens: [], pagina: 1, total: 0 }) });
    renderizar('/');

    expect(
      await screen.findByText('Nenhuma denúncia encontrada com esses filtros.'),
    ).toBeInTheDocument();
  });

  it('carregando: mostra o aviso antes da resposta', async () => {
    simularApi({ denuncias: () => new Promise<Response>(() => undefined) as never });
    renderizar('/');

    expect(await screen.findByText('Carregando denúncias…')).toBeInTheDocument();
  });

  it('erro: mostra a mensagem e "Tentar novamente" busca de novo', async () => {
    let falhar = true;
    simularApi({
      denuncias: () =>
        falhar
          ? resposta(403, erroDaApi('SEM_PERMISSAO', 'Você não tem permissão para isso.'))
          : resposta(200, { itens: [DENUNCIA_A], pagina: 1, total: 1 }),
    });
    renderizar('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão para isso.');

    falhar = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('TL-2026-000002')).toBeInTheDocument();
  });
});

describe('P-02 Painel: filtros (RF-029)', () => {
  it('ao abrir, pede só as denúncias em aberto', async () => {
    const f = simularApi();
    renderizar('/');
    await tabela();

    const [url] = urlsDeDenuncias(f);
    expect(decodeURIComponent(url!)).toContain('status=RECEBIDA,EM_ATENDIMENTO');
    expect(url).toContain('limite=100');
  });

  it('cada filtro monta a consulta certa', async () => {
    const f = simularApi();
    renderizar('/');
    await tabela();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'RESOLVIDA' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'OSCILACAO' } });
    await waitFor(() =>
      expect(screen.getByLabelText('Bairro')).toHaveTextContent('Nova Marabá (Folha 28)'),
    );
    fireEvent.change(screen.getByLabelText('Bairro'), { target: { value: '2' } });
    fireEvent.click(screen.getByLabelText('Só prioritárias'));

    await waitFor(() => {
      const ultima = decodeURIComponent(urlsDeDenuncias(f).at(-1)!);
      expect(ultima).toContain('status=RESOLVIDA');
      expect(ultima).toContain('tipo=OSCILACAO');
      expect(ultima).toContain('bairroId=2');
      expect(ultima).toContain('prioritarias=true');
      expect(ultima).toContain('page=1');
    });
  });

  it('"Todos" os status não envia o filtro de status', async () => {
    const f = simularApi();
    renderizar('/');
    await tabela();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'TODOS' } });

    await waitFor(() => expect(urlsDeDenuncias(f).at(-1)).not.toContain('status='));
  });

  it('o filtro de bairro lista os bairros com a folha', async () => {
    simularApi();
    renderizar('/');

    expect(
      await screen.findByRole('option', { name: 'Nova Marabá (Folha 28)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cidade Nova' })).toBeInTheDocument();
  });

  it('"Limpar" volta aos filtros iniciais e fica desabilitado quando já estão', async () => {
    const f = simularApi();
    renderizar('/');
    await tabela();
    const limpar = screen.getByRole('button', { name: 'Limpar' });
    expect(limpar).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'OSCILACAO' } });
    expect(limpar).toBeEnabled();
    fireEvent.click(limpar);

    expect(screen.getByLabelText('Tipo')).toHaveValue('');
    expect(screen.getByLabelText('Status')).toHaveValue('ABERTAS');
    // A lista inicial já está em cache (15 s), então não precisa buscar de novo.
    expect(await tabela()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeDisabled();
    expect(decodeURIComponent(urlsDeDenuncias(f)[0]!)).not.toContain('tipo=');
  });

  it('mudar o filtro volta para a primeira página', async () => {
    const f = simularApi({
      denuncias: () => resposta(200, { itens: [DENUNCIA_A], pagina: 1, total: 250 }),
    });
    renderizar('/');
    await screen.findByText('Página 1 de 3');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await screen.findByText('Página 2 de 3');

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'OSCILACAO' } });

    await screen.findByText('Página 1 de 3');
    expect(urlsDeDenuncias(f).at(-1)).toContain('page=1');
  });
});

describe('P-02 Painel: paginação', () => {
  it('só aparece com mais de uma página e navega entre elas', async () => {
    const f = simularApi({
      denuncias: () => resposta(200, { itens: [DENUNCIA_A], pagina: 1, total: 101 }),
    });
    renderizar('/');

    await screen.findByText('Página 1 de 2');
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await screen.findByText('Página 2 de 2');
    expect(urlsDeDenuncias(f).at(-1)).toContain('page=2');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('com uma página só, não mostra a paginação', async () => {
    simularApi();
    renderizar('/');
    await tabela();

    expect(screen.queryByRole('navigation', { name: 'Paginação' })).toBeNull();
  });
});

describe('P-02 Painel: mapa (RF-028)', () => {
  const abrirMapa = async () => {
    await tabela();
    fireEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
  };

  it('as abas alternam entre Lista e Mapa', async () => {
    simularApi();
    renderizar('/');
    await tabela();
    expect(screen.getByRole('tab', { name: 'Lista' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Mapa' }));

    expect(await screen.findByTestId('mapa')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Mapa' })).toHaveAttribute('aria-selected', 'true');
  });

  it('só as denúncias com coordenadas ganham pino; as outras são avisadas', async () => {
    simularApi();
    renderizar('/');
    await abrirMapa();

    const pinos = await screen.findAllByTestId('pino');
    expect(pinos).toHaveLength(1);
    expect(pinos[0]).toHaveAttribute('data-centro', '-5.37,-49.12');
    expect(screen.getByText('1 denúncia sem coordenadas aparece só na lista.')).toBeInTheDocument();
  });

  it('o pino tem a cor do tipo (sem energia em vermelho) e abre o detalhe', async () => {
    simularApi();
    renderizar('/');
    await abrirMapa();

    const pino = await screen.findByTestId('pino');
    expect(pino).toHaveAttribute('data-cor', '#ba1a1a');
    expect(within(pino).getByText('TL-2026-000002')).toBeInTheDocument();
    expect(within(pino).getByRole('link', { name: 'Abrir denúncia' })).toHaveAttribute(
      'href',
      '/denuncias/d1',
    );
  });

  it('pino de denúncia encerrada fica cinza', async () => {
    simularApi({
      denuncias: () =>
        resposta(200, { itens: [{ ...DENUNCIA_A, status: 'RESOLVIDA' }], pagina: 1, total: 1 }),
    });
    renderizar('/');
    await abrirMapa();

    expect(await screen.findByTestId('pino')).toHaveAttribute('data-cor', '#6e7a6d');
  });

  it('o mapa usa a mesma lista filtrada (os filtros valem nas duas abas)', async () => {
    const f = simularApi();
    renderizar('/');
    await abrirMapa();

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'OSCILACAO' } });

    await waitFor(() => expect(urlsDeDenuncias(f).at(-1)).toContain('tipo=OSCILACAO'));
    expect(screen.getByTestId('mapa')).toBeInTheDocument();
  });

  it('a legenda explica as cores', async () => {
    simularApi();
    renderizar('/');
    await abrirMapa();

    const legenda = await screen.findByRole('list', { name: 'Legenda do mapa' });
    expect(within(legenda).getByText('Sem energia (em aberto)')).toBeInTheDocument();
    expect(within(legenda).getByText('Oscilação (em aberto)')).toBeInTheDocument();
    expect(within(legenda).getByText('Encerrada')).toBeInTheDocument();
  });
});

describe('Sessão e rotas protegidas (RF-026)', () => {
  it('mostra o operador logado e "Sair" encerra a sessão e volta ao login', async () => {
    simularApi();
    renderizar('/');
    await tabela();
    expect(screen.getByText('Carlos Operador')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('heading', { name: 'Entre no painel' })).toBeInTheDocument();
    expect(useSessao.getState().token).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('token expirado (401 do servidor): derruba a sessão e leva ao login', async () => {
    simularApi({
      denuncias: () => resposta(401, erroDaApi('NAO_AUTENTICADO', 'Sessão inválida ou expirada.')),
    });
    renderizar('/');

    expect(await screen.findByRole('heading', { name: 'Entre no painel' })).toBeInTheDocument();
    expect(useSessao.getState().token).toBeNull();
  });

  it('envia o token do operador nas chamadas', async () => {
    const f = simularApi();
    renderizar('/');
    await tabela();

    const chamada = f.mock.calls.find(([u]) => String(u).includes('/painel/denuncias'))!;
    expect((chamada[1] as { headers: Record<string, string> }).headers.Authorization).toBe(
      `Bearer ${SESSAO_DE_OPERADOR.token}`,
    );
  });

  it('endereço desconhecido volta ao painel', async () => {
    simularApi();
    renderizar('/qualquer-coisa');

    expect(await screen.findByRole('heading', { name: 'Denúncias' })).toBeInTheDocument();
  });
});

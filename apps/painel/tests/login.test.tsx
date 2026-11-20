import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CHAVE_DA_SESSAO, useSessao } from '../src/store/sessao';
import {
  erroDaApi,
  limparTudo,
  renderizar,
  resposta,
  SESSAO_DE_CIDADAO,
  SESSAO_DE_OPERADOR,
  simularApi,
} from './ajudas';

beforeEach(limparTudo);
afterEach(limparTudo);

const preencher = (email: string, senha: string) => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } });
};
const entrar = () => fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

describe('P-01 Login do operador (RF-026)', () => {
  it('sem sessão, qualquer endereço leva ao login', async () => {
    simularApi();
    renderizar('/denuncias/d1');

    expect(await screen.findByRole('heading', { name: 'Entre no painel' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tá Ligado? Painel da Operadora')).toBeInTheDocument();
  });

  it('login correto guarda a sessão em sessionStorage e abre o painel', async () => {
    const f = simularApi();
    renderizar('/login');

    preencher('operador@taligado.local', 'senha-segura');
    entrar();

    expect(await screen.findByRole('heading', { name: 'Denúncias' })).toBeInTheDocument();
    expect(useSessao.getState().token).toBe(SESSAO_DE_OPERADOR.token);
    expect(window.sessionStorage.getItem(CHAVE_DA_SESSAO)).toContain(SESSAO_DE_OPERADOR.token);
    expect(window.localStorage.length).toBe(0);
    const [url, init] = f.mock.calls.find(([u]) => String(u).includes('/auth/login'))!;
    expect(String(url)).toMatch(/\/api\/v1\/auth\/login$/);
    expect(JSON.parse(init!.body!)).toEqual({
      email: 'operador@taligado.local',
      senha: 'senha-segura',
    });
  });

  it('credenciais erradas: mostra a mensagem do servidor e continua no login', async () => {
    simularApi({
      login: () => resposta(401, erroDaApi('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.')),
    });
    renderizar('/login');

    preencher('operador@taligado.local', 'errada');
    entrar();

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(useSessao.getState().token).toBeNull();
    expect(screen.getByRole('heading', { name: 'Entre no painel' })).toBeInTheDocument();
  });

  it('conta de cidadão é recusada, com instrução para usar o app, e não guarda sessão', async () => {
    simularApi({ login: () => resposta(200, SESSAO_DE_CIDADAO) });
    renderizar('/login');

    preencher('maria@exemplo.com', 'senha-segura');
    entrar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/conta é de cidadão.*aplicativo/i);
    expect(useSessao.getState().token).toBeNull();
    expect(window.sessionStorage.getItem(CHAVE_DA_SESSAO)).toBeNull();
  });

  it('campos vazios ou e-mail inválido: avisa e não chama a API', async () => {
    const f = simularApi();
    renderizar('/login');

    entrar();
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(f).not.toHaveBeenCalled();
  });

  it('sem conexão: mostra o erro em português', async () => {
    simularApi({
      login: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderizar('/login');

    preencher('operador@taligado.local', 'senha-segura');
    entrar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Sem conexão/);
  });

  it('com sessão válida, o login leva direto ao painel', async () => {
    simularApi();
    useSessao.getState().entrar(SESSAO_DE_OPERADOR);
    renderizar('/login');

    expect(await screen.findByRole('heading', { name: 'Denúncias' })).toBeInTheDocument();
  });

  it('sessão salva na aba, mas com token expirado, não vale (volta ao login)', async () => {
    simularApi();
    window.sessionStorage.setItem(
      CHAVE_DA_SESSAO,
      JSON.stringify({
        token: 'a.' + btoa(JSON.stringify({ exp: 1 })) + '.c',
        usuario: SESSAO_DE_OPERADOR.usuario,
      }),
    );
    // A sessão é lida ao carregar o módulo; aqui conferimos a leitura direto.
    const { lerSessaoSalva } = await import('../src/store/sessao');
    expect(lerSessaoSalva(window.sessionStorage.getItem(CHAVE_DA_SESSAO))).toBeNull();
    renderizar('/');
    expect(await screen.findByRole('heading', { name: 'Entre no painel' })).toBeInTheDocument();
  });

  it('o botão de entrar fica ocupado enquanto envia', async () => {
    let concluir: (r: Response) => void = () => undefined;
    simularApi({ login: () => new Promise<Response>((r) => (concluir = r)) as never });
    renderizar('/login');
    preencher('operador@taligado.local', 'senha-segura');

    entrar();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled());
    concluir(resposta(200, SESSAO_DE_OPERADOR));
    await screen.findByRole('heading', { name: 'Denúncias' });
  });
});

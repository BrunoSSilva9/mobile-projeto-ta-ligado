import { screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import PerfilScreen from '@/app/(app)/(tabs)/perfil';
import { queryClient } from '@/services/query-client';
import { CHAVE_DA_SESSAO, useSessao } from '@/store/session';
import {
  armazenamentoEmMemoria,
  configurarCacheParaTestes,
  renderizarTela,
  resposta,
  SESSAO_DE_CIDADAO,
  tocar,
} from '@/testing/ajudas';

jest.mock('@/services/armazenamento', () => {
  const { armazenamentoEmMemoria } = jest.requireActual('@/testing/ajudas');
  return {
    armazenamentoSeguro: {
      ler: async (chave: string) => armazenamentoEmMemoria.get(chave) ?? null,
      gravar: async (chave: string, valor: string) => void armazenamentoEmMemoria.set(chave, valor),
      remover: async (chave: string) => void armazenamentoEmMemoria.delete(chave),
    },
  };
});

beforeAll(configurarCacheParaTestes);
beforeEach(async () => {
  // O Perfil consulta as denúncias do usuário (contador de "em aberto").
  global.fetch = jest.fn(async () =>
    resposta(200, { itens: [], pagina: 1, total: 0 }),
  ) as unknown as typeof fetch;
  armazenamentoEmMemoria.clear();
  queryClient.clear();
  await useSessao.getState().entrar({
    ...SESSAO_DE_CIDADAO,
    usuario: { ...SESSAO_DE_CIDADAO.usuario, telefone: '(94) 90000-0000' },
  });
});

describe('T-08 Perfil mínimo (RF-004, decisão S-37)', () => {
  it('mostra nome, e-mail e telefone da conta', async () => {
    await renderizarTela(<PerfilScreen />);

    expect(screen.getByText('Maria Silva')).toBeTruthy();
    expect(screen.getByText('maria@exemplo.com')).toBeTruthy();
    expect(screen.getByText('(94) 90000-0000')).toBeTruthy();
  });

  it('sem telefone, mostra "Não informado"', async () => {
    await useSessao.getState().entrar(SESSAO_DE_CIDADAO);
    await renderizarTela(<PerfilScreen />);

    expect(screen.getByText('Não informado')).toBeTruthy();
  });

  it('cada dado é lido como uma frase só pelo leitor de tela', async () => {
    await renderizarTela(<PerfilScreen />);

    expect(screen.getByLabelText('E-mail: maria@exemplo.com')).toBeTruthy();
  });

  describe('Sair', () => {
    it('encerra a sessão e apaga o token do aparelho', async () => {
      await renderizarTela(<PerfilScreen />);
      expect(armazenamentoEmMemoria.has(CHAVE_DA_SESSAO)).toBe(true);

      await tocar('Sair');

      await waitFor(() => expect(useSessao.getState().token).toBeNull());
      expect(useSessao.getState().usuario).toBeNull();
      expect(armazenamentoEmMemoria.has(CHAVE_DA_SESSAO)).toBe(false);
    });

    it('apaga os dados em cache do usuário que saiu', async () => {
      queryClient.setQueryData(['minhas-denuncias'], {
        itens: [{ id: 'd1', status: 'RECEBIDA' }],
        pagina: 1,
        total: 1,
      });
      await renderizarTela(<PerfilScreen />);

      await tocar('Sair');

      await waitFor(() => expect(useSessao.getState().token).toBeNull());
      expect(queryClient.getQueryData(['minhas-denuncias'])).toBeUndefined();
    });

    it('o botão tem pelo menos 48 dp de altura (D-02)', async () => {
      await renderizarTela(<PerfilScreen />);
      const botao = screen.getByRole('button', { name: 'Sair' });
      const estilo = StyleSheet.flatten(
        typeof botao.props.style === 'function'
          ? botao.props.style({ pressed: false })
          : botao.props.style,
      ) as { minHeight: number };

      expect(estilo.minHeight).toBeGreaterThanOrEqual(48);
    });
  });
});

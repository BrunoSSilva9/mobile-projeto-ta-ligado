import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessao } from '../src/store/sessao';
import { DETALHE, limparTudo, renderizar, resposta, SESSAO_DE_OPERADOR } from './ajudas';
import { limparSockets } from './socket';

const FOTOS = [
  { id: 'f1', url: '/api/v1/denuncias/d1/fotos/f1' },
  { id: 'f2', url: '/api/v1/denuncias/d1/fotos/f2' },
];
const mockFetch = vi.fn();
const criar = vi.fn(() => 'blob:foto-temporaria');
const revogar = vi.fn();

/** Resposta de uma foto: o painel só usa `ok`, `status` e `blob()`. */
const foto = () =>
  ({
    ok: true,
    status: 200,
    blob: async () => new Blob(['x'], { type: 'image/jpeg' }),
  }) as Response;

function simular(fotos = FOTOS, falhaNaFoto: string | null = null) {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes('/fotos/')) {
      if (falhaNaFoto && url.endsWith(falhaNaFoto)) {
        return resposta(404, {
          erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Foto não encontrada.' },
        });
      }
      return foto();
    }
    if (url.includes('/painel/denuncias/d1')) return resposta(200, { ...DETALHE, fotos });
    throw new Error(`Chamada inesperada: ${url}`);
  });
}

const fotosBaixadas = () =>
  mockFetch.mock.calls.filter(([url]) => String(url).includes('/fotos/')) as [
    string,
    { headers: Record<string, string> },
  ][];

beforeEach(async () => {
  limparTudo();
  await limparSockets();
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
  URL.createObjectURL = criar;
  URL.revokeObjectURL = revogar;
  criar.mockClear();
  revogar.mockClear();
  useSessao.getState().entrar(SESSAO_DE_OPERADOR);
});
afterEach(limparTudo);

describe('P-03 Galeria de fotos (RF-009, RNF-015)', () => {
  it('mostra cada foto com texto alternativo "Foto N de M enviada pelo cidadão"', async () => {
    simular();
    renderizar('/denuncias/d1');

    const secao = await screen.findByRole('region', { name: 'Fotos (2)' });
    expect(
      await within(secao).findByAltText('Foto 1 de 2 enviada pelo cidadão'),
    ).toBeInTheDocument();
    expect(within(secao).getByAltText('Foto 2 de 2 enviada pelo cidadão')).toBeInTheDocument();
  });

  it('baixa cada foto com o token do operador, sem repetir /api/v1 no caminho', async () => {
    simular();
    renderizar('/denuncias/d1');
    await screen.findByAltText('Foto 1 de 2 enviada pelo cidadão');

    const urls = fotosBaixadas().map(([url]) => String(url));
    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/api\/v1\/denuncias\/d1\/fotos\/f1$/),
        expect.stringMatching(/\/api\/v1\/denuncias\/d1\/fotos\/f2$/),
      ]),
    );
    for (const [url, init] of fotosBaixadas()) {
      expect(String(url)).not.toMatch(/\/api\/v1\/api\/v1/);
      expect(init.headers.Authorization).toBe(`Bearer ${SESSAO_DE_OPERADOR.token}`);
    }
  });

  it('sem fotos, não mostra a seção', async () => {
    simular([]);
    renderizar('/denuncias/d1');

    await screen.findByRole('heading', { name: DETALHE.protocolo });
    expect(screen.queryByRole('region', { name: /Fotos/ })).toBeNull();
  });

  it('uma foto que falha mostra o aviso e "Tentar de novo", sem derrubar as outras', async () => {
    simular(FOTOS, 'f2');
    renderizar('/denuncias/d1');

    expect(await screen.findByAltText('Foto 1 de 2 enviada pelo cidadão')).toBeInTheDocument();
    expect(await screen.findByText('Não foi possível carregar a foto 2.')).toBeInTheDocument();

    simular(FOTOS, null);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByAltText('Foto 2 de 2 enviada pelo cidadão')).toBeInTheDocument();
  });

  it('libera o endereço temporário quando a galeria sai da tela', async () => {
    simular();
    const { unmount } = renderizar('/denuncias/d1');
    await screen.findByAltText('Foto 1 de 2 enviada pelo cidadão');
    await waitFor(() => expect(criar).toHaveBeenCalled());

    unmount();

    expect(revogar).toHaveBeenCalledWith('blob:foto-temporaria');
  });
});

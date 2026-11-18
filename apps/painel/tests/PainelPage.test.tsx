import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/App';

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('Painel da Operadora (página inicial)', () => {
  it('mostra o título e a página inicial vazia', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    renderApp();

    expect(screen.getByRole('heading', { name: 'Denúncias' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tá Ligado? Painel da Operadora')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('API online'));
  });

  it('indica "API offline" quando o /health falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('falha de rede')));
    renderApp();

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('API offline'));
  });
});

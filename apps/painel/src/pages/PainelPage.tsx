import { useEffect, useState } from 'react';

type ApiStatus = 'verificando' | 'online' | 'offline';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const ROTULOS: Record<ApiStatus, string> = {
  verificando: 'Verificando API…',
  online: 'API online',
  offline: 'API offline',
};

/** Página inicial vazia (Fase 0). Mostra se a API responde em GET /health. */
export function PainelPage() {
  const [api, setApi] = useState<ApiStatus>('verificando');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/health`, { signal: controller.signal })
      .then((res) => setApi(res.ok ? 'online' : 'offline'))
      .catch((erro: unknown) => {
        if (!(erro instanceof DOMException && erro.name === 'AbortError')) setApi('offline');
      });
    return () => controller.abort();
  }, []);

  const classe = api === 'online' ? 'pill--up' : api === 'offline' ? 'pill--down' : '';

  return (
    <>
      <header className="topbar">
        <div className="logo" aria-label="Tá Ligado? Painel da Operadora">
          <span className="logo__name">
            Tá Ligado<span className="logo__mark">?</span>
          </span>
          <span className="logo__tagline">Painel da Operadora</span>
        </div>
        <span className={`pill ${classe}`} role="status">
          <span className="pill__dot" aria-hidden="true" />
          {ROTULOS[api]}
        </span>
      </header>
      <main className="page">
        <section className="card">
          <span className="card__badge">P-02 · EM CONSTRUÇÃO</span>
          <h1>Denúncias</h1>
          <p>
            Lista, mapa e agrupamento por bairro das denúncias recebidas em tempo real. Esta tela é
            implementada na Fase 1.
          </p>
        </section>
      </main>
    </>
  );
}

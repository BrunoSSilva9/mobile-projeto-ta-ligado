import { Link, useParams } from 'react-router-dom';

/** P-03: o detalhe e as ações de status chegam no Passo 10. */
export function DetalhePage() {
  const { id } = useParams();
  return (
    <main className="painel">
      <section className="card">
        <span className="card__badge">P-03 · EM CONSTRUÇÃO</span>
        <h1>Detalhe da denúncia</h1>
        <p>Denúncia {id}: dados, histórico e atualização de status.</p>
        <p>
          <Link to="/">Voltar à lista</Link>
        </p>
      </section>
    </main>
  );
}

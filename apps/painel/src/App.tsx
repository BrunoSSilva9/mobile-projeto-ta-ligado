import { Route, Routes } from 'react-router-dom';

import { PainelPage } from './pages/PainelPage';

/** Rotas do painel. Login (P-01) e detalhe (P-03) entram na Fase 1. */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<PainelPage />} />
      <Route path="*" element={<PainelPage />} />
    </Routes>
  );
}

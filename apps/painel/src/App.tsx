import { Navigate, Route, Routes } from 'react-router-dom';

import { RotaProtegida } from './components/RotaProtegida';
import { DetalhePage } from './pages/DetalhePage';
import { LoginPage } from './pages/LoginPage';
import { PainelPage } from './pages/PainelPage';

/** Rotas do painel: só o login é público; o resto exige sessão de operador (RF-026). */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RotaProtegida />}>
        <Route path="/" element={<PainelPage />} />
        <Route path="/denuncias/:id" element={<DetalhePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

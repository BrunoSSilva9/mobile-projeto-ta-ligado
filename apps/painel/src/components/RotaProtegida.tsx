import { Navigate, Outlet } from 'react-router-dom';

import { useSessao } from '../store/sessao';
import { BarraSuperior } from './BarraSuperior';

/** Sem sessão (ou com a sessão derrubada por token expirado), só existe o login. */
export function RotaProtegida() {
  const logado = useSessao((s) => s.token !== null);
  if (!logado) return <Navigate to="/login" replace />;
  return (
    <>
      <BarraSuperior />
      <Outlet />
    </>
  );
}

import { useState } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { AdminPage } from '../features/administration/AdminPage';
import { LoginPage } from '../features/auth/LoginPage';
import { SchedulePage } from '../features/schedule/SchedulePage';
import type { Role } from '../shared/types';
import { Alert, Button } from '../shared/ui';
import { rolePath, useSession } from './session';
function Protected({ role }: { role: Role }) {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={rolePath[user.role]} replace />;
  return <Outlet />;
}
function Shell() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function exit() {
    setBusy(true);
    try {
      if (user) await logout();
    } catch {
      setError('Sessão local encerrada. Não foi possível confirmar a saída no servidor.');
    } finally {
      setBusy(false);
      navigate('/login');
    }
  }
  return (
    <>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="brand flex-wrap">
            <img src={`${import.meta.env.BASE_URL}anhanguera.svg`} alt="" width={48} height={48} />
            <span>UNIVERSIDADE ANHANGUERA</span>
            <span className="muted rounded-full border border-slate-200 px-3 py-1">
              {user
                ? { ADMIN: 'Administrador', COORDINATOR: 'Coordenador', PROFESSOR: 'Professor' }[
                    user.role
                  ]
                : 'Aluno'}
            </span>
          </div>
          <div className="actions">
            <span className="font-semibold">{user?.name}</span>
            <Button variant="secondary" disabled={busy} onClick={() => void exit()}>
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <Alert>{error}</Alert>
        <Outlet />
      </main>
    </>
  );
}
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Shell />}>
        <Route path="/aluno" element={<SchedulePage audience="student" />} />
        <Route element={<Protected role="ADMIN" />}>
          <Route path="/administracao" element={<AdminPage />} />
        </Route>
        <Route element={<Protected role="COORDINATOR" />}>
          <Route path="/coordenacao" element={<SchedulePage audience="coordinator" />} />
        </Route>
        <Route element={<Protected role="PROFESSOR" />}>
          <Route path="/professor" element={<SchedulePage audience="professor" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from './lib/api';
import { setCurrencySymbol } from './lib/format';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import SetupPage from './pages/SetupPage';
import OverviewPage from './pages/OverviewPage';
import PosPage from './pages/PosPage';
import OrdersPage from './pages/OrdersPage';
import ReportsPage from './pages/ReportsPage';
import MenuPage from './pages/MenuPage';
import StaffPage from './pages/StaffPage';
import SettingsPage from './pages/SettingsPage';
import AuditPage from './pages/AuditPage';

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="app-loading"><span className="brand-mark">✳</span><span>Opening your workspace…</span></div>;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, isLoading } = useAuth();
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (settings.data?.currencySymbol) setCurrencySymbol(settings.data.currencySymbol);
  }, [settings.data]);

  if (isLoading) {
    return <div className="app-loading"><span className="brand-mark">✳</span><span>Opening your workspace…</span></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <SetupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChartNoAxesCombined, ChevronDown, ClipboardList, History, LayoutDashboard, LogOut,
  Menu as MenuIcon, Moon, Search, Settings, Soup, Sun, Utensils, Users, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Avatar } from './UI';

const WORKSPACE = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/pos', label: 'Point of sale', icon: Soup },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
];

const MANAGE = [
  { to: '/menu', label: 'Menu items', icon: Utensils, admin: true },
  { to: '/staff', label: 'Staff', icon: Users, admin: true },
  { to: '/audit', label: 'Activity log', icon: History, admin: true },
  { to: '/settings', label: 'Settings', icon: Settings, admin: true },
];

const TITLES = {
  '/': 'Overview',
  '/pos': 'Point of sale',
  '/orders': 'Orders',
  '/reports': 'Reports',
  '/menu': 'Menu items',
  '/staff': 'Staff',
  '/audit': 'Activity log',
  '/settings': 'Settings',
};

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('pos-theme') || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('pos-theme', theme);
  }, [theme]);
  return [theme, () => setTheme((current) => (current === 'light' ? 'dark' : 'light'))];
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [theme, toggleTheme] = useTheme();

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings'), staleTime: 5 * 60_000 });

  useEffect(() => {
    setDrawer(false);
    setUserMenu(false);
  }, [location.pathname]);

  const navItem = ({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      {drawer && <button className="drawer-scrim" aria-label="Close menu" onClick={() => setDrawer(false)} />}
      <aside className={`sidebar ${drawer ? 'sidebar--open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">✳</span>
          <span className="brand-name">
            {settings?.restaurantName || 'Table & Thyme'}
            <small>RESTAURANT POS</small>
          </span>
          <button className="icon-button sidebar-close" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <div className="branch-chip">
          <i className="live-dot" />
          <span>Main restaurant</span>
          <span className="branch-chip__chevron">⌄</span>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <nav className="nav-group">{WORKSPACE.map(navItem)}</nav>

        <p className="nav-label nav-label--spaced">MANAGE</p>
        <nav className="nav-group">{MANAGE.filter((item) => !item.admin || user?.role === 'admin').map(navItem)}</nav>

        <div className="sidebar-foot">
          <div className="sidebar-tip">
            <span>✦</span>
            <div>
              <strong>Service, made simpler</strong>
              <small>Everything your team needs.</small>
            </div>
          </div>
          <button className="profile-row" onClick={signOut} title="Sign out">
            <Avatar name={user?.name} />
            <span className="profile-copy">
              <strong>{user?.name}</strong>
              <small>{user?.role === 'admin' ? 'Administrator' : 'Cashier'}</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-toggle" onClick={() => setDrawer(true)} aria-label="Open menu"><MenuIcon size={20} /></button>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="breadcrumb-sep">/</span>
            <strong>{TITLES[location.pathname] || 'Workspace'}</strong>
          </div>
          <div className="topbar-right">
            <label className="global-search">
              <Search size={16} />
              <input
                placeholder="Quick search orders…"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    navigate(`/orders?q=${encodeURIComponent(event.currentTarget.value)}`);
                    event.currentTarget.value = '';
                  }
                }}
              />
              <kbd>↵</kbd>
            </label>
            <span className="service-status"><i className="live-dot" /> Service is open</span>
            <span className="today-date">{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span>
            <button className="icon-button" onClick={toggleTheme} aria-label="Toggle colour theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="user-menu-wrap">
              <button className="user-menu-trigger" onClick={() => setUserMenu((open) => !open)}>
                <Avatar name={user?.name} size="small" />
                <ChevronDown size={14} />
              </button>
              {userMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown__head">
                    <strong>{user?.name}</strong>
                    <small>{user?.email}</small>
                  </div>
                  <button onClick={() => navigate('/settings')}><Settings size={15} /> Settings</button>
                  <button onClick={signOut}><LogOut size={15} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content"><Outlet /></div>
      </main>
    </div>
  );
}

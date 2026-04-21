import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BookOpen,
  UserCog,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

import './AdminLayout.css';

const NAV = [
  { section: 'Principal' },
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },

  { section: 'Gestión' },
  { path: '/admin/alumnos', icon: Users, label: 'Alumnos' },
  { path: '/admin/encuestas', icon: ClipboardList, label: 'Encuestas' },
  { path: '/admin/biblioteca', icon: BookOpen, label: 'Biblioteca' },

  { section: 'Configuración', roles: ['admin', 'director'] },
  {
    path: '/admin/usuarios',
    icon: UserCog,
    label: 'Usuarios del Sistema',
    roles: ['admin', 'director'],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    nav('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  const roleLabel = {
    admin: 'Administrador',
    director: 'Director',
    tutor: 'Tutor',
    docente: 'Docente',
  };

  const roleBg = {
    admin: '#1a56db',
    director: '#7c3aed',
    tutor: '#059669',
    docente: '#d97706',
  };

  const currentPage =
    NAV.find(
      (n) =>
        n.path &&
        (n.exact ? loc.pathname === n.path : loc.pathname.startsWith(n.path))
    )?.label || 'Dashboard';

  return (
    <div className="app">
      {menuOpen && <div className="sidebar-overlay" onClick={closeMenu} />}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-mobile-head">
          <button
            className="sidebar-close-btn"
            onClick={closeMenu}
            aria-label="Cerrar menú"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="sidebar-logo">
          <div className="sidebar-icon">
            <ClipboardList size={20} strokeWidth={2} />
          </div>
          <div className="sidebar-title">
            IE 40122
            <br />
            Manuel Scorza
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) => {
            if (item.section) {
              if (item.roles && !item.roles.includes(user?.role)) return null;
              return (
                <div key={i} className="nav-section">
                  {item.section}
                </div>
              );
            }

            if (item.roles && !item.roles.includes(user?.role)) return null;

            const active = item.exact
              ? loc.pathname === item.path
              : loc.pathname.startsWith(item.path);

            const Icon = item.icon;

            return (
              <button
                key={item.path}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => {
                  nav(item.path);
                  closeMenu();
                }}
              >
                <span className="icon">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-box">
            <div
              className="avatar"
              style={{ background: roleBg[user?.role] || '#1a56db' }}
            >
              {(user?.nombre || 'A')[0]}
            </div>

            <div>
              <div className="user-name">
                {user?.apellido_paterno} {user?.nombre}
              </div>
              <div className="user-role">
                {roleLabel[user?.role] || user?.role}
              </div>
            </div>
          </div>

          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span className="icon">
              <LogOut size={18} strokeWidth={1.8} />
            </span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div className="topbar-left">
            <button
              className="menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} strokeWidth={2} />
            </button>

            <div className="topbar-title">{currentPage}</div>
          </div>

          <div className="topbar-user">
            <span className="topbar-date">
              {new Date().toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>

            <div
              className="avatar avatar-sm"
              style={{ background: roleBg[user?.role] || '#1a56db' }}
            >
              {(user?.nombre || 'A')[0]}
            </div>
          </div>
        </div>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
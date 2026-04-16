import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { section: 'Principal' },
  { path: '/admin', icon: '📊', label: 'Dashboard', exact: true },
  { section: 'Gestión' },
  { path: '/admin/alumnos', icon: '👨‍🎓', label: 'Alumnos' },
  { path: '/admin/encuestas', icon: '📋', label: 'Encuestas' },
  { path: '/admin/biblioteca', icon: '📚', label: 'Biblioteca' },
  { section: 'Configuración', roles: ['admin','director'] },
  { path: '/admin/usuarios', icon: '👥', label: 'Usuarios del Sistema', roles: ['admin','director'] },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const handleLogout = () => { logout(); nav('/login'); };

  const roleLabel = { admin:'Administrador', director:'Director', tutor:'Tutor', docente:'Docente' };
  const roleBg = { admin:'#1a56db', director:'#7c3aed', tutor:'#059669', docente:'#d97706' };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-icon">📋</div>
          <div className="sidebar-title">IE 40122<br/>Manuel Scorza</div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item, i) => {
            if (item.section) {
              if (item.roles && !item.roles.includes(user?.role)) return null;
              return <div key={i} className="nav-section">{item.section}</div>;
            }
            if (item.roles && !item.roles.includes(user?.role)) return null;
            const active = item.exact ? loc.pathname === item.path : loc.pathname.startsWith(item.path);
            return (
              <button key={item.path} className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => nav(item.path)}>
                <span className="icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <div className="avatar" style={{width:36,height:36,background:roleBg[user?.role]||'#1a56db',fontSize:14}}>
              {(user?.nombre||'A')[0]}
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'white',lineHeight:1.2}}>
                {user?.apellido_paterno} {user?.nombre}
              </div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{roleLabel[user?.role]||user?.role}</div>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout} style={{color:'rgba(255,255,255,.5)'}}>
            <span className="icon">🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        <div className="topbar">
          <div className="topbar-title">
            {NAV.find(n => n.path && (n.exact ? loc.pathname===n.path : loc.pathname.startsWith(n.path)))?.label || 'Dashboard'}
          </div>
          <div className="topbar-user">
            <span style={{fontSize:12,color:'var(--g500)'}}>
              {new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'})}
            </span>
            <div className="avatar" style={{width:34,height:34,background:roleBg[user?.role]||'#1a56db',fontSize:13}}>
              {(user?.nombre||'A')[0]}
            </div>
          </div>
        </div>
        <div className="content">
          <Outlet/>
        </div>
      </div>
    </div>
  );
}

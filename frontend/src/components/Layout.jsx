import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/vault',    label: 'Vault' },
  { path: '/nominees', label: 'Nominees' },
  { path: '/deadman',  label: "Dead Man's Switch" },
  { path: '/messages', label: 'Messages' },
  { path: '/test',     label: '🧪 Test' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, letterSpacing: '3px', color: 'var(--gold)' }}>
            ESTATE VAULT
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {navItems.map(({ path, label }) => (
              <Link key={path} to={path} style={{
                padding: '6px 14px', fontSize: 11, letterSpacing: '0.1em', textDecoration: 'none',
                color: location.pathname === path ? 'var(--gold)' : 'var(--muted)',
                background: location.pathname === path ? 'rgba(201,168,76,0.08)' : 'transparent',
                borderRadius: 2, transition: 'color 0.2s',
              }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{user?.email}</span>
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: '40px 24px' }}>{children}</main>
    </div>
  );
}

export function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = (() => { try { return JSON.parse(localStorage.getItem('ev_admin') || 'null'); } catch { return null; } })();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', background: '#0d0d14', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, letterSpacing: '3px', color: 'var(--gold)' }}>ESTATE VAULT</div>
          <span style={{ padding: '3px 10px', background: 'rgba(196,85,85,0.1)', border: '1px solid rgba(196,85,85,0.3)', borderRadius: 2, fontSize: 9, color: '#c45555', letterSpacing: '0.2em' }}>Admin</span>
          <Link to="/admin/panel" style={{ fontSize: 11, color: location.pathname === '/admin/panel' ? 'var(--gold)' : 'var(--muted)', textDecoration: 'none' }}>
            Death Requests
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{admin?.email}</span>
          <button onClick={() => { localStorage.removeItem('ev_admin_token'); localStorage.removeItem('ev_admin'); navigate('/admin/login'); }}
            style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: '40px 24px' }}>{children}</main>
    </div>
  );
}

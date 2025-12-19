import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import { LogOut, LayoutDashboard, Package, ArrowDownCircle, BarChart3 } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/stock-entry', label: 'Stok Giriş', icon: Package },
    { path: '/stock-output', label: 'Personel Çıkış', icon: ArrowDownCircle },
    { path: '/stock-status', label: 'Stok Durumu', icon: BarChart3 },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        background: '#000000',
        color: 'white',
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <img src="/Kaptan.png" alt="Kaptan Logo" style={{ width: '40px', height: '40px' }} />
            <h1 style={{ fontSize: '26px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>Kaptan</h1>
          </div>
          <p style={{ fontSize: '11px', color: '#999', marginTop: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Kolay ERP Sistemleri</p>
        </div>
        
        <nav style={{ flex: 1, padding: '20px 0' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 20px',
                  color: isActive ? '#fff' : '#999',
                  background: isActive ? '#1a1a1a' : 'transparent',
                  textDecoration: 'none',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#1a1a1a';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#999';
                  }
                }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={20} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', background: '#ffffff' }}>
        {children}
      </main>
    </div>
  );
}


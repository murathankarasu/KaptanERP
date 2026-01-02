import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, LogOut, Bot, Activity, Building2 } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: 'users' | 'companies' | 'errors' | 'ai-alerts' | 'activity-logs';
  onTabChange?: (tab: 'users' | 'companies' | 'errors' | 'ai-alerts' | 'activity-logs') => void;
}

export default function AdminLayout({ children, activeTab: externalActiveTab, onTabChange }: AdminLayoutProps) {
  const navigate = useNavigate();
  const [internalActiveTab, setInternalActiveTab] = useState<'users' | 'companies' | 'errors' | 'ai-alerts' | 'activity-logs'>('users');
  
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  
  const handleTabChange = (tab: 'users' | 'companies' | 'errors' | 'ai-alerts' | 'activity-logs') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/admin-login');
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      {/* Admin Sidebar */}
      <div style={{
        width: '280px',
        background: '#1a1a1a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '2px solid #000',
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        zIndex: 1000
      }}>
        {/* Logo */}
        <div style={{
          padding: '30px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <img 
            src="/Kaptan.png" 
            alt="Kaptan Logo" 
            style={{ width: '40px', height: '40px' }} 
          />
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#fff',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              Kaptan
            </h2>
            <p style={{
              fontSize: '9px',
              color: '#999',
              margin: 0,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Admin Panel
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          flex: 1,
          padding: '20px 0',
          overflowY: 'auto'
        }}>
          <div
            onClick={() => handleTabChange('users')}
            style={{
              padding: '15px 20px',
              cursor: 'pointer',
              background: activeTab === 'users' ? '#000' : 'transparent',
              borderLeft: activeTab === 'users' ? '4px solid #fff' : '4px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              color: activeTab === 'users' ? '#fff' : '#ccc'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'users') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'users') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ccc';
              }
            }}
          >
            <Users size={20} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Kullanıcı Yönetimi</span>
          </div>

          <div
            onClick={() => handleTabChange('companies')}
            style={{
              padding: '15px 20px',
              cursor: 'pointer',
              background: activeTab === 'companies' ? '#000' : 'transparent',
              borderLeft: activeTab === 'companies' ? '4px solid #fff' : '4px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              color: activeTab === 'companies' ? '#fff' : '#ccc'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'companies') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'companies') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ccc';
              }
            }}
          >
            <Building2 size={20} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Şirket Yönetimi</span>
          </div>

          <div
            onClick={() => handleTabChange('errors')}
            style={{
              padding: '15px 20px',
              cursor: 'pointer',
              background: activeTab === 'errors' ? '#000' : 'transparent',
              borderLeft: activeTab === 'errors' ? '4px solid #fff' : '4px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              color: activeTab === 'errors' ? '#fff' : '#ccc'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'errors') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'errors') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ccc';
              }
            }}
          >
            <AlertTriangle size={20} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Hata Logları</span>
          </div>

          <div
            onClick={() => handleTabChange('ai-alerts')}
            style={{
              padding: '15px 20px',
              cursor: 'pointer',
              background: activeTab === 'ai-alerts' ? '#000' : 'transparent',
              borderLeft: activeTab === 'ai-alerts' ? '4px solid #fff' : '4px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              color: activeTab === 'ai-alerts' ? '#fff' : '#ccc'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'ai-alerts') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'ai-alerts') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ccc';
              }
            }}
          >
            <Bot size={20} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>AI Uyarılar</span>
          </div>

          <div
            onClick={() => handleTabChange('activity-logs')}
            style={{
              padding: '15px 20px',
              cursor: 'pointer',
              background: activeTab === 'activity-logs' ? '#000' : 'transparent',
              borderLeft: activeTab === 'activity-logs' ? '4px solid #fff' : '4px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              color: activeTab === 'activity-logs' ? '#fff' : '#ccc'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'activity-logs') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'activity-logs') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ccc';
              }
            }}
          >
            <Activity size={20} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Aktivite Logları</span>
          </div>
        </div>

        {/* Logout Button */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              color: '#fff',
              border: '2px solid #fff',
              borderRadius: '0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#fff';
            }}
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: '280px',
        background: '#fff',
        minHeight: '100vh'
      }}>
        {children}
      </div>
    </div>
  );
}

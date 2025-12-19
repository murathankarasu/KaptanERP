import { useState } from 'react';
import { verifyPassword } from '../services/userService';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn } from 'lucide-react';

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!username || !password) {
      setError('Kullanıcı adı ve şifre gereklidir');
      setLoading(false);
      return;
    }

    try {
      const user = await verifyPassword(username, password);
      if (user && user.role === 'admin') {
        // Admin bilgilerini localStorage'a kaydet
        localStorage.setItem('currentUser', JSON.stringify({
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }));
        
        navigate('/admin-panel');
      } else {
        setError('Admin yetkisi bulunmamaktadır');
      }
    } catch (err: any) {
      setError(err.message || 'Giriş yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#ffffff',
      overflow: 'hidden'
    }}>
      {/* Sol taraf - Animasyonlar */}
      <div 
        className="login-animation-container"
        style={{
          flex: '1',
          background: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Animated Background Grid */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite',
          opacity: 0.5
        }} />
        
        {/* Floating Boxes */}
        <div style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          border: '2px solid rgba(0,0,0,0.1)',
          top: '15%',
          left: '10%',
          animation: 'floatBox 8s ease-in-out infinite',
          borderRadius: '8px'
        }} />
        <div style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          border: '2px solid rgba(0,0,0,0.08)',
          top: '60%',
          left: '15%',
          animation: 'floatBox 10s ease-in-out infinite 2s',
          borderRadius: '8px'
        }} />
        
        {/* Floating Icons */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '20%',
          animation: 'floatIcon 6s ease-in-out infinite',
          opacity: 0.15
        }}>
          <Shield size={60} color="#000" />
        </div>
        
        {/* CSS Animations */}
        <style>{`
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
          }
          
          @keyframes floatBox {
            0%, 100% { 
              transform: translateY(0px) rotate(0deg);
              opacity: 0.1;
            }
            50% { 
              transform: translateY(-30px) rotate(5deg);
              opacity: 0.2;
            }
          }
          
          @keyframes floatIcon {
            0%, 100% { 
              transform: translateY(0px) translateX(0px) rotate(0deg);
            }
            25% { 
              transform: translateY(-20px) translateX(10px) rotate(5deg);
            }
            50% { 
              transform: translateY(-10px) translateX(-5px) rotate(-3deg);
            }
            75% { 
              transform: translateY(-25px) translateX(8px) rotate(4deg);
            }
          }
        `}</style>
      </div>

      {/* Sağ taraf - Admin Login Form */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
        background: '#ffffff',
        position: 'relative',
        minHeight: '100vh'
      }}>
        {/* Logo - Sol Üst */}
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '40px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <img 
            src="/Kaptan.png" 
            alt="Kaptan Logo" 
            style={{ width: '50px', height: '50px' }} 
          />
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#000',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              Kaptan
            </h2>
            <p style={{
              fontSize: '10px',
              color: '#666',
              margin: 0,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Admin Panel
            </p>
          </div>
        </div>

        {/* Login Form */}
        <div style={{
          maxWidth: '450px',
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '50px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              <Shield size={48} color="#000" />
            </div>
            <h1 style={{ 
              fontSize: '48px', 
              fontWeight: '700', 
              color: '#000', 
              marginBottom: '16px',
              letterSpacing: '-2px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Admin Girişi
            </h1>
            <p style={{ 
              color: '#666', 
              fontSize: '18px',
              lineHeight: '1.8',
              fontWeight: '400',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              Admin paneline erişmek için admin bilgilerinizle giriş yapın.
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fff',
              color: '#000',
              padding: '16px',
              borderRadius: '0',
              marginBottom: '30px',
              fontSize: '14px',
              border: '2px solid #000',
              fontWeight: '500'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin Kullanıcı Adı"
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '2px solid #000',
                  borderRadius: '0',
                  fontSize: '14px',
                  marginBottom: '15px',
                  background: 'white',
                  color: '#000'
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin Şifre"
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '2px solid #000',
                  borderRadius: '0',
                  fontSize: '14px',
                  background: 'white',
                  color: '#000'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px 24px',
                background: loading ? '#ccc' : '#000',
                color: 'white',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.2s',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#333';
                  e.currentTarget.style.borderColor = '#333';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#000';
                  e.currentTarget.style.borderColor = '#000';
                }
              }}
            >
              <LogIn size={22} />
              {loading ? 'Giriş yapılıyor...' : 'Admin Girişi Yap'}
            </button>
          </form>

          <div style={{
            marginTop: '30px',
            padding: '20px',
            background: '#f5f5f5',
            border: '1px solid #e0e0e0',
            fontSize: '13px',
            color: '#666',
            lineHeight: '1.8'
          }}>
            <strong style={{ color: '#000', display: 'block', marginBottom: '8px' }}>
              Bilgi:
            </strong>
            <p style={{ margin: 0 }}>
              Admin kullanıcıları Admin Panel'den oluşturulur. 
              İlk admin kullanıcısı oluşturmak için sistem yöneticisine başvurun.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


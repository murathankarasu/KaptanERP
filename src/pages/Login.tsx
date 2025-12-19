import { useState } from 'react';
import { signInWithGoogle } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { LogIn, Package, BarChart3, TrendingUp, Boxes } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await signInWithGoogle();
      navigate('/dashboard');
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
        <div style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          border: '2px solid rgba(0,0,0,0.12)',
          top: '35%',
          left: '25%',
          animation: 'floatBox 12s ease-in-out infinite 4s',
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
          <Package size={60} color="#000" />
        </div>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '12%',
          animation: 'floatIcon 8s ease-in-out infinite 2s',
          opacity: 0.12
        }}>
          <BarChart3 size={50} color="#000" />
        </div>
        <div style={{
          position: 'absolute',
          top: '70%',
          left: '22%',
          animation: 'floatIcon 7s ease-in-out infinite 3s',
          opacity: 0.1
        }}>
          <TrendingUp size={45} color="#000" />
        </div>
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '8%',
          animation: 'floatIcon 9s ease-in-out infinite 1s',
          opacity: 0.13
        }}>
          <Boxes size={55} color="#000" />
        </div>
        
        {/* Animated Lines */}
        <svg style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.08,
          pointerEvents: 'none'
        }}>
          <defs>
            <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="50%" stopColor="#000" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="50%" stopColor="#000" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line 
            x1="0" 
            y1="30%" 
            x2="100%" 
            y2="70%" 
            stroke="url(#lineGradient1)" 
            strokeWidth="1"
            className="animated-line-1"
          />
          <line 
            x1="0" 
            y1="70%" 
            x2="100%" 
            y2="30%" 
            stroke="url(#lineGradient2)" 
            strokeWidth="1"
            className="animated-line-2"
          />
        </svg>
        
        {/* Pulse Circles */}
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: '50%',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'pulseCircle 4s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          width: '150px',
          height: '150px',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: '50%',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'pulseCircle 4s ease-in-out infinite 1s'
        }} />
        
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
          
          .animated-line-1 {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            animation: lineDraw 15s ease-in-out infinite;
          }
          
          .animated-line-2 {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            animation: lineDraw 18s ease-in-out infinite 5s;
          }
          
          @keyframes lineDraw {
            0% { 
              stroke-dashoffset: 1000;
              opacity: 0;
            }
            50% { 
              opacity: 0.15;
            }
            100% { 
              stroke-dashoffset: 0;
              opacity: 0;
            }
          }
          
          @keyframes pulseCircle {
            0%, 100% { 
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.05;
            }
            50% { 
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0.1;
            }
          }
        `}</style>
      </div>

      {/* Sağ taraf - Login Form */}
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
              ERP Sistemleri
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
            <h1 style={{ 
              fontSize: '48px', 
              fontWeight: '700', 
              color: '#000', 
              marginBottom: '16px',
              letterSpacing: '-2px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Hoş Geldiniz
            </h1>
            <p style={{ 
              color: '#666', 
              fontSize: '18px',
              lineHeight: '1.8',
              fontWeight: '400',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              Modern ERP çözümü ile stok ve personel yönetimini kolaylaştırın. 
              <br />
              <span style={{ fontSize: '16px', color: '#999', fontStyle: 'italic' }}>
                Akıllı takip, hızlı kararlar, güvenilir sonuçlar.
              </span>
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

          <button
            onClick={handleGoogleSignIn}
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
              textTransform: 'uppercase',
              marginBottom: '24px'
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
            {loading ? 'Giriş yapılıyor...' : 'Google ile Giriş Yap'}
          </button>

          <p style={{
            fontSize: '12px',
            color: '#999',
            lineHeight: '1.6',
            letterSpacing: '0.3px',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            Sadece yetkili Google hesapları ile giriş yapabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}


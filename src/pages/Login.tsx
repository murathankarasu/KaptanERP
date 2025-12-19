import { useState } from 'react';
import { signInWithGoogle } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

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
      {/* Sol taraf - Görsel */}
      <div 
        className="login-image-container"
        style={{
          flex: '1',
          background: '#ffffff',
          position: 'relative',
          overflow: 'visible',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-start'
        }}
      >
        <img 
          src="/1.png" 
          alt="Kaptan ERP - Stok ve Personel Takip Sistemi" 
          style={{
            width: 'auto',
            height: '100vh',
            maxWidth: '100%',
            objectFit: 'contain',
            objectPosition: 'left bottom',
            display: 'block',
            marginBottom: 0,
            paddingBottom: 0
          }}
          onError={(e) => {
            console.error('Görsel yüklenemedi:', e);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
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


import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { signInWithGoogle } from '../services/authService';
import { verifyPassword, getUserByEmail, ensurePersonnelForUser } from '../services/userService';
import { getPersonnelByEmail } from '../services/personnelService';
import { LogIn, Package, BarChart3, TrendingUp, Boxes } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginType, setLoginType] = useState<'google' | 'password'>('google');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const firebaseUser = await signInWithGoogle();
      
      // Google login yapan kullanıcı için Firestore'dan kullanıcı bilgilerini çek
      if (firebaseUser?.email) {
        const user = await getUserByEmail(firebaseUser.email);
        
        if (!user) {
          // Firestore'da kullanıcı yoksa giriş yapamaz
          await signOut(auth);
          setError('Bu email adresi ile kayıtlı bir kullanıcı bulunamadı. Lütfen admin panelden hesabınızın oluşturulduğundan emin olun.');
          setLoading(false);
          return;
        }

        // Admin kullanıcıları normal uygulamaya giremez
        if (user.role === 'admin') {
          await signOut(auth);
          setError('Admin kullanıcıları için admin panel girişi kullanılmalıdır.');
          setLoading(false);
          return;
        }

        // Kullanıcı aktif değilse giriş yapamaz
        if (!user.isActive) {
          await signOut(auth);
          setError('Hesabınız aktif değil. Lütfen admin ile iletişime geçin.');
          setLoading(false);
          return;
        }

        // Personel kaydını garanti et ve güncellenen şirket bilgilerini al
        const ensured = await ensurePersonnelForUser(user);
        
        // Personel bilgilerini (yetkileri) çek
        let personnelId = '';
        let permissions: any[] = [];
        if (ensured.companyId && ensured.email) {
          const p = await getPersonnelByEmail(ensured.email, ensured.companyId);
          if (p) {
            personnelId = p.id || '';
            permissions = p.permissions || [];
          }
        }

        // Kullanıcı bilgilerini localStorage'a kaydet (companyId ve companyCode dahil)
        localStorage.setItem('currentUser', JSON.stringify({
          id: ensured.id,
          username: ensured.username || firebaseUser.email,
          email: ensured.email || firebaseUser.email,
          fullName: ensured.fullName || firebaseUser.displayName || '',
          role: ensured.role || 'user',
          companyId: ensured.companyId,
          companyCode: ensured.companyCode,
          personnelId,
          permissions
        }));

        // Last login güncellemesi için userService'i kullan
        if (user.id) {
          const { updateDoc, doc, Timestamp } = await import('firebase/firestore');
          const { db } = await import('../firebase/config');
          await updateDoc(doc(db, 'users', user.id), {
            lastLogin: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
      }
      
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Giriş yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!identifier || !password) {
      setError('E-posta veya kullanıcı adı ve şifre gereklidir');
      setLoading(false);
      return;
    }

    try {
      console.log('[login-password] input', { identifier });
      const user = await verifyPassword(identifier, password);
      console.log('[login-password] verify result', user);
      if (user) {
        // Admin kullanıcıları normal uygulamaya giremez, admin-login'e yönlendir
        if (user.role === 'admin') {
          setError('Admin kullanıcıları buradan giriş yapamaz. Lütfen Admin Login sayfasını kullanın.');
          return;
        }
        
        // Personel kaydını garanti et ve güncellenen şirket bilgilerini al
        const ensured = await ensurePersonnelForUser(user);
        
        // Personel bilgilerini (yetkileri) çek
        let personnelId = '';
        let permissions: any[] = [];
        if (ensured.companyId && ensured.email) {
          const p = await getPersonnelByEmail(ensured.email, ensured.companyId);
          if (p) {
            personnelId = p.id || '';
            permissions = p.permissions || [];
          }
        }

        // Kullanıcı bilgilerini localStorage'a kaydet (companyId ve companyCode dahil)
        localStorage.setItem('currentUser', JSON.stringify({
          id: ensured.id,
          username: ensured.username,
          email: ensured.email,
          fullName: ensured.fullName,
          role: ensured.role,
          companyId: ensured.companyId,
          companyCode: ensured.companyCode,
          personnelId,
          permissions
        }));
        
        // Sayfa yenilenmesi ile localStorage kontrolünün doğru çalışmasını sağla
        window.location.href = '/dashboard';
      } else {
        setError('Kullanıcı adı veya şifre hatalı');
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

          {/* Giriş Tipi Seçimi */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '30px',
            border: '2px solid #000',
            padding: '4px',
            background: 'white'
          }}>
            <button
              type="button"
              onClick={() => setLoginType('password')}
              style={{
                flex: 1,
                padding: '12px',
                background: loginType === 'password' ? '#000' : 'transparent',
                color: loginType === 'password' ? '#fff' : '#000',
                border: 'none',
                borderRadius: '0',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Şifre ile Giriş
            </button>
            <button
              type="button"
              onClick={() => setLoginType('google')}
              style={{
                flex: 1,
                padding: '12px',
                background: loginType === 'google' ? '#000' : 'transparent',
                color: loginType === 'google' ? '#fff' : '#000',
                border: 'none',
                borderRadius: '0',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Google ile Giriş
            </button>
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

          {/* Şifre ile Giriş Formu */}
          {loginType === 'password' && (
            <form onSubmit={handlePasswordLogin} style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="E-posta veya Kullanıcı Adı"
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
                  placeholder="Şifre"
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
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </form>
          )}

          {/* Google ile Giriş Butonu */}
          {loginType === 'google' && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}


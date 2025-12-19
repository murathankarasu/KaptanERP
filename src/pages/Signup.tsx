import { useState } from 'react';
import Layout from '../components/Layout';
import { getInviteByCode, consumeInvite } from '../services/inviteService';
import { addUser } from '../services/userService';
import { addErrorLog } from '../services/userService';
import { ShieldCheck } from 'lucide-react';

export default function Signup() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    inviteCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.fullName || !form.email || !form.password || !form.inviteCode) {
      setError('Tüm alanlar zorunlu.');
      return;
    }

    try {
      setLoading(true);
      const invite = await getInviteByCode(form.inviteCode.trim());
      if (!invite) {
        setError('Kod geçersiz veya kullanılmış.');
        return;
      }

      await addUser({
        username: form.email,
        password: form.password,
        email: form.email,
        fullName: form.fullName,
        role: invite.role,
        companyId: invite.companyId,
        companyName: invite.companyName,
        isActive: true
      });

      if (invite.id) {
        await consumeInvite(invite.id, form.email);
      }

      setSuccess('Kayıt başarılı. Giriş yapabilirsiniz.');
    } catch (err: any) {
      const msg = err?.message || 'Kayıt sırasında hata oluştu';
      setError(msg);
      await addErrorLog(`Signup error: ${msg}`, 'Signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: '500px', margin: '40px auto', padding: '24px', border: '1px solid #ddd', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ShieldCheck size={20} />
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Kayıt Ol (Davet Koduyla)</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="excel-form-group">
            <label className="excel-form-label">Ad Soyad</label>
            <input className="excel-form-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="excel-form-group">
            <label className="excel-form-label">E-posta</label>
            <input className="excel-form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="excel-form-group">
            <label className="excel-form-label">Şifre</label>
            <input className="excel-form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="excel-form-group">
            <label className="excel-form-label">Davet Kodu</label>
            <input className="excel-form-input" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value })} />
          </div>
          {error && <div style={{ color: '#dc3545', marginTop: '8px' }}>{error}</div>}
          {success && <div style={{ color: '#28a745', marginTop: '8px' }}>{success}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '12px' }}>
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>
      </div>
    </Layout>
  );
}


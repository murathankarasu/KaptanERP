import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getCurrentUser } from '../utils/getCurrentUser';
import { addCompany, getCompanies, Company } from '../services/companyService';
import { addInviteCode, getInviteCodes, InviteCode } from '../services/inviteService';
import { Shield, Plus } from 'lucide-react';

export default function InviteAdmin() {
  const currentUser = getCurrentUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [companyForm, setCompanyForm] = useState({ name: '', code: '' });
  const [inviteForm, setInviteForm] = useState({ code: '', companyId: '', role: 'manager' as 'manager' | 'user' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      alert('Bu sayfa yalnızca admin içindir.');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    const [c, i] = await Promise.all([getCompanies(), getInviteCodes()]);
    setCompanies(c);
    setInvites(i);
  };

  const handleAddCompany = async () => {
    if (!companyForm.name) {
      alert('Firma adı girin');
      return;
    }
    await addCompany(companyForm);
    setCompanyForm({ name: '', code: '' });
    loadData();
  };

  const handleAddInvite = async () => {
    if (!inviteForm.code || !inviteForm.companyId) {
      alert('Kod ve firma seçin');
      return;
    }
    const company = companies.find(c => c.id === inviteForm.companyId);
    await addInviteCode({
      code: inviteForm.code,
      companyId: inviteForm.companyId,
      companyName: company?.name,
      role: inviteForm.role,
      isActive: true,
      createdBy: currentUser?.id
    });
    setInviteForm({ code: '', companyId: '', role: 'manager' });
    loadData();
  };

  if (currentUser?.role !== 'admin') {
    return (
      <Layout>
        <div style={{ padding: '30px' }}>Yetkiniz yok.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Shield size={22} />
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Davet / Firma Yönetimi</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ border: '1px solid #ddd', padding: '14px', background: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Firma Ekle</h3>
            <div className="excel-form-group">
              <label className="excel-form-label">Firma Adı</label>
              <input className="excel-form-input" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Kod (opsiyonel)</label>
              <input className="excel-form-input" value={companyForm.code} onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={handleAddCompany} disabled={loading}><Plus size={14} /> Kaydet</button>
          </div>

          <div style={{ border: '1px solid #ddd', padding: '14px', background: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Davet Kodu Oluştur</h3>
            <div className="excel-form-group">
              <label className="excel-form-label">Kod</label>
              <input className="excel-form-input" value={inviteForm.code} onChange={(e) => setInviteForm({ ...inviteForm, code: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Firma</label>
              <select className="excel-form-select" value={inviteForm.companyId} onChange={(e) => setInviteForm({ ...inviteForm, companyId: e.target.value })}>
                <option value="">Seçiniz</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Rol</label>
              <select className="excel-form-select" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}>
                <option value="manager">Yönetici</option>
                <option value="user">Kullanıcı</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleAddInvite} disabled={loading}><Plus size={14} /> Kod Oluştur</button>
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '14px', background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Davet Kodları</h3>
          <table className="excel-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Firma</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Kullanıldı</th>
              </tr>
            </thead>
            <tbody>
              {invites.map(i => (
                <tr key={i.id}>
                  <td>{i.code}</td>
                  <td>{i.companyName || i.companyId}</td>
                  <td>{i.role}</td>
                  <td>{i.isActive ? 'Aktif' : 'Kullanıldı'}</td>
                  <td>{i.usedBy || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}


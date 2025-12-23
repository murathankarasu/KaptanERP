import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getUsers, addUser, updateUser, deleteUser, User } from '../services/userService';
import { getErrorLogs, resolveErrorLog, ErrorLog } from '../services/userService';
import { getCompanies, Company, addCompany } from '../services/companyService';
import { runHealthCheck, getLatestHealthReport, HealthReport } from '../services/systemHealthService';
import { getInviteCodes, InviteCode } from '../services/inviteService';
import { Plus, X, Edit, Save, Shield, CheckCircle, Eye, EyeOff, RefreshCcw, Copy, KeyRound } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'errors'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [, setInvites] = useState<InviteCode[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [errorFilter, setErrorFilter] = useState<'all' | 'resolved' | 'unresolved'>('unresolved');

  const [userFormData, setUserFormData] = useState({
    accountType: 'existing' as 'existing' | 'new',
    username: '',
    password: '',
    email: '',
    fullName: '',
    role: 'user' as 'admin' | 'manager' | 'user',
    companyId: '',
    companyCode: '',
    companyName: '', // Yeni şirket adı (sadece yeni manager oluştururken)
    isActive: true
  });
  const [showHash, setShowHash] = useState<Record<string, boolean>>({});
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthMessage, setHealthMessage] = useState<string | null>(null);


  useEffect(() => {
    // Admin kontrolü
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      navigate('/admin-login');
      return;
    }
    
    const userInfo = JSON.parse(currentUser);
    if (userInfo.role !== 'admin') {
      alert('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
      navigate('/admin-login');
      return;
    }

    if (activeTab === 'users') {
      loadUsers();
      loadCompanies();
      loadInvites();
      loadHealthLatest();
    } else {
      loadErrorLogs();
    }
  }, [activeTab, errorFilter, selectedCompanyId, navigate]);

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Şirketler yüklenirken hata:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const companyId = selectedCompanyId === 'all' ? undefined : selectedCompanyId;
      const data = await getUsers(companyId, true);
      setUsers(data);
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const data = await getInviteCodes();
      setInvites(data);
    } catch (error) {
      console.error('Davet kodları yüklenirken hata:', error);
    }
  };

  const loadHealthLatest = async () => {
    try {
      const report = await getLatestHealthReport();
      setHealthReport(report);
    } catch (error) {
      console.error('Sağlık raporu okunamadı', error);
    }
  };

  const loadErrorLogs = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (errorFilter === 'resolved') {
        filters.resolved = true;
      } else if (errorFilter === 'unresolved') {
        filters.resolved = false;
      }
      
      const data = await getErrorLogs(filters);
      setErrorLogs(data);
    } catch (error) {
      console.error('Hata logları yüklenirken hata:', error);
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%';
    let out = '';
    for (let i = 0; i < 12; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  };

  const handleRunHealth = async () => {
    try {
      setHealthLoading(true);
      setHealthMessage(null);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      const report = await runHealthCheck(userInfo?.id, userInfo?.username);
      setHealthReport(report);
      setHealthMessage('Sistem testi tamamlandı');
    } catch (error: any) {
      setHealthMessage('Sistem testi başarısız: ' + (error.message || ''));
    } finally {
      setHealthLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userFormData.username || (!editingUserId && !userFormData.password)) {
      alert('Kullanıcı adı ve şifre zorunludur');
      return;
    }

    try {
      let targetCompanyId = userFormData.companyId;
      let targetCompanyCode = userFormData.companyCode;
      let targetCompanyName = userFormData.companyName;

      if (userFormData.accountType === 'existing') {
        if (!userFormData.companyId) {
          alert('Lütfen var olan bir şirket seçin');
          return;
        }
        const company = companies.find(c => c.id === userFormData.companyId);
      if (!company) {
          alert('Geçerli bir şirket seçin');
        return;
      }
      targetCompanyId = company.id || '';
      targetCompanyCode = company.code || '';
      targetCompanyName = company.name || '';
      } else {
        // Yeni şirket oluştur ve kullanıcıyı yönetici olarak ata
        if (!userFormData.companyName) {
          alert('Yeni şirket adı zorunludur');
          return;
        }
        if (!userFormData.companyCode) {
          alert('Yeni şirket için kod girin');
          return;
        }
        const newCompanyId = await addCompany({
          name: userFormData.companyName,
          code: userFormData.companyCode,
          isActive: true
        });
        // Listeyi tazele ki yeni şirket hemen seçilebilir olsun
        await loadCompanies();
        targetCompanyId = newCompanyId;
        targetCompanyCode = userFormData.companyCode;
        targetCompanyName = userFormData.companyName;
      }

      const finalRole = userFormData.accountType === 'new' ? 'manager' : userFormData.role;

      if (editingUserId) {
        const updateData: any = {
          ...userFormData,
          companyId: targetCompanyId,
          companyCode: targetCompanyCode,
          companyName: targetCompanyName,
          role: finalRole
        };
        if (userFormData.password) {
          updateData.password = userFormData.password;
        }
        await updateUser(editingUserId, updateData);
        alert('Kullanıcı başarıyla güncellendi!');
      } else {
        if (!userFormData.password) {
          alert('Yeni kullanıcı için şifre zorunludur');
          return;
        }
        const userData = {
          ...userFormData,
          companyId: targetCompanyId,
          companyCode: targetCompanyCode,
          companyName: targetCompanyName,
          password: userFormData.password,
          role: finalRole
        };
        await addUser(userData);
        alert('Kullanıcı başarıyla eklendi!');
      }
      
      setShowUserForm(false);
      setEditingUserId(null);
      resetUserForm();
      loadUsers();
    } catch (error: any) {
      alert('Hata: ' + (error.message || 'Kullanıcı kaydedilirken bir hata oluştu'));
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id || null);
    const userCompany = companies.find(c => c.id === user.companyId);
    setUserFormData({
      accountType: 'existing',
      username: user.username,
      password: '', // Şifreyi gösterme
      email: user.email || '',
      fullName: user.fullName || '',
      role: user.role || 'manager',
      companyId: user.companyId || '',
      companyCode: user.companyCode || '',
      companyName: userCompany?.name || '', // Mevcut şirket adını göster
      isActive: user.isActive
    });
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await deleteUser(id);
      alert('Kullanıcı başarıyla silindi!');
      loadUsers();
    } catch (error: any) {
      alert('Hata: ' + (error.message || 'Kullanıcı silinirken bir hata oluştu'));
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!user.id) return;
    const newPass = generatePassword();
    if (!confirm(`Yeni şifre üretilecek ve kullanıcıya kaydedilecek.\n\nYeni şifre: ${newPass}\n\nOnaylıyor musunuz?`)) return;
    try {
      await updateUser(user.id, { password: newPass });
      alert(`Şifre sıfırlandı.\nYeni şifre: ${newPass}`);
      loadUsers();
    } catch (error: any) {
      alert('Şifre sıfırlama hatası: ' + (error.message || ''));
    }
  };

  const handleResolveError = async (id: string) => {
    try {
      const currentUser = localStorage.getItem('currentUser');
      const username = currentUser ? JSON.parse(currentUser).username : 'Admin';
      await resolveErrorLog(id, username);
      alert('Hata çözüldü olarak işaretlendi!');
      loadErrorLogs();
    } catch (error: any) {
      alert('Hata: ' + (error.message || 'Hata çözülürken bir hata oluştu'));
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      accountType: 'existing',
      username: '',
      password: '',
      email: '',
      fullName: '',
      role: 'user',
      companyId: '',
      companyCode: '',
      companyName: '',
      isActive: true
    });
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
          <Shield size={32} color="#000" />
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px', margin: 0 }}>
              Admin Paneli
            </h1>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '4px', margin: 0 }}>
              Kullanıcı yönetimi ve sistem hata logları buradan yönetilir. Buradan sadece normal kullanıcılar oluşturulur.
            </p>
          </div>
        </div>

        {/* Kullanıcı Yönetimi */}
        {activeTab === 'users' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#000' }}>
                Kullanıcı Yönetimi
              </h2>
              <button 
                onClick={() => { setShowUserForm(true); resetUserForm(); setEditingUserId(null); }} 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} />
                Yeni Kullanıcı Ekle
              </button>
            </div>
            <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #ddd', background: '#f8f8f8', color: '#333', fontSize: '13px' }}>
              Yeni kullanıcı eklerken önce hesap türünü seçin: Var olan şirkete kullanıcı bağlayın veya yeni şirket açıp yöneticisini oluşturun. Davet kodu ile kayıt olanlar da buraya düşer; rol/aktiflik düzenleyebilirsiniz.
            </div>

            {/* Sistem Sağlık Kartı */}
            <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #ddd', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} />
                    Sistem Sağlığı
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Son kontrol: {healthReport?.createdAt ? new Date(healthReport.createdAt).toLocaleString('tr-TR') : 'Yok'}
                    {' • '}Durum: {healthReport?.status || '-'}
                  </div>
                  {healthMessage && <div style={{ fontSize: '12px', color: '#333', marginTop: '4px' }}>{healthMessage}</div>}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleRunHealth}
                  disabled={healthLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCcw size={14} />
                  {healthLoading ? 'Test ediliyor...' : 'Sistemi Test Et'}
                </button>
              </div>
              {healthReport && (
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {healthReport.items.map(item => (
                    <div key={item.key} style={{
                      border: '1px solid #eee',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      background: item.status === 'fail' ? '#ffe6e6' : item.status === 'warn' ? '#fff6e5' : '#f0fff4',
                      color: '#333',
                      fontSize: '12px',
                      minWidth: '160px'
                    }}>
                      <div style={{ fontWeight: 700 }}>{item.message}</div>
                      {item.detail && <div style={{ marginTop: '4px', color: '#666' }}>{item.detail}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kullanıcı Formu */}
            {showUserForm && (
              <div style={{
                background: 'white',
                border: '2px solid #000',
                padding: '30px',
                marginBottom: '30px'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#000' }}>
                  {editingUserId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
                </h3>
                <form onSubmit={handleUserSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                        Hesap Türü
                      </label>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            checked={userFormData.accountType === 'existing'}
                            onChange={() => setUserFormData({ ...userFormData, accountType: 'existing' })}
                          />
                          <span>Var olan şirkete kullanıcı ekle</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            checked={userFormData.accountType === 'new'}
                            onChange={() => setUserFormData({ ...userFormData, accountType: 'new', role: 'manager' })}
                          />
                          <span>Yeni şirket oluştur ve yönetici aç</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                        Kullanıcı Adı <span style={{ color: '#dc3545' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={userFormData.username}
                        onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #000',
                          borderRadius: '0',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                        Şifre {!editingUserId && <span style={{ color: '#dc3545' }}>*</span>}
                      </label>
                      <input
                        type="password"
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        required={!editingUserId}
                        placeholder={editingUserId ? "Değiştirmek için yeni şifre girin" : ""}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #000',
                          borderRadius: '0',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #000',
                          borderRadius: '0',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                        Ad Soyad
                      </label>
                      <input
                        type="text"
                        value={userFormData.fullName}
                        onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #000',
                          borderRadius: '0',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                        Rol
                      </label>
                      <select
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #000',
                          borderRadius: '0',
                          fontSize: '14px',
                          background: 'white'
                        }}
                        disabled={userFormData.accountType === 'new'}
                      >
                        <option value="user">Kullanıcı</option>
                        <option value="manager">Yönetici</option>
                      </select>
                      {userFormData.accountType === 'new' && (
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '4px', margin: 0 }}>
                          Yeni şirket açarken rol otomatik olarak yönetici olur.
                        </p>
                      )}
                    </div>
                    {userFormData.accountType === 'existing' && (
                      <>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                            Şirket Seç <span style={{ color: '#dc3545' }}>*</span>
                          </label>
                          <select
                            value={userFormData.companyId}
                            onChange={(e) => {
                              const company = companies.find(c => c.id === e.target.value);
                              setUserFormData({
                                ...userFormData,
                                companyId: e.target.value,
                                companyCode: company?.code || '',
                                companyName: company?.name || ''
                              });
                            }}
                            required
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '2px solid #000',
                              borderRadius: '0',
                              fontSize: '14px',
                              background: 'white'
                            }}
                          >
                            <option value="">Seçiniz</option>
                            {companies.map(c => (
                              <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>
                            ))}
                          </select>
                          <p style={{ fontSize: '11px', color: '#666', marginTop: '4px', margin: 0 }}>
                            Var olan şirket seçilmeden hesap oluşturulamaz.
                          </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                            Şirket Kodu
                      </label>
                      <input
                        type="text"
                            value={userFormData.companyCode}
                            readOnly
                        style={{
                          width: '100%',
                          padding: '12px',
                              border: '2px solid #000',
                          borderRadius: '0',
                          fontSize: '14px',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                      </>
                    )}
                    {userFormData.accountType === 'new' && (
                      <>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                            Yeni Şirket Adı <span style={{ color: '#dc3545' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={userFormData.companyName}
                            onChange={(e) => setUserFormData({ ...userFormData, companyName: e.target.value })}
                            required
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '2px solid #000',
                              borderRadius: '0',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                            Yeni Şirket Kodu <span style={{ color: '#dc3545' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={userFormData.companyCode}
                            onChange={(e) => setUserFormData({ ...userFormData, companyCode: e.target.value })}
                            placeholder="Örn: ABC123"
                            required
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '2px solid #000',
                              borderRadius: '0',
                              fontSize: '14px'
                        }}
                      />
                      <p style={{ fontSize: '11px', color: '#666', marginTop: '4px', margin: 0 }}>
                            Önce şirketi oluşturur, ardından yöneticiyi açar.
                      </p>
                    </div>
                      </>
                    )}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                        <input
                          type="checkbox"
                          checked={userFormData.isActive}
                          onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        Aktif
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Save size={18} />
                      {editingUserId ? 'Güncelle' : 'Kaydet'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setShowUserForm(false); setEditingUserId(null); resetUserForm(); }} 
                      className="btn btn-secondary"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Şirket Filtresi */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>Şirket Filtresi:</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #000',
                  borderRadius: '0',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              >
                <option value="all">Tüm Şirketler</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>

            {/* Kullanıcı Tablosu */}
            <div className="table-container">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
              ) : users.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  {selectedCompanyId === 'all' 
                    ? 'Henüz kullanıcı kaydı bulunmamaktadır.'
                    : 'Seçili şirkette kullanıcı kaydı bulunmamaktadır.'}
                </div>
              ) : (
                <table className="excel-table">
                  <thead>
                    <tr>
                      <th>Kullanıcı Adı</th>
                      <th>Ad Soyad</th>
                      <th>Email</th>
                      <th>Şirket</th>
                      <th>Rol</th>
                      <th>Hash</th>
                      <th>Parola</th>
                      <th>Oluşturan</th>
                      <th>Durum</th>
                      <th>Son Giriş</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td style={{ fontWeight: '500' }}>{user.username}</td>
                        <td>{user.fullName || '-'}</td>
                        <td>{user.email || '-'}</td>
                        <td>
                          {user.companyCode ? (
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              {companies.find(c => c.id === user.companyId)?.name || user.companyCode}
                            </span>
                          ) : '-'}
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            background: user.role === 'admin' ? '#000' : user.role === 'manager' ? '#666' : '#999',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Yönetici' : 'Kullanıcı'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#333', fontFamily: 'monospace' }}>
                              {showHash[user.id || ''] ? (user.password || '-') : '•••'}
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '2px 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setShowHash({ ...showHash, [user.id || '']: !showHash[user.id || ''] })}
                            >
                              {showHash[user.id || ''] ? <EyeOff size={12} /> : <Eye size={12} />}
                              {showHash[user.id || ''] ? 'Gizle' : 'Göster'}
                            </button>
                            {showHash[user.id || ''] && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '2px 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => navigator.clipboard.writeText(user.password || '')}
                              >
                                <Copy size={12} /> Kopyala
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleResetPassword(user)}
                          >
                            <KeyRound size={12} /> Sıfırla
                          </button>
                        </td>
                        <td>
                          {user.createdBy ? (
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              {users.find(u => u.id === user.createdBy)?.username || 'Bilinmiyor'}
                            </span>
                          ) : '-'}
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            background: user.isActive ? '#28a745' : '#dc3545',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {user.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td>{user.lastLogin ? formatDate(user.lastLogin) : '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit size={14} />
                              Düzenle
                            </button>
                            <button
                              onClick={() => user.id && handleDeleteUser(user.id)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#dc3545' }}
                            >
                              <X size={14} />
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Hata Logları */}
        {activeTab === 'errors' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#000' }}>
                Hata Logları
              </h2>
              <select
                value={errorFilter}
                onChange={(e) => setErrorFilter(e.target.value as 'all' | 'resolved' | 'unresolved')}
                style={{
                  padding: '10px 16px',
                  border: '2px solid #000',
                  borderRadius: '0',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="unresolved">Çözülmemiş</option>
                <option value="resolved">Çözülmüş</option>
                <option value="all">Tümü</option>
              </select>
            </div>

            <div className="table-container">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
              ) : errorLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  Hata logu bulunmamaktadır.
                </div>
              ) : (
                <table className="excel-table">
                  <thead>
                    <tr>
                      <th>Tarih/Saat</th>
                      <th>Kullanıcı</th>
                      <th>Sayfa</th>
                      <th>Hata</th>
                      <th>Durum</th>
                      <th>Çözen</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.timestamp.toLocaleString('tr-TR')}</td>
                        <td>{log.username || log.userId || '-'}</td>
                        <td>{log.page || '-'}</td>
                        <td style={{ maxWidth: '400px', wordBreak: 'break-word' }}>{log.error}</td>
                        <td>
                          {log.resolved ? (
                            <span style={{ color: '#28a745', fontWeight: '600' }}>Çözüldü</span>
                          ) : (
                            <span style={{ color: '#dc3545', fontWeight: '600' }}>Çözülmedi</span>
                          )}
                        </td>
                        <td>{log.resolvedBy || '-'}</td>
                        <td>
                          {!log.resolved && log.id && (
                            <button
                              onClick={() => handleResolveError(log.id!)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <CheckCircle size={14} />
                              Çöz
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getUsers, addUser, updateUser, deleteUser, User } from '../services/userService';
import { getErrorLogs, resolveErrorLog, ErrorLog } from '../services/userService';
import { getCompanies, addCompany, Company, getCompanyByCode } from '../services/companyService';
import { addInviteCode, getInviteCodes, InviteCode } from '../services/inviteService';
import { generateCompanyCode } from '../utils/generateCompanyCode';
import { Plus, X, Edit, Save, Shield, AlertTriangle, CheckCircle, Users } from 'lucide-react';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'errors'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [errorFilter, setErrorFilter] = useState<'all' | 'resolved' | 'unresolved'>('unresolved');

  const [userFormData, setUserFormData] = useState({
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

  const [inviteForm, setInviteForm] = useState({
    code: '',
    companyId: '',
    role: 'manager' as 'manager' | 'user'
  });

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
      const data = await getUsers(companyId);
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

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userFormData.username || (!editingUserId && !userFormData.password)) {
      alert('Kullanıcı adı ve şifre zorunludur');
      return;
    }
    if (!userFormData.companyCode) {
      alert('Şirket kodu zorunludur');
      return;
    }

    try {
      let targetCompanyId = userFormData.companyId;
      let targetCompanyCode = userFormData.companyCode;
      let targetCompanyName = userFormData.companyName;

      // Şirket kodu ile firmayı bul
      const company = await getCompanyByCode(userFormData.companyCode.trim());
      if (!company) {
        alert('Geçerli bir şirket kodu girin');
        return;
      }
      targetCompanyId = company.id || '';
      targetCompanyCode = company.code || '';
      targetCompanyName = company.name || '';

      const userData = {
        ...userFormData,
        companyId: targetCompanyId,
        companyCode: targetCompanyCode,
        companyName: targetCompanyName,
        password: userFormData.password || undefined
      };

      if (editingUserId) {
        await updateUser(editingUserId, userData);
        alert('Kullanıcı başarıyla güncellendi!');
      } else {
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
              Yeni kullanıcı eklerken şirket kodunu girerek var olan firmaya bağlayın. Davet kodu ile kayıt olanlar da buraya düşer; rol/aktiflik düzenleyebilirsiniz.
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
                        Şirket Kodu <span style={{ color: '#dc3545' }}>*</span>
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
                        Var olan firma kodunu girin. Kod bulunamazsa ekleme yapılmaz.
                      </p>
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
                      >
                        <option value="user">Kullanıcı</option>
                        <option value="manager">Yönetici</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                        Rol
                      </label>
                      <input
                        type="text"
                        value="Yönetici (Manager)"
                        disabled
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '2px solid #ccc',
                          borderRadius: '0',
                          fontSize: '14px',
                          background: '#f5f5f5',
                          color: '#666',
                          cursor: 'not-allowed'
                        }}
                      />
                      <p style={{ fontSize: '11px', color: '#666', marginTop: '4px', margin: 0 }}>
                        Admin Panel'den şirket yöneticisi (manager) oluşturulur
                      </p>
                    </div>
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
                        <td>{user.lastLogin ? user.lastLogin.toLocaleDateString('tr-TR') : '-'}</td>
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


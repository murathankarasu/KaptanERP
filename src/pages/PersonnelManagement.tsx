import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { addPersonnel, getPersonnel, updatePersonnel, deletePersonnel, Personnel } from '../services/personnelService';
import { ensurePersonnelForUser, User } from '../services/userService';
import { addErrorLog } from '../services/userService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { PERMISSIONS, PERMISSION_GROUPS, PermissionType } from '../types/permissions';
import { Plus, X, Edit, Save, Users } from 'lucide-react';
import { getCurrentUser } from '../utils/getCurrentUser';

export default function PersonnelManagement() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    name: '',
    department: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    department: '',
    email: '',
    phone: '',
    employeeId: '',
    permissions: [] as PermissionType[]
  });

  useEffect(() => {
    loadPersonnel();
  }, [filters]);

  const handleEnsurePersonnel = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      if (!currentCompany?.companyCode) {
        alert('Şirket kodunuz bulunamadı. Lütfen admin ile iletişime geçin.');
        return;
      }

      // 1) Şirket kodu aynı olan TÜM kullanıcıları bul (şirket Id'si henüz atanmamış olabilir)
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      const q = query(collection(db, 'users'), where('companyCode', '==', currentCompany.companyCode));
      const snap = await getDocs(q);
      
      const users: User[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
      
      if (users.length === 0) {
        alert('Bu şirket kodu ile eşleşen kullanıcı bulunamadı.');
        return;
      }

      for (const u of users) {
        // Eğer kullanıcının companyId'si yoksa veya yanlışsa yöneticinin companyId'sini ata
        if (!u.companyId && currentCompany.companyId) {
          const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
          await updateDoc(doc(db, 'users', u.id!), {
            companyId: currentCompany.companyId,
            companyName: u.companyName || '', // Admin panelde set edilmiş olmalı
            updatedAt: Timestamp.now()
          });
          u.companyId = currentCompany.companyId; // Yerelde de güncelle
        }
        await ensurePersonnelForUser(u);
      }
      
      await loadPersonnel();
      alert(`${users.length} kullanıcı kontrol edildi ve personel kayıtları güncellendi.`);
    } catch (error) {
      console.error('Personel kontrolü hata:', error);
      alert('Personel kontrolü sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadPersonnel = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const filterParams: any = {
        companyId: currentCompany?.companyId
      };
      if (filters.name) filterParams.name = filters.name;
      if (filters.department) filterParams.department = filters.department;
      
      const data = await getPersonnel(filterParams);
      setPersonnel(data);
    } catch (error: any) {
      console.error('Personel listesi yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Personel listesi yüklenirken hata: ${error.message || error}`,
        'PersonnelManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.department) {
      alert('Ad ve Departman zorunludur');
      return;
    }

    try {
      const currentCompany = getCurrentCompany();
      const { permissions, ...restFormData } = formData;
      const personnelData = {
        ...restFormData,
        permissions: permissions.length > 0 ? permissions : undefined,
        companyId: currentCompany?.companyId
      };
      
      if (editingId) {
        await updatePersonnel(editingId, personnelData);
        alert('Personel başarıyla güncellendi!');
      } else {
        await addPersonnel(personnelData);
        alert('Personel başarıyla eklendi!');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        department: '',
        email: '',
        phone: '',
        employeeId: '',
        permissions: []
      });
      loadPersonnel();
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Personel kaydedilirken hata: ${error.message || error}`,
        'PersonnelManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Hata: ' + (error.message || 'Personel kaydedilirken bir hata oluştu'));
    }
  };

  const handleEdit = (person: Personnel) => {
    setEditingId(person.id || null);
    setFormData({
      name: person.name,
      department: person.department,
      email: person.email || '',
      phone: person.phone || '',
      employeeId: person.employeeId || '',
      permissions: person.permissions || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu personeli silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await deletePersonnel(id);
      alert('Personel başarıyla silindi!');
      loadPersonnel();
    } catch (error: any) {
      alert('Hata: ' + (error.message || 'Personel silinirken bir hata oluştu'));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
      setFormData({
        name: '',
        department: '',
        email: '',
        phone: '',
        employeeId: '',
        permissions: []
      });
  };

  const uniqueDepartments = Array.from(new Set(personnel.map(p => p.department))).filter(Boolean);

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={32} color="#000" />
            <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
              Personel Yönetimi
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getCurrentUser()?.role === 'manager' && (
              <button 
                className="btn btn-secondary"
                onClick={handleEnsurePersonnel}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Users size={16} />
                Kullanıcıları Tara
              </button>
            )}
            <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} />
              Yeni Personel Ekle
            </button>
          </div>
        </div>

        {/* Filtreler */}
        <div style={{
          background: 'white',
          border: '2px solid #000',
          padding: '20px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Personel Adı
            </label>
            <input
              type="text"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              placeholder="Ara..."
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Departman
            </label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Tümü</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{
            background: 'white',
            border: '2px solid #000',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#000' }}>
              {editingId ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Ad Soyad <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    Departman <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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
                    Personel No
                  </label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
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
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              
              {/* Yetki Seçimi */}
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #000' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px', color: '#000' }}>
                  Yetkiler
                </h3>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
                  Bu personelin hangi alanlarda işlem yapabileceğini seçin:
                </p>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.title} style={{ border: '1px solid #ddd', padding: '12px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>{group.title}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                        {group.items.map((permission) => (
                          <label
                            key={permission}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px',
                              border: '1px solid #ccc',
                              cursor: 'pointer',
                              background: formData.permissions.includes(permission) ? '#f0f0f0' : 'white',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!formData.permissions.includes(permission)) {
                                e.currentTarget.style.background = '#f9f9f9';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!formData.permissions.includes(permission)) {
                                e.currentTarget.style.background = 'white';
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    permissions: [...formData.permissions, permission]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    permissions: formData.permissions.filter(p => p !== permission)
                                  });
                                }
                              }}
                              style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                transform: 'scale(1.1)'
                              }}
                            />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#000' }}>
                                {PERMISSIONS[permission].label}
                              </div>
                              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                {PERMISSIONS[permission].description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={18} />
                  {editingId ? 'Güncelle' : 'Kaydet'}
                </button>
                <button type="button" onClick={handleCancel} className="btn btn-secondary">
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tablo */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : personnel.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Henüz personel kaydı bulunmamaktadır.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Departman</th>
                  <th>Personel No</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th>Yetkiler</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {personnel.map((person) => (
                  <tr key={person.id}>
                    <td style={{ fontWeight: '500' }}>{person.name}</td>
                    <td>{person.department}</td>
                    <td>{person.employeeId || '-'}</td>
                    <td>{person.email || '-'}</td>
                    <td>{person.phone || '-'}</td>
                    <td>
                      {person.permissions && person.permissions.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {person.permissions.map(perm => (
                            <span
                              key={perm}
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                background: '#000',
                                color: '#fff',
                                borderRadius: '2px'
                              }}
                            >
                              {PERMISSIONS[perm].label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontSize: '12px' }}>Yetki yok</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(person)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit size={14} />
                          Düzenle
                        </button>
                        <button
                          onClick={() => person.id && handleDelete(person.id)}
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
      </div>
    </Layout>
  );
}


import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { addCustomer, getCustomers, updateCustomer, deleteCustomer, Customer } from '../services/customerService';
import { addErrorLog } from '../services/userService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { Plus, X, Edit, Save, Users, Search } from 'lucide-react';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    taxNumber: '',
    taxOffice: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
    phone: '',
    email: '',
    contactPerson: '',
    group: '',
    creditLimit: '',
    notes: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const data = await getCustomers(currentCompany?.companyId);
      setCustomers(data);
    } catch (error: any) {
      console.error('Müşteri listesi yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Müşteri listesi yüklenirken hata: ${error.message || error}`,
        'CustomerManagement',
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
    
    if (!formData.name) {
      alert('Müşteri adı zorunludur');
      return;
    }

    try {
      const currentCompany = getCurrentCompany();
      const creditLimit = formData.creditLimit ? parseFloat(formData.creditLimit) : undefined;
      const customerData = {
        ...formData,
        creditLimit: creditLimit && !isNaN(creditLimit) ? creditLimit : undefined,
        companyId: currentCompany?.companyId
      };
      
      if (editingId) {
        await updateCustomer(editingId, customerData);
        alert('Müşteri başarıyla güncellendi!');
      } else {
        await addCustomer(customerData);
        alert('Müşteri başarıyla eklendi!');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        companyName: '',
        taxNumber: '',
        taxOffice: '',
        address: '',
        city: '',
        district: '',
        postalCode: '',
        phone: '',
        email: '',
        contactPerson: '',
        group: '',
        creditLimit: '',
        notes: ''
      });
      loadCustomers();
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Müşteri kaydedilirken hata: ${error.message || error}`,
        'CustomerManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Hata: ' + (error.message || 'Müşteri kaydedilirken bir hata oluştu'));
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id || null);
    setFormData({
      name: customer.name,
      companyName: customer.companyName || '',
      taxNumber: customer.taxNumber || '',
      taxOffice: customer.taxOffice || '',
      address: customer.address || '',
      city: customer.city || '',
      district: customer.district || '',
      postalCode: customer.postalCode || '',
      phone: customer.phone || '',
      email: customer.email || '',
      contactPerson: customer.contactPerson || '',
      group: customer.group || '',
      creditLimit: customer.creditLimit !== undefined ? customer.creditLimit.toString() : '',
      notes: customer.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await deleteCustomer(id);
      alert('Müşteri başarıyla silindi!');
      loadCustomers();
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Müşteri silinirken hata: ${error.message || error}`,
        'CustomerManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Hata: ' + (error.message || 'Müşteri silinirken bir hata oluştu'));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      companyName: '',
      taxNumber: '',
      taxOffice: '',
      address: '',
      city: '',
      district: '',
      postalCode: '',
      phone: '',
      email: '',
      contactPerson: '',
      group: '',
      creditLimit: '',
      notes: ''
    });
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.companyName?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.city?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={32} color="#000" />
            <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
              Müşteri Yönetimi
            </h1>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            Yeni Müşteri Ekle
          </button>
        </div>

        {/* Arama */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            <input
              type="text"
              placeholder="Müşteri ara (ad, şirket, telefon, e-posta, şehir)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px'
              }}
            />
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
              {editingId ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Müşteri Adı <span style={{ color: '#dc3545' }}>*</span>
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
                    Şirket Adı
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
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
                    Vergi Numarası
                  </label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
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
                    Vergi Dairesi
                  </label>
                  <input
                    type="text"
                    value={formData.taxOffice}
                    onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
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
                    type="text"
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
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Kredi Limiti (₺)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
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
                    Müşteri Grubu
                  </label>
                  <input
                    type="text"
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    placeholder="Örn: Gold / Silver / Bayi"
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
                    E-posta
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
                    İletişim Kişisi
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
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
                    Şehir
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                    İlçe
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
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
                    Posta Kodu
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
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
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                  Adres
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #000',
                    borderRadius: '0',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                  Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #000',
                    borderRadius: '0',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
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
          ) : filteredCustomers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              {searchTerm ? 'Arama sonucu bulunamadı.' : 'Henüz müşteri kaydı bulunmamaktadır. Yeni müşteri eklemek için yukarıdaki butona tıklayın.'}
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Müşteri Adı</th>
                  <th>Şirket Adı</th>
                  <th>Grup</th>
                  <th>Telefon</th>
                  <th>E-posta</th>
                  <th>Şehir</th>
                  <th>İletişim Kişisi</th>
                  <th>Bakiye</th>
                  <th>Kredi Limiti</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td style={{ fontWeight: '500' }}>{customer.name}</td>
                    <td>{customer.companyName || '-'}</td>
                    <td>{customer.group || '-'}</td>
                    <td>{customer.phone || '-'}</td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.city || '-'}</td>
                    <td>{customer.contactPerson || '-'}</td>
                  <td>{(customer.balance || 0).toFixed(2)} ₺</td>
                  <td>{customer.creditLimit !== undefined ? `${customer.creditLimit.toFixed(2)} ₺` : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit size={14} />
                          Düzenle
                        </button>
                        <button
                          onClick={() => customer.id && handleDelete(customer.id)}
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

        <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', border: '1px solid #e0e0e0', fontSize: '13px', color: '#666' }}>
          <strong style={{ color: '#000' }}>Toplam Müşteri Sayısı:</strong> {filteredCustomers.length}
        </div>
      </div>
    </Layout>
  );
}


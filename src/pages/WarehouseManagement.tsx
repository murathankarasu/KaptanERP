import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { addWarehouse, getWarehouses, updateWarehouse, deleteWarehouse, Warehouse } from '../services/warehouseService';
import { addErrorLog } from '../services/userService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { Plus, X, Edit, Save, Warehouse as WarehouseIcon } from 'lucide-react';

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: ''
  });

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const data = await getWarehouses(currentCompany?.companyId);
      setWarehouses(data);
    } catch (error: any) {
      console.error('Depo listesi yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Depo listesi yüklenirken hata: ${error.message || error}`,
        'WarehouseManagement',
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
    
    if (!formData.name.trim()) {
      alert('Depo adı zorunludur');
      return;
    }

    try {
      const currentCompany = getCurrentCompany();
      const warehouseData = {
        ...formData,
        companyId: currentCompany?.companyId
      };
      
      if (editingId) {
        await updateWarehouse(editingId, warehouseData);
        alert('Depo başarıyla güncellendi!');
      } else {
        await addWarehouse(warehouseData);
        alert('Depo başarıyla eklendi!');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        location: ''
      });
      loadWarehouses();
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Depo kaydedilirken hata: ${error.message || error}`,
        'WarehouseManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Hata: ' + (error.message || 'Depo kaydedilirken bir hata oluştu'));
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingId(warehouse.id || null);
    setFormData({
      name: warehouse.name,
      description: warehouse.description || '',
      location: warehouse.location || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu depoyu silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await deleteWarehouse(id);
      alert('Depo başarıyla silindi!');
      loadWarehouses();
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Depo silinirken hata: ${error.message || error}`,
        'WarehouseManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Hata: ' + (error.message || 'Depo silinirken bir hata oluştu'));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      location: ''
    });
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <WarehouseIcon size={32} color="#000" />
            <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
              Depo Yönetimi
            </h1>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            Yeni Depo Ekle
          </button>
        </div>

        {/* Bilgi Kutusu */}
        <div style={{
          background: '#f5f5f5',
          border: '1px solid #e0e0e0',
          padding: '20px',
          marginBottom: '30px',
          fontSize: '13px',
          color: '#666',
          lineHeight: '1.8'
        }}>
          <strong style={{ color: '#000', display: 'block', marginBottom: '8px' }}>
            Bilgi:
          </strong>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>İstediğiniz kadar depo oluşturabilirsiniz (sınırsız)</li>
            <li>Depo adları özelleştirilebilir (örn: Aşağı Depo, Yukarı Depo, Ana Depo)</li>
            <li>Oluşturduğunuz depolar stok giriş ve çıkış işlemlerinde kullanılabilir</li>
          </ul>
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
              {editingId ? 'Depo Düzenle' : 'Yeni Depo Ekle'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Depo Adı <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Örn: Aşağı Depo, Yukarı Depo"
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
                    Konum
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Örn: Bina 1, Kat 2"
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
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Depo hakkında ek bilgiler..."
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
          ) : warehouses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Henüz depo kaydı bulunmamaktadır. Yeni depo eklemek için yukarıdaki butona tıklayın.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Depo Adı</th>
                  <th>Konum</th>
                  <th>Açıklama</th>
                  <th>Oluşturulma Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td style={{ fontWeight: '500' }}>{warehouse.name}</td>
                    <td>{warehouse.location || '-'}</td>
                    <td>{warehouse.description || '-'}</td>
                    <td>{warehouse.createdAt ? new Date(warehouse.createdAt as any).toLocaleDateString('tr-TR') : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(warehouse)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit size={14} />
                          Düzenle
                        </button>
                        <button
                          onClick={() => warehouse.id && handleDelete(warehouse.id)}
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
          <strong style={{ color: '#000' }}>Toplam Depo Sayısı:</strong> {warehouses.length}
        </div>
      </div>
    </Layout>
  );
}


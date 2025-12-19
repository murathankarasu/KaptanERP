import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { addPriceRule, getPriceRules, updatePriceRule, deletePriceRule, PriceRule } from '../services/priceService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { Plus, Save, X, Edit, Trash2, Tags } from 'lucide-react';

const emptyForm = {
  sku: '',
  materialName: '',
  customerId: '',
  customerGroup: '',
  price: '',
  currency: 'TRY',
  discountPercent: '',
  minQuantity: '',
  startDate: '',
  endDate: ''
};

export default function PriceListManagement() {
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const company = getCurrentCompany();
      const data = await getPriceRules(company?.companyId);
      setRules(data);
    } catch (error: any) {
      const userInfo = JSON.parse(localStorage.getItem('currentUser') || 'null');
      await addErrorLog(`Fiyat listesi yüklenirken hata: ${error.message || error}`, 'PriceListManagement', userInfo?.id, userInfo?.username);
      alert('Veri yüklenirken hata');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.materialName || !form.price || !form.currency) {
      alert('Malzeme adı, fiyat ve para birimi zorunlu');
      return;
    }
    const priceNum = parseFloat(form.price);
    const discNum = form.discountPercent ? parseFloat(form.discountPercent) : undefined;
    const minQtyNum = form.minQuantity ? parseFloat(form.minQuantity) : undefined;
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Geçerli bir fiyat girin');
      return;
    }
    const company = getCurrentCompany();
    const payload: Omit<PriceRule, 'id' | 'createdAt' | 'updatedAt'> = {
      sku: form.sku || undefined,
      materialName: form.materialName,
      customerId: form.customerId || undefined,
      customerGroup: form.customerGroup || undefined,
      price: priceNum,
      currency: form.currency,
      discountPercent: discNum,
      minQuantity: minQtyNum,
      startDate: form.startDate ? new Date(form.startDate) : undefined,
      endDate: form.endDate ? new Date(form.endDate) : undefined,
      companyId: company?.companyId
    };
    try {
      if (editingId) {
        await updatePriceRule(editingId, payload);
        alert('Fiyat kuralı güncellendi');
      } else {
        await addPriceRule(payload);
        alert('Fiyat kuralı eklendi');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      alert('Kayıt hatası: ' + (error.message || ''));
    }
  };

  const handleEdit = (r: PriceRule) => {
    setEditingId(r.id || null);
    setForm({
      sku: r.sku || '',
      materialName: r.materialName,
      customerId: r.customerId || '',
      customerGroup: r.customerGroup || '',
      price: r.price.toString(),
      currency: r.currency || 'TRY',
      discountPercent: r.discountPercent !== undefined ? r.discountPercent.toString() : '',
      minQuantity: r.minQuantity !== undefined ? r.minQuantity.toString() : '',
      startDate: r.startDate ? r.startDate.toISOString().split('T')[0] : '',
      endDate: r.endDate ? r.endDate.toISOString().split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deletePriceRule(id);
    loadData();
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tags size={24} />
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Fiyat Listeleri / Kampanyalar</h1>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} /> Yeni Kural
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '20px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">Malzeme *</label>
                  <input className="excel-form-input" value={form.materialName} onChange={(e) => setForm({ ...form, materialName: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">SKU</label>
                  <input className="excel-form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Müşteri ID</label>
                  <input className="excel-form-input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} placeholder="Boş: tüm müşteriler" />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Müşteri Grubu</label>
                  <input className="excel-form-input" value={form.customerGroup} onChange={(e) => setForm({ ...form, customerGroup: e.target.value })} placeholder="Örn: Gold/Silver" />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Fiyat *</label>
                  <input className="excel-form-input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Para Birimi</label>
                  <input className="excel-form-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">İskonto (%)</label>
                  <input className="excel-form-input" type="number" step="0.01" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="Örn: 5" />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Min. Miktar</label>
                  <input className="excel-form-input" type="number" step="0.01" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} placeholder="Örn: 10" />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Başlangıç Tarihi</label>
                  <input className="excel-form-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Bitiş Tarihi</label>
                  <input className="excel-form-input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary"><Save size={14} /> {editingId ? 'Güncelle' : 'Kaydet'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}><X size={14} /> İptal</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : rules.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Henüz fiyat kuralı yok.</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Malzeme</th>
                  <th>SKU</th>
                  <th>Müşteri/Grup</th>
                  <th>Fiyat</th>
                  <th>İskonto</th>
                  <th>Min Miktar</th>
                  <th>Geçerlilik</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.materialName}</td>
                    <td>{r.sku || '-'}</td>
                    <td>
                      {r.customerId ? `ID: ${r.customerId}` : (r.customerGroup || 'Tümü')}
                    </td>
                    <td>{r.price.toFixed(2)} {r.currency}</td>
                    <td>{r.discountPercent ? `${r.discountPercent}%` : '-'}</td>
                    <td>{r.minQuantity || '-'}</td>
                    <td>
                      {r.startDate ? r.startDate.toLocaleDateString('tr-TR') : '-'} / {r.endDate ? r.endDate.toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(r)}><Edit size={12} /> Düzenle</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: '#dc3545' }} onClick={() => r.id && handleDelete(r.id)}><Trash2 size={12} /> Sil</button>
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


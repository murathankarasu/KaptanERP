import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { addProduct, getProducts, updateProduct, deleteProduct, Product, UnitConversion } from '../services/productService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { Plus, Save, X, Edit, Trash2, Package } from 'lucide-react';

const emptyForm = {
  sku: '',
  name: '',
  category: '',
  baseUnit: '',
  barcode: '',
  variantColor: '',
  variantSize: '',
  lotTracking: false,
  expiryRequired: false,
  conversions: [] as UnitConversion[]
};

export default function ProductManagement() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [convForm, setConvForm] = useState({ fromUnit: '', toUnit: '', factor: '' });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const company = getCurrentCompany();
      const data = await getProducts(company?.companyId);
      setProducts(data);
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(`Ürünler yüklenirken hata: ${error.message || error}`, 'ProductManagement', userInfo?.id, userInfo?.username);
      alert('Veri yüklenirken hata');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setConvForm({ fromUnit: '', toUnit: '', factor: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sku || !form.name || !form.baseUnit) {
      alert('SKU, Ad ve Temel Birim zorunlu');
      return;
    }
    const company = getCurrentCompany();
    const payload: Product = {
      sku: form.sku,
      name: form.name,
      category: form.category || undefined,
      baseUnit: form.baseUnit,
      barcode: form.barcode || undefined,
      variant: form.variantColor || form.variantSize ? { color: form.variantColor || undefined, size: form.variantSize || undefined } : undefined,
      units: form.conversions.length ? form.conversions : undefined,
      lotTracking: form.lotTracking,
      expiryRequired: form.expiryRequired,
      companyId: company?.companyId
    };
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        alert('Ürün güncellendi');
      } else {
        await addProduct(payload);
        alert('Ürün eklendi');
      }
      resetForm();
      setShowForm(false);
      loadProducts();
    } catch (error: any) {
      alert('Kayıt hatası: ' + (error.message || ''));
    }
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id || null);
    setForm({
      sku: p.sku || '',
      name: p.name || '',
      category: p.category || '',
      baseUnit: p.baseUnit || '',
      barcode: p.barcode || '',
      variantColor: p.variant?.color || '',
      variantSize: p.variant?.size || '',
      lotTracking: !!p.lotTracking,
      expiryRequired: !!p.expiryRequired,
      conversions: p.units || []
    });
    setConvForm({ fromUnit: '', toUnit: '', factor: '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await deleteProduct(id);
      loadProducts();
    } catch (error: any) {
      alert('Silme hatası: ' + (error.message || ''));
    }
  };

  const addConversion = () => {
    const f = parseFloat(convForm.factor);
    if (!convForm.fromUnit || !convForm.toUnit || isNaN(f) || f <= 0) {
      alert('Geçerli dönüşüm girin');
      return;
    }
    setForm({ ...form, conversions: [...form.conversions, { fromUnit: convForm.fromUnit, toUnit: convForm.toUnit, factor: f }] });
    setConvForm({ fromUnit: '', toUnit: '', factor: '' });
  };

  const removeConversion = (idx: number) => {
    setForm({ ...form, conversions: form.conversions.filter((_, i) => i !== idx) });
  };

  const goToStockEntry = (p: Product) => {
    const params = new URLSearchParams({
      sku: p.sku || '',
      materialName: p.name || '',
      category: p.category || '',
      unit: p.baseUnit || '',
      baseUnit: p.baseUnit || '',
      variant: p.variant ? [p.variant.color, p.variant.size].filter(Boolean).join(' ') : ''
    });
    navigate(`/stock-entry?${params.toString()}`);
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={28} />
            <h1 style={{ fontSize: '30px', fontWeight: 700 }}>Ürün Kartları</h1>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} /> Yeni Ürün
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '20px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-4">
                <div className="excel-form-group">
                  <label className="excel-form-label">SKU *</label>
                  <input className="excel-form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Ürün Adı *</label>
                  <input className="excel-form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Kategori</label>
                  <input className="excel-form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Barkod</label>
                  <input className="excel-form-input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Temel Birim *</label>
                  <input className="excel-form-input" value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Varyant Renk</label>
                  <input className="excel-form-input" value={form.variantColor} onChange={(e) => setForm({ ...form, variantColor: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Varyant Beden</label>
                  <input className="excel-form-input" value={form.variantSize} onChange={(e) => setForm({ ...form, variantSize: e.target.value })} />
                </div>
                <div className="excel-form-group" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label className="excel-form-label">Lot Takibi</label>
                  <input type="checkbox" checked={form.lotTracking} onChange={(e) => setForm({ ...form, lotTracking: e.target.checked })} />
                  <label className="excel-form-label">SKT Zorunlu</label>
                  <input type="checkbox" checked={form.expiryRequired} onChange={(e) => setForm({ ...form, expiryRequired: e.target.checked })} />
                </div>
              </div>

              <div style={{ marginTop: '15px', border: '1px solid #e0e0e0', padding: '12px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Birim Dönüşümleri</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                  <input className="excel-form-input" placeholder="Kaynak Birim" value={convForm.fromUnit} onChange={(e) => setConvForm({ ...convForm, fromUnit: e.target.value })} />
                  <input className="excel-form-input" placeholder="Hedef Birim" value={convForm.toUnit} onChange={(e) => setConvForm({ ...convForm, toUnit: e.target.value })} />
                  <input className="excel-form-input" type="number" step="0.0001" placeholder="Katsayı" value={convForm.factor} onChange={(e) => setConvForm({ ...convForm, factor: e.target.value })} />
                  <button type="button" className="btn btn-secondary" onClick={addConversion}>Ekle</button>
                </div>
                {form.conversions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {form.conversions.map((c, idx) => (
                      <div key={idx} style={{ border: '1px solid #ccc', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span>{c.fromUnit} → {c.toUnit} x {c.factor}</span>
                        <button type="button" className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => removeConversion(idx)}>Sil</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" className="btn btn-primary"><Save size={16} /> {editingId ? 'Güncelle' : 'Kaydet'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}><X size={16} /> İptal</button>
              </div>
            </form>
          </div>
        )}

        {/* Liste */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : products.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Henüz ürün kartı yok.</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Ad</th>
                  <th>Kategori</th>
                  <th>Barkod</th>
                  <th>Temel Birim</th>
                  <th>Varyant</th>
                  <th>Lot/SKT</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category || '-'}</td>
                    <td>{p.barcode || '-'}</td>
                    <td>{p.baseUnit}</td>
                    <td>{p.variant ? `${p.variant.color || ''} ${p.variant.size || ''}`.trim() || '-' : '-'}</td>
                    <td>{p.lotTracking ? 'Evet' : 'Hayır'} / {p.expiryRequired ? 'Evet' : 'Hayır'}</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(p)}>
                        <Edit size={14} /> Düzenle
                      </button>
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => goToStockEntry(p)}>
                      Stok Girişi
                    </button>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: '#dc3545' }} onClick={() => p.id && handleDelete(p.id)}>
                        <Trash2 size={14} /> Sil
                      </button>
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


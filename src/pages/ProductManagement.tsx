import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { addProduct, getProducts, updateProduct, deleteProduct, Product, UnitConversion } from '../services/productService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { Plus, Save, X, Edit, Trash2, Package } from 'lucide-react';

const STANDARD_UNITS = [
  'Adet', 'Kg', 'Lt', 'm', 'm²', 'm³', 'Paket', 'Koli', 'Kutu', 'Palet',
  'Gram', 'Ton', 'Mililitre', 'Metreküp', 'Metrekare', 'Düzine', 'Gros',
  'Çift', 'Takım', 'Set', 'Demet', 'Bağ', 'Top', 'Rulo', 'Metre'
];

const emptyForm = {
  sku: '',
  name: '',
  category: '',
  baseUnit: '',
  variantColor: '',
  variantSize: '',
  autoSku: false,
  criticalLevel: '',
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
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('');

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
    setSelectedUnit('');
  };

  const generateAutoSku = (name: string, category: string): string => {
    const namePart = name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const categoryPart = category ? category.substring(0, 2).toUpperCase() : '';
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${namePart}${categoryPart}${randomPart}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.baseUnit) {
      alert('Ad ve Temel Birim zorunlu');
      return;
    }
    
    let finalSku = form.sku || undefined;
    if (form.autoSku && !finalSku) {
      finalSku = generateAutoSku(form.name, form.category);
    }
    
    const company = getCurrentCompany();
    const payload: Product = {
      sku: finalSku,
      name: form.name,
      category: form.category || undefined,
      baseUnit: form.baseUnit,
      variant: form.variantColor || form.variantSize ? { color: form.variantColor || undefined, size: form.variantSize || undefined } : undefined,
      units: form.conversions.length ? form.conversions : undefined,
      criticalLevel: form.criticalLevel ? parseFloat(form.criticalLevel) : undefined,
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
      variantColor: p.variant?.color || '',
      variantSize: p.variant?.size || '',
      autoSku: false,
      criticalLevel: p.criticalLevel?.toString() || '',
      conversions: p.units || []
    });
    setConvForm({ fromUnit: '', toUnit: '', factor: '' });
    setSelectedUnit('');
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

  const handleBaseUnitSelect = (unit: string) => {
    setForm({ ...form, baseUnit: unit });
    setSelectedUnit('');
    setShowUnitModal(false);
  };

  const calculateAutoFactor = (fromUnit: string, toUnit: string): number => {
    // Basit dönüşüm mantığı - kullanıcı değiştirebilir
    const conversions: Record<string, Record<string, number>> = {
      'Adet': { 'Düzine': 12, 'Gros': 144, 'Koli': 24, 'Paket': 1 },
      'Kg': { 'Gram': 1000, 'Ton': 0.001 },
      'Lt': { 'Mililitre': 1000 },
      'm': { 'cm': 100, 'mm': 1000 },
      'm²': { 'cm²': 10000 },
      'm³': { 'Lt': 1000, 'cm³': 1000000 }
    };
    
    if (conversions[fromUnit] && conversions[fromUnit][toUnit]) {
      return conversions[fromUnit][toUnit];
    }
    
    // Varsayılan olarak 1 döndür (kullanıcı düzeltebilir)
    return 1;
  };

  const addConversion = () => {
    if (!convForm.toUnit) {
      alert('Lütfen hedef birim seçin');
      return;
    }
    
    const fromUnit = form.baseUnit;
    if (!fromUnit) {
      alert('Önce temel birim seçin');
      return;
    }
    
    // Katsayı otomatik hesapla ama kullanıcı değiştirebilir
    const autoFactor = convForm.factor ? parseFloat(convForm.factor) : calculateAutoFactor(fromUnit, convForm.toUnit);
    
    if (isNaN(autoFactor) || autoFactor <= 0) {
      alert('Geçerli bir katsayı girin');
      return;
    }
    
    // Aynı dönüşüm zaten varsa uyar
    if (form.conversions.some(c => c.fromUnit === fromUnit && c.toUnit === convForm.toUnit)) {
      alert('Bu dönüşüm zaten eklenmiş');
      return;
    }
    
    setForm({ 
      ...form, 
      conversions: [...form.conversions, { fromUnit, toUnit: convForm.toUnit, factor: autoFactor }] 
    });
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
                  <label className="excel-form-label">SKU</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      className="excel-form-input" 
                      value={form.sku} 
                      onChange={(e) => setForm({ ...form, sku: e.target.value })} 
                      disabled={form.autoSku}
                      placeholder={form.autoSku ? 'Otomatik oluşturulacak' : 'SKU girin (opsiyonel)'}
                      style={{ flex: 1 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      <input 
                        type="checkbox" 
                        checked={form.autoSku} 
                        onChange={(e) => setForm({ ...form, autoSku: e.target.checked, sku: e.target.checked ? '' : form.sku })} 
                      />
                      Otomatik Ata
                    </label>
                  </div>
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
                  <label className="excel-form-label">Temel Birim *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      className="excel-form-input" 
                      value={form.baseUnit} 
                      onClick={() => setShowUnitModal(true)}
                      readOnly
                      required
                      placeholder="Temel birim seçin"
                      style={{ flex: 1, cursor: 'pointer' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowUnitModal(true)}
                      style={{ padding: '8px 12px' }}
                    >
                      Seç
                    </button>
                  </div>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Varyant Renk</label>
                  <input className="excel-form-input" value={form.variantColor} onChange={(e) => setForm({ ...form, variantColor: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Varyant Beden</label>
                  <input className="excel-form-input" value={form.variantSize} onChange={(e) => setForm({ ...form, variantSize: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Kritik Seviye</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    className="excel-form-input" 
                    value={form.criticalLevel} 
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setForm({ ...form, criticalLevel: value });
                      }
                    }}
                    placeholder="Kritik stok seviyesi (opsiyonel)"
                  />
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                    Stok bu seviyenin altına düştüğünde uyarı verilir
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '15px', border: '1px solid #e0e0e0', padding: '12px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Birim Dönüşümleri</h4>
                {!form.baseUnit && (
                  <div style={{ padding: '8px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', marginBottom: '10px', fontSize: '12px' }}>
                    Önce temel birim seçin
                  </div>
                )}
                {form.baseUnit && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                        <strong>{form.baseUnit}</strong> (Temel Birim)
                      </div>
                      <select 
                        className="excel-form-select" 
                        value={convForm.toUnit} 
                        onChange={(e) => {
                          const toUnit = e.target.value;
                          const autoFactor = calculateAutoFactor(form.baseUnit, toUnit);
                          setConvForm({ ...convForm, toUnit, factor: autoFactor.toString() });
                        }}
                      >
                        <option value="">Hedef Birim Seçin</option>
                        {STANDARD_UNITS.filter(u => u !== form.baseUnit).map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      <input 
                        className="excel-form-input" 
                        type="number" 
                        step="0.0001" 
                        placeholder="Katsayı (otomatik)" 
                        value={convForm.factor} 
                        onChange={(e) => setConvForm({ ...convForm, factor: e.target.value })} 
                      />
                      <button type="button" className="btn btn-secondary" onClick={addConversion} disabled={!convForm.toUnit}>Ekle</button>
                    </div>
                    {form.conversions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        {form.conversions.map((c, idx) => (
                          <div key={idx} style={{ border: '1px solid #ccc', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span>{c.fromUnit} → {c.toUnit} x {c.factor}</span>
                            <button type="button" className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => removeConversion(idx)}>Sil</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: '8px', padding: '8px', background: '#e7f3ff', border: '1px solid #b3d9ff', borderRadius: '4px', fontSize: '11px', lineHeight: '1.5' }}>
                      <strong>Nasıl Kullanılır:</strong> Birim dönüşümleri, stok giriş/çıkış işlemlerinde farklı birimlerle çalışmanızı sağlar. 
                      Örneğin temel birim "Adet" ise, "Koli" birimine dönüşüm ekleyerek koliler halinde giriş yapabilirsiniz. 
                      Katsayı otomatik hesaplanır ancak ihtiyacınıza göre düzenleyebilirsiniz.
                    </div>
                  </>
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
                  <th>Temel Birim</th>
                  <th>Varyant</th>
                  <th>Kritik Seviye</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category || '-'}</td>
                    <td>{p.baseUnit}</td>
                    <td>{p.variant ? `${p.variant.color || ''} ${p.variant.size || ''}`.trim() || '-' : '-'}</td>
                    <td>{p.criticalLevel ? p.criticalLevel : '-'}</td>
                    <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

        {/* Temel Birim Seçim Modalı */}
        {showUnitModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }} onClick={() => setShowUnitModal(false)}>
            <div style={{
              background: '#fff',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '2px solid #000'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Temel Birim Seçin</h3>
                <button onClick={() => setShowUnitModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginBottom: '15px' }}>
                {STANDARD_UNITS.map(unit => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => {
                      setSelectedUnit(unit);
                      handleBaseUnitSelect(unit);
                    }}
                    style={{
                      padding: '10px',
                      border: selectedUnit === unit || form.baseUnit === unit ? '2px solid #000' : '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: selectedUnit === unit || form.baseUnit === unit ? '#f0f0f0' : '#fff',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: selectedUnit === unit || form.baseUnit === unit ? 600 : 400,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedUnit !== unit && form.baseUnit !== unit) {
                        e.currentTarget.style.background = '#f8f8f8';
                        e.currentTarget.style.borderColor = '#999';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedUnit !== unit && form.baseUnit !== unit) {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.borderColor = '#ccc';
                      }
                    }}
                  >
                    {unit}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => {
                  setShowUnitModal(false);
                  setSelectedUnit('');
                }}>İptal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}


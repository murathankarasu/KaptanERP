import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { addBOM, getBOMs, updateBOM, deleteBOM, BOM, BOMItem } from '../services/productionService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { Plus, Save, X, Edit, Trash2, Layers } from 'lucide-react';

const emptyItem = { materialName: '', quantity: '', unit: '', type: 'raw' as BOMItem['type'], costPerUnit: '' };

export default function BOMManagement() {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    productName: '',
    sku: '',
    version: '',
    items: [] as BOMItem[]
  });
  const [newItem, setNewItem] = useState({ ...emptyItem });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const company = getCurrentCompany();
    const data = await getBOMs(company?.companyId);
    setBoms(data);
    setLoading(false);
  };

  const addItem = () => {
    if (!newItem.materialName || !newItem.quantity || !newItem.unit) {
      alert('Malzeme, miktar, birim zorunlu');
      return;
    }
    const qty = parseFloat(String(newItem.quantity));
    if (isNaN(qty) || qty <= 0) {
      alert('Geçerli miktar girin');
      return;
    }
    const cost = newItem.costPerUnit ? parseFloat(String(newItem.costPerUnit)) : undefined;
    const item: BOMItem = {
      materialName: newItem.materialName,
      quantity: qty,
      unit: newItem.unit,
      type: newItem.type,
      costPerUnit: cost
    };
    setForm({ ...form, items: [...form.items, item] });
    setNewItem({ ...emptyItem });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName || form.items.length === 0) {
      alert('Ürün adı ve en az bir kalem girin');
      return;
    }
    const company = getCurrentCompany();
    const payload: Omit<BOM, 'id' | 'createdAt' | 'updatedAt'> = {
      productName: form.productName,
      sku: form.sku || undefined,
      version: form.version || undefined,
      items: form.items,
      companyId: company?.companyId
    };
    if (editingId) {
      await updateBOM(editingId, payload);
      alert('BOM güncellendi');
    } else {
      await addBOM(payload);
      alert('BOM eklendi');
    }
    setShowForm(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      productName: '',
      sku: '',
      version: '',
      items: []
    });
    setNewItem({ ...emptyItem });
  };

  const handleEdit = (b: BOM) => {
    setEditingId(b.id || null);
    setForm({
      productName: b.productName,
      sku: b.sku || '',
      version: b.version || '',
      items: b.items || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deleteBOM(id);
    loadData();
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Layers size={26} />
          <h1 style={{ fontSize: '26px', fontWeight: 700 }}>Ürün Reçeteleri (BOM)</h1>
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Yeni BOM
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '16px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">Ürün Adı *</label>
                  <input className="excel-form-input" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">SKU</label>
                  <input className="excel-form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Versiyon</label>
                  <input className="excel-form-input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: '12px', padding: '12px', border: '1px dashed #999' }}>
                <h4>Kalem Ekle</h4>
                <div className="grid-4" style={{ gap: '8px' }}>
                  <input className="excel-form-input" placeholder="Malzeme" value={newItem.materialName} onChange={(e) => setNewItem({ ...newItem, materialName: e.target.value })} />
                  <input className="excel-form-input" placeholder="Miktar" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
                  <input className="excel-form-input" placeholder="Birim" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                  <select className="excel-form-select" value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value as BOMItem['type'] })}>
                    <option value="raw">Hammadde</option>
                    <option value="semi">Yarı Mamul</option>
                    <option value="labor">İşçilik</option>
                  </select>
                  <input className="excel-form-input" placeholder="Birim Maliyeti" value={newItem.costPerUnit} onChange={(e) => setNewItem({ ...newItem, costPerUnit: e.target.value })} />
                  <button type="button" className="btn btn-secondary" onClick={addItem}><Plus size={12} /> Ekle</button>
                </div>
                {form.items.length > 0 && (
                  <table className="excel-table" style={{ marginTop: '10px' }}>
                    <thead>
                      <tr>
                        <th>Malzeme</th>
                        <th>Miktar</th>
                        <th>Birim</th>
                        <th>Tür</th>
                        <th>Birim Maliyet</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.materialName}</td>
                          <td>{it.quantity}</td>
                          <td>{it.unit}</td>
                          <td>{it.type}</td>
                          <td>{it.costPerUnit ?? '-'}</td>
                          <td><button type="button" className="btn btn-secondary" onClick={() => removeItem(idx)}><X size={12} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary"><Save size={14} /> Kaydet</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}><X size={14} /> İptal</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : boms.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Kayıt yok.</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>SKU</th>
                  <th>Versiyon</th>
                  <th>Kalem</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {boms.map(b => (
                  <tr key={b.id}>
                    <td>{b.productName}</td>
                    <td>{b.sku || '-'}</td>
                    <td>{b.version || '-'}</td>
                    <td>{b.items?.length || 0}</td>
                    <td style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-secondary" onClick={() => handleEdit(b)}><Edit size={12} /> Düzenle</button>
                      <button className="btn btn-secondary" style={{ color: '#dc3545' }} onClick={() => handleDelete(b.id)}><Trash2 size={12} /> Sil</button>
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


import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { addGoodsReceipt, getGoodsReceipts, updateGoodsReceipt, GoodsReceipt } from '../services/procurementService';
import { addStockEntry, StockEntry } from '../services/stockService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { Plus, Save, X, Edit, CheckCircle, XCircle, Inbox } from 'lucide-react';

export default function GoodsReceiptManagement() {
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    grnNumber: '',
    receiptDate: new Date().toISOString().split('T')[0],
    warehouse: '',
    items: [] as GoodsReceipt['items'],
    status: 'pending' as GoodsReceipt['status'],
    createStock: true
  });
  const [itemForm, setItemForm] = useState({ materialName: '', quantity: '', unit: '', acceptedQty: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const company = getCurrentCompany();
      const data = await getGoodsReceipts(company?.companyId);
      setGrns(data);
    } catch (error: any) {
      const userInfo = JSON.parse(localStorage.getItem('currentUser') || 'null');
      await addErrorLog(`GRN yüklenirken hata: ${error.message || error}`, 'GoodsReceiptManagement', userInfo?.id, userInfo?.username);
      alert('Veri yüklenirken hata');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      grnNumber: '',
      receiptDate: new Date().toISOString().split('T')[0],
      warehouse: '',
      items: [],
      status: 'pending',
      createStock: true
    });
    setItemForm({ materialName: '', quantity: '', unit: '', acceptedQty: '' });
    setEditingId(null);
  };

  const addItem = () => {
    const qty = parseFloat(itemForm.quantity);
    const acc = itemForm.acceptedQty ? parseFloat(itemForm.acceptedQty) : undefined;
    if (!itemForm.materialName || !itemForm.unit || isNaN(qty) || qty <= 0) {
      alert('Malzeme, birim ve miktar zorunlu');
      return;
    }
    const item: GoodsReceipt['items'][number] = {
      materialName: itemForm.materialName,
      quantity: qty,
      unit: itemForm.unit,
      acceptedQty: acc
    };
    setForm({ ...form, items: [...form.items, item] });
    setItemForm({ materialName: '', quantity: '', unit: '', acceptedQty: '' });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.grnNumber || !form.receiptDate || form.items.length === 0) {
      alert('GRN no, tarih ve kalemler zorunlu');
      return;
    }
    const company = getCurrentCompany();
    const payload: Omit<GoodsReceipt, 'id' | 'createdAt' | 'updatedAt'> = {
      grnNumber: form.grnNumber,
      receiptDate: new Date(form.receiptDate),
      warehouse: form.warehouse || undefined,
      items: form.items,
      status: form.status,
      companyId: company?.companyId
    };
    try {
      if (editingId) {
        await updateGoodsReceipt(editingId, payload);
        alert('GRN güncellendi');
      } else {
        await addGoodsReceipt(payload);
        alert('GRN eklendi');
        if (form.createStock) {
          for (const it of form.items) {
            const entry: StockEntry = {
              arrivalDate: new Date(form.receiptDate),
              materialName: it.materialName,
              category: '',
              unit: it.unit,
              quantity: it.acceptedQty || it.quantity,
              unitPrice: 0,
              supplier: payload.warehouse || 'Mal Kabul',
              warehouse: payload.warehouse,
              companyId: company?.companyId
            };
            await addStockEntry(entry);
          }
        }
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      alert('Kayıt hatası: ' + (error.message || ''));
    }
  };

  const changeStatus = async (id: string, status: GoodsReceipt['status']) => {
    await updateGoodsReceipt(id, { status });
    loadData();
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Inbox size={24} />
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Mal Kabul (GRN)</h1>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} /> Yeni GRN
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '20px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">GRN No *</label>
                  <input className="excel-form-input" value={form.grnNumber} onChange={(e) => setForm({ ...form, grnNumber: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Tarih *</label>
                  <input type="date" className="excel-form-input" value={form.receiptDate} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Depo</label>
                  <input className="excel-form-input" value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} placeholder="Depo adı (opsiyonel)" />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Durum</label>
                  <select className="excel-form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GoodsReceipt['status'] })}>
                    <option value="pending">Beklemede</option>
                    <option value="accepted">Kabul</option>
                    <option value="rejected">Reddedildi</option>
                  </select>
                </div>
              <div className="excel-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={form.createStock}
                  onChange={(e) => setForm({ ...form, createStock: e.target.checked })}
                  id="createStock"
                />
                <label htmlFor="createStock" className="excel-form-label" style={{ margin: 0 }}>
                  Mal kabulde stok girişi oluştur
                </label>
              </div>
              </div>

              <div style={{ marginTop: '12px', border: '1px solid #e0e0e0', padding: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Kalem Ekle</h4>
                <div className="grid-4" style={{ gap: '8px' }}>
                  <input className="excel-form-input" placeholder="Malzeme" value={itemForm.materialName} onChange={(e) => setItemForm({ ...itemForm, materialName: e.target.value })} />
                  <input className="excel-form-input" type="number" step="0.01" placeholder="Miktar" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                  <input className="excel-form-input" placeholder="Birim" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} />
                  <input className="excel-form-input" type="number" step="0.01" placeholder="Kabul Miktarı (opsiyonel)" value={itemForm.acceptedQty} onChange={(e) => setItemForm({ ...itemForm, acceptedQty: e.target.value })} />
                  <button type="button" className="btn btn-secondary" onClick={addItem}>Ekle</button>
                </div>
                {form.items.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {form.items.map((it, idx) => (
                      <div key={idx} style={{ border: '1px solid #ccc', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span>{it.materialName} - {it.quantity} {it.unit} {it.acceptedQty ? `(Kabul: ${it.acceptedQty})` : ''}</span>
                        <button type="button" className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => removeItem(idx)}>Sil</button>
                      </div>
                    ))}
                  </div>
                )}
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
          ) : grns.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Henüz GRN yok.</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>GRN No</th>
                  <th>Tarih</th>
                  <th>Depo</th>
                  <th>Durum</th>
                  <th>Kalem</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((g) => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600 }}>{g.grnNumber}</td>
                    <td>{g.receiptDate.toLocaleDateString('tr-TR')}</td>
                    <td>{g.warehouse || '-'}</td>
                    <td>{g.status}</td>
                    <td>{g.items.length}</td>
                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(g)}><Edit size={12} /> Düzenle</button>
                      {g.id && (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => changeStatus(g.id!, 'accepted')}><CheckCircle size={12} /> Kabul</button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => changeStatus(g.id!, 'rejected')}><XCircle size={12} /> Reddet</button>
                        </>
                      )}
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


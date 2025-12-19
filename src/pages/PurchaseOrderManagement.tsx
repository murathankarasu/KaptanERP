import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { addPurchaseOrder, getPurchaseOrders, updatePurchaseOrder, PurchaseOrder, RequisitionItem } from '../services/procurementService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { Plus, Save, X, Edit, CheckCircle2, Truck, DollarSign } from 'lucide-react';

export default function PurchaseOrderManagement() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    poNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    supplier: '',
    items: [] as RequisitionItem[],
    status: 'pending' as PurchaseOrder['status'],
    totalAmount: 0
  });
  const [itemForm, setItemForm] = useState({ materialName: '', quantity: '', unit: '', unitPrice: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const company = getCurrentCompany();
      const data = await getPurchaseOrders(company?.companyId);
      setPos(data);
    } catch (error: any) {
      const userInfo = JSON.parse(localStorage.getItem('currentUser') || 'null');
      await addErrorLog(`PO yüklenirken hata: ${error.message || error}`, 'PurchaseOrderManagement', userInfo?.id, userInfo?.username);
      alert('Veri yüklenirken hata');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      poNumber: '',
      orderDate: new Date().toISOString().split('T')[0],
      supplier: '',
      items: [],
      status: 'pending',
      totalAmount: 0
    });
    setItemForm({ materialName: '', quantity: '', unit: '', unitPrice: '' });
    setEditingId(null);
  };

  const addItem = () => {
    const qty = parseFloat(itemForm.quantity);
    const price = parseFloat(itemForm.unitPrice);
    if (!itemForm.materialName || !itemForm.unit || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      alert('Malzeme, birim, miktar ve fiyat zorunlu');
      return;
    }
    const item: RequisitionItem & { unitPrice: number } = {
      materialName: itemForm.materialName,
      quantity: qty,
      unit: itemForm.unit,
      notes: undefined,
      unitPrice: price
    };
    const items = [...form.items, item];
    const totalAmount = items.reduce((s, it: any) => s + it.quantity * it.unitPrice, 0);
    setForm({ ...form, items, totalAmount });
    setItemForm({ materialName: '', quantity: '', unit: '', unitPrice: '' });
  };

  const removeItem = (idx: number) => {
    const items = form.items.filter((_, i) => i !== idx);
    const totalAmount = items.reduce((s: number, it: any) => s + it.quantity * it.unitPrice, 0);
    setForm({ ...form, items, totalAmount });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.poNumber || !form.orderDate || !form.supplier || form.items.length === 0) {
      alert('PO no, tarih, tedarikçi ve kalemler zorunlu');
      return;
    }
    const company = getCurrentCompany();
    const payload: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'> = {
      poNumber: form.poNumber,
      orderDate: new Date(form.orderDate),
      supplier: form.supplier,
      items: form.items as any,
      status: form.status,
      totalAmount: form.totalAmount,
      companyId: company?.companyId
    };
    try {
      if (editingId) {
        await updatePurchaseOrder(editingId, payload);
        alert('PO güncellendi');
      } else {
        await addPurchaseOrder(payload);
        alert('PO eklendi');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      alert('Kayıt hatası: ' + (error.message || ''));
    }
  };

  const handleEdit = (po: PurchaseOrder) => {
    setEditingId(po.id || null);
    setForm({
      poNumber: po.poNumber,
      orderDate: po.orderDate.toISOString().split('T')[0],
      supplier: po.supplier,
      items: po.items as any,
      status: po.status,
      totalAmount: po.totalAmount || 0
    });
    setShowForm(true);
  };

  const changeStatus = async (id: string, status: PurchaseOrder['status']) => {
    await updatePurchaseOrder(id, { status });
    loadData();
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DollarSign size={24} />
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Satınalma Siparişleri</h1>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} /> Yeni PO
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '20px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">PO No *</label>
                  <input className="excel-form-input" value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Tarih *</label>
                  <input type="date" className="excel-form-input" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Tedarikçi *</label>
                  <input className="excel-form-input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Durum</label>
                  <select className="excel-form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PurchaseOrder['status'] })}>
                    <option value="pending">Beklemede</option>
                    <option value="issued">İletildi</option>
                    <option value="received">Teslim Alındı</option>
                    <option value="billed">Faturalandı</option>
                    <option value="closed">Kapalı</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px', border: '1px solid #e0e0e0', padding: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Kalem Ekle</h4>
                <div className="grid-4" style={{ gap: '8px' }}>
                  <input className="excel-form-input" placeholder="Malzeme" value={itemForm.materialName} onChange={(e) => setItemForm({ ...itemForm, materialName: e.target.value })} />
                  <input className="excel-form-input" type="number" step="0.01" placeholder="Miktar" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                  <input className="excel-form-input" placeholder="Birim" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} />
                  <input className="excel-form-input" type="number" step="0.01" placeholder="Birim Fiyat" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} />
                  <button type="button" className="btn btn-secondary" onClick={addItem}>Ekle</button>
                </div>
                {form.items.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {form.items.map((it: any, idx) => (
                      <div key={idx} style={{ border: '1px solid #ccc', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span>{it.materialName} - {it.quantity} {it.unit} x {it.unitPrice || 0}</span>
                        <button type="button" className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => removeItem(idx)}>Sil</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
                <button type="submit" className="btn btn-primary"><Save size={14} /> {editingId ? 'Güncelle' : 'Kaydet'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}><X size={14} /> İptal</button>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Toplam: {form.totalAmount.toFixed(2)} ₺</div>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : pos.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Henüz PO yok.</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>PO No</th>
                  <th>Tedarikçi</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                  <th>Kalem</th>
                  <th>Toplam</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.poNumber}</td>
                    <td>{p.supplier}</td>
                    <td>{p.orderDate.toLocaleDateString('tr-TR')}</td>
                    <td>{p.status}</td>
                    <td>{p.items.length}</td>
                    <td>{(p.totalAmount || 0).toFixed(2)} ₺</td>
                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(p)}><Edit size={12} /> Düzenle</button>
                      {p.id && (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => changeStatus(p.id!, 'issued')}><CheckCircle2 size={12} /> İletildi</button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => changeStatus(p.id!, 'received')}><Truck size={12} /> Teslim</button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => changeStatus(p.id!, 'billed')}><DollarSign size={12} /> Faturalandı</button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => changeStatus(p.id!, 'closed')}><CheckCircle2 size={12} /> Kapalı</button>
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


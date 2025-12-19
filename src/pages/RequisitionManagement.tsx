import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { addRequisition, getRequisitions, updateRequisition, Requisition, RequisitionItem } from '../services/procurementService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { Plus, Save, X, Edit, CheckCircle, XCircle, ClipboardList } from 'lucide-react';

export default function RequisitionManagement() {
  const [reqs, setReqs] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    reqNumber: '',
    requestDate: new Date().toISOString().split('T')[0],
    requestedBy: '',
    status: 'draft' as Requisition['status'],
    items: [] as RequisitionItem[]
  });
  const [itemForm, setItemForm] = useState({ materialName: '', quantity: '', unit: '', notes: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const company = getCurrentCompany();
      const data = await getRequisitions(company?.companyId);
      setReqs(data);
    } catch (error: any) {
      const userInfo = JSON.parse(localStorage.getItem('currentUser') || 'null');
      await addErrorLog(`Requisition yüklenirken hata: ${error.message || error}`, 'RequisitionManagement', userInfo?.id, userInfo?.username);
      alert('Veriler yüklenirken hata');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      reqNumber: '',
      requestDate: new Date().toISOString().split('T')[0],
      requestedBy: '',
      status: 'draft',
      items: []
    });
    setItemForm({ materialName: '', quantity: '', unit: '', notes: '' });
    setEditingId(null);
  };

  const addItem = () => {
    const qty = parseFloat(itemForm.quantity);
    if (!itemForm.materialName || !itemForm.unit || isNaN(qty) || qty <= 0) {
      alert('Malzeme, birim ve miktar zorunlu');
      return;
    }
    const item: RequisitionItem = {
      materialName: itemForm.materialName,
      quantity: qty,
      unit: itemForm.unit,
      notes: itemForm.notes || undefined
    };
    setForm({ ...form, items: [...form.items, item] });
    setItemForm({ materialName: '', quantity: '', unit: '', notes: '' });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reqNumber || !form.requestDate || form.items.length === 0) {
      alert('Talep numarası, tarih ve en az bir kalem zorunlu');
      return;
    }
    try {
      const company = getCurrentCompany();
      const payload: Omit<Requisition, 'id' | 'createdAt' | 'updatedAt'> = {
        reqNumber: form.reqNumber,
        requestDate: new Date(form.requestDate),
        requestedBy: form.requestedBy || undefined,
        status: form.status,
        items: form.items,
        companyId: company?.companyId
      };
      if (editingId) {
        await updateRequisition(editingId, payload);
        alert('Talep güncellendi');
      } else {
        await addRequisition(payload);
        alert('Talep eklendi');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      alert('Kayıt hatası: ' + (error.message || ''));
    }
  };

  const handleEdit = (req: Requisition) => {
    setEditingId(req.id || null);
    setForm({
      reqNumber: req.reqNumber,
      requestDate: req.requestDate.toISOString().split('T')[0],
      requestedBy: req.requestedBy || '',
      status: req.status,
      items: req.items
    });
    setShowForm(true);
  };

  const changeStatus = async (id: string, status: Requisition['status']) => {
    await updateRequisition(id, { status });
    loadData();
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={24} />
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Satınalma Talepleri</h1>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} /> Yeni Talep
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '20px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">Talep No *</label>
                  <input className="excel-form-input" value={form.reqNumber} onChange={(e) => setForm({ ...form, reqNumber: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Talep Tarihi *</label>
                  <input type="date" className="excel-form-input" value={form.requestDate} onChange={(e) => setForm({ ...form, requestDate: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Talep Eden</label>
                  <input className="excel-form-input" value={form.requestedBy} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: '12px', border: '1px solid #e0e0e0', padding: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Kalem Ekle</h4>
                <div className="grid-4" style={{ gap: '8px' }}>
                  <input className="excel-form-input" placeholder="Malzeme" value={itemForm.materialName} onChange={(e) => setItemForm({ ...itemForm, materialName: e.target.value })} />
                  <input className="excel-form-input" type="number" step="0.01" placeholder="Miktar" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
                  <input className="excel-form-input" placeholder="Birim" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} />
                  <button type="button" className="btn btn-secondary" onClick={addItem}>Ekle</button>
                  <input className="excel-form-input" placeholder="Not (opsiyonel)" value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
                </div>
                {form.items.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {form.items.map((it, idx) => (
                      <div key={idx} style={{ border: '1px solid #ccc', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span>{it.materialName} - {it.quantity} {it.unit}</span>
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
          ) : reqs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Henüz talep yok.</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Talep No</th>
                  <th>Tarih</th>
                  <th>Talep Eden</th>
                  <th>Durum</th>
                  <th>Kalem Sayısı</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {reqs.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.reqNumber}</td>
                    <td>{r.requestDate.toLocaleDateString('tr-TR')}</td>
                    <td>{r.requestedBy || '-'}</td>
                    <td>{r.status}</td>
                    <td>{r.items.length}</td>
                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(r)}><Edit size={12} /> Düzenle</button>
                      {r.id && (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => changeStatus(r.id!, 'approved')}><CheckCircle size={12} /> Onay</button>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => changeStatus(r.id!, 'rejected')}><XCircle size={12} /> Reddet</button>
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


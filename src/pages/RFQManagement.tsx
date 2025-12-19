import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { addRFQ, getRFQs, updateRequisition, getRequisitions, RFQ, Requisition, updateRFQ } from '../services/procurementService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { Plus, Save, X, Edit, CheckCircle, FileQuestion } from 'lucide-react';

export default function RFQManagement() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [reqs, setReqs] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    rfqNumber: '',
    dueDate: new Date().toISOString().split('T')[0],
    suppliers: '',
    baseReqId: '',
    items: [] as Requisition['items'],
    status: 'open' as RFQ['status']
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const company = getCurrentCompany();
      const [rfqData, reqData] = await Promise.all([
        getRFQs(company?.companyId),
        getRequisitions(company?.companyId)
      ]);
      setRfqs(rfqData);
      setReqs(reqData);
    } catch (error: any) {
      const userInfo = JSON.parse(localStorage.getItem('currentUser') || 'null');
      await addErrorLog(`RFQ yüklenirken hata: ${error.message || error}`, 'RFQManagement', userInfo?.id, userInfo?.username);
      alert('Veri yüklenirken hata');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      rfqNumber: '',
      dueDate: new Date().toISOString().split('T')[0],
      suppliers: '',
      baseReqId: '',
      items: [],
      status: 'open'
    });
    setEditingId(null);
  };

  const handleReqSelect = (id: string) => {
    const r = reqs.find(q => q.id === id);
    setForm({ ...form, baseReqId: id, items: r?.items || [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rfqNumber || !form.dueDate || form.items.length === 0) {
      alert('RFQ no, son tarih ve kalemler zorunlu');
      return;
    }
    const company = getCurrentCompany();
    const payload: Omit<RFQ, 'id' | 'createdAt' | 'updatedAt'> = {
      rfqNumber: form.rfqNumber,
      suppliers: form.suppliers ? form.suppliers.split(',').map(s => s.trim()).filter(Boolean) : [],
      dueDate: new Date(form.dueDate),
      items: form.items,
      status: form.status,
      companyId: company?.companyId
    };
    try {
      if (editingId) {
        await updateRFQ(editingId, payload);
        alert('RFQ güncellendi');
      } else {
        await addRFQ(payload);
        if (form.baseReqId) {
          await updateRequisition(form.baseReqId, { status: 'converted' });
        }
        alert('RFQ eklendi');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      alert('Kayıt hatası: ' + (error.message || ''));
    }
  };

  const handleEdit = (rfq: RFQ) => {
    setEditingId(rfq.id || null);
    setForm({
      rfqNumber: rfq.rfqNumber,
      dueDate: rfq.dueDate.toISOString().split('T')[0],
      suppliers: (rfq.suppliers || []).join(', '),
      baseReqId: '',
      items: rfq.items,
      status: rfq.status
    });
    setShowForm(true);
  };

  const closeRFQ = async (id: string) => {
    await updateRFQ(id, { status: 'closed' });
    loadData();
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileQuestion size={24} />
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>RFQ (Teklif Toplama)</h1>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} /> Yeni RFQ
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '20px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">RFQ No *</label>
                  <input className="excel-form-input" value={form.rfqNumber} onChange={(e) => setForm({ ...form, rfqNumber: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Son Tarih *</label>
                  <input type="date" className="excel-form-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Tedarikçiler (virgül ile)</label>
                  <input className="excel-form-input" value={form.suppliers} onChange={(e) => setForm({ ...form, suppliers: e.target.value })} placeholder="Tedarikçi1, Tedarikçi2" />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Talep Seç (opsiyonel)</label>
                  <select className="excel-form-select" value={form.baseReqId} onChange={(e) => handleReqSelect(e.target.value)}>
                    <option value="">Talep bağlama</option>
                    {reqs.map(r => (
                      <option key={r.id} value={r.id}>{r.reqNumber} - {r.status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '12px', border: '1px solid #e0e0e0', padding: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Kalemler</h4>
                {form.items.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#666' }}>Bağlı talepten kalem çekilecek veya talep seçilmemişse elle eklenmelidir.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px' }}>
                    {form.items.map((it, idx) => (
                      <li key={idx}>{it.materialName} - {it.quantity} {it.unit}</li>
                    ))}
                  </ul>
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
            <div style={{ padding: '30px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : rfqs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Henüz RFQ yok.</div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>RFQ No</th>
                  <th>Son Tarih</th>
                  <th>Tedarikçiler</th>
                  <th>Durum</th>
                  <th>Kalem Sayısı</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.rfqNumber}</td>
                    <td>{r.dueDate.toLocaleDateString('tr-TR')}</td>
                    <td>{(r.suppliers || []).join(', ') || '-'}</td>
                    <td>{r.status}</td>
                    <td>{r.items.length}</td>
                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleEdit(r)}><Edit size={12} /> Düzenle</button>
                      {r.status !== 'closed' && (
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => r.id && closeRFQ(r.id)}>
                          <CheckCircle size={12} /> Kapat
                        </button>
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


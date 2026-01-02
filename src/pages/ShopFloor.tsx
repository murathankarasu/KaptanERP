import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { addProductionOrder, getProductionOrders, updateProductionOrder, addWorkLog, ProductionOrder } from '../services/productionService';
import { getBOMs, BOM } from '../services/productionService';
import { getWorkLogs, WorkLog } from '../services/productionService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getPersonnel } from '../services/personnelService';
import { addErrorLog } from '../services/userService';
import { ClipboardList, Play, Square, CheckSquare, Plus, Save, X, List } from 'lucide-react';
export default function ShopFloor() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [operatorSelection, setOperatorSelection] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<Record<string, WorkLog[]>>({});
  const [summary, setSummary] = useState<Array<{ workstation: string; minutes: number; date: string }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    orderNumber: '',
    productName: '',
    quantity: '',
    unit: '',
    bomId: '',
    workstation: '',
    plannedDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const company = getCurrentCompany();
      const [o, b, p] = await Promise.all([
        getProductionOrders(company?.companyId),
        getBOMs(company?.companyId),
        getPersonnel({ companyId: company?.companyId })
      ]);
      setOrders(o);
      setBoms(b);
      setPersonnel(p);
      setSummary(buildSummary(o));
    } catch (error: any) {
      console.error('ShopFloor load error:', error);
      const userInfo = JSON.parse(localStorage.getItem('currentUser') || 'null');
      await addErrorLog(`ShopFloor yüklenirken hata: ${error.message || error}`, 'ShopFloor', userInfo?.id, userInfo?.username);
      alert('Veri yüklenirken hata: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const loadLogs = async (id: string) => {
    const data = await getWorkLogs(id);
    setLogs(prev => ({ ...prev, [id]: data }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.orderNumber || !form.productName || !form.quantity || !form.unit) {
      alert('Zorunlu alanları doldurun');
      return;
    }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) {
      alert('Geçerli miktar girin');
      return;
    }
    const plannedDateVal = form.plannedDate ? new Date(form.plannedDate) : undefined;
    const plannedDateValid = plannedDateVal && !isNaN(plannedDateVal.getTime());
    const company = getCurrentCompany();
    const payload: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'> = {
      orderNumber: form.orderNumber,
      productName: form.productName,
      quantity: qty,
      unit: form.unit,
      status: 'planned',
      companyId: company?.companyId
    };
    if (plannedDateValid) (payload as any).plannedDate = plannedDateVal!;
    if (form.bomId) (payload as any).bomId = form.bomId;
    if (form.workstation) (payload as any).workstation = form.workstation;
    try {
      await addProductionOrder(payload);
      alert('İş emri eklendi');
      setShowForm(false);
      resetForm();
      loadData();
    } catch (err: any) {
      alert('İş emri kaydedilirken hata: ' + (err.message || err));
    }
  };

  const resetForm = () => {
    setForm({
      orderNumber: '',
      productName: '',
      quantity: '',
      unit: '',
      bomId: '',
      workstation: '',
      plannedDate: new Date().toISOString().split('T')[0]
    });
  };

  const setStatus = async (id: string, status: ProductionOrder['status'], operatorId?: string) => {
    const operator = personnel.find(p => p.id === operatorId);
    const now = new Date();
    await updateProductionOrder(id, {
      status,
      startedAt: status === 'in_progress' ? now : undefined,
      finishedAt: status === 'completed' ? now : undefined
    });
    await addWorkLog({
      productionOrderId: id,
      action: status === 'in_progress' ? 'start' : status === 'completed' ? 'complete' : 'stop',
      operatorId,
      operatorName: operator?.name,
      timestamp: now,
      companyId: getCurrentCompany()?.companyId
    });
    loadData();
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <ClipboardList size={24} />
          <h1 style={{ fontSize: '26px', fontWeight: 700 }}>Shop Floor / İş Emirleri</h1>
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(true)}>
            <Plus size={14} /> Yeni İş Emri
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '16px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-4">
                <div className="excel-form-group">
                  <label className="excel-form-label">İş Emri No</label>
                  <input className="excel-form-input" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Ürün</label>
                  <input className="excel-form-input" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Miktar</label>
                  <input className="excel-form-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Birim</label>
                  <input className="excel-form-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">BOM</label>
                  <select className="excel-form-select" value={form.bomId} onChange={(e) => setForm({ ...form, bomId: e.target.value })}>
                    <option value="">Seçiniz</option>
                    {boms.map(b => (
                      <option key={b.id} value={b.id}>{b.productName} {b.version && `(${b.version})`}</option>
                    ))}
                  </select>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">İş İstasyonu</label>
                  <input className="excel-form-input" value={form.workstation} onChange={(e) => setForm({ ...form, workstation: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Planlanan Tarih</label>
                  <input type="date" className="excel-form-input" value={form.plannedDate} onChange={(e) => setForm({ ...form, plannedDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button className="btn btn-primary" type="submit"><Save size={14} /> Kaydet</button>
                <button className="btn btn-secondary" type="button" onClick={() => { setShowForm(false); resetForm(); }}><X size={14} /> İptal</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          <table className="excel-table">
            <thead>
              <tr>
                <th>İş Emri</th>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Durum</th>
                <th>İstasyon</th>
                <th>Plan Tarih</th>
                <th>Operatör</th>
                <th>Süre</th>
                <th>Log</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.orderNumber}</td>
                  <td>{o.productName}</td>
                  <td>{o.quantity} {o.unit}</td>
                  <td>{statusLabel(o.status)}</td>
                  <td>{o.workstation || '-'}</td>
                  <td>{o.plannedDate ? o.plannedDate.toLocaleDateString('tr-TR') : '-'}</td>
                  <td>
                    <select
                      className="excel-form-select"
                      value={operatorSelection[o.id || ''] || ''}
                      onChange={(e) => setOperatorSelection({ ...operatorSelection, [o.id || '']: e.target.value })}
                    >
                      <option value="">Seç</option>
                      {personnel.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>{durationText(o)}</td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => o.id && loadLogs(o.id)}>
                      <List size={12} /> Log
                    </button>
                  </td>
                  <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => o.id && setStatus(o.id, 'in_progress', operatorSelection[o.id || ''])}>
                      <Play size={12} /> Başlat
                    </button>
                    <button className="btn btn-secondary" onClick={() => o.id && setStatus(o.id, 'completed', operatorSelection[o.id || ''])}>
                      <CheckSquare size={12} /> Tamamla
                    </button>
                    <button className="btn btn-secondary" onClick={() => o.id && setStatus(o.id, 'cancelled', operatorSelection[o.id || ''])}>
                      <Square size={12} /> İptal
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {Object.keys(logs).length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>İş Emri Logları</h3>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
              <button className="btn btn-secondary" onClick={() => exportLogsCsv(logs)}>
                <Download size={14} /> CSV
              </button>
              <button className="btn btn-secondary" style={{ marginLeft: '8px' }} onClick={() => exportLogsPdf(logs)}>
                <FileText size={14} /> PDF
              </button>
            </div>
            {Object.entries(logs).map(([orderId, lgs]) => (
              <div key={orderId} style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>İş Emri: {orderId}</div>
                <table className="excel-table">
                  <thead>
                    <tr>
                      <th>Aksiyon</th>
                      <th>Operatör</th>
                      <th>Zaman</th>
                      <th>Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lgs.map((lg) => (
                      <tr key={lg.id}>
                        <td>{logAction(lg.action)}</td>
                        <td>{lg.operatorName || lg.operatorId || '-'}</td>
                        <td>{lg.timestamp.toLocaleString('tr-TR')}</td>
                        <td>{lg.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
        {summary.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>İstasyon / Gün Süre Özeti</h3>
            <table className="excel-table">
              <thead>
                <tr>
                  <th>İstasyon</th>
                  <th>Tarih</th>
                  <th>Toplam Süre (dk)</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.workstation || '-'}</td>
                    <td>{s.date}</td>
                    <td>{s.minutes.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

const statusLabel = (s: ProductionOrder['status']) => {
  switch (s) {
    case 'planned': return 'Planlandı';
    case 'in_progress': return 'Devam';
    case 'completed': return 'Tamamlandı';
    case 'cancelled': return 'İptal';
    default: return s;
  }
};

const durationText = (o: ProductionOrder) => {
  if (o.status === 'completed' && o.startedAt && o.finishedAt) {
    const minutes = Math.max(0, (o.finishedAt.getTime() - o.startedAt.getTime()) / 60000);
    return `${minutes.toFixed(0)} dk`;
  }
  if (o.status === 'in_progress' && o.startedAt) {
    const minutes = Math.max(0, (Date.now() - o.startedAt.getTime()) / 60000);
    return `Devam (${minutes.toFixed(0)} dk)`;
  }
  return '-';
};

const logAction = (a: string) => {
  if (a === 'start') return 'Başlat';
  if (a === 'complete') return 'Tamamla';
  if (a === 'stop') return 'Durdur';
  return a;
};

const buildSummary = (orders: ProductionOrder[]) => {
  const agg: Record<string, number> = {};
  orders.forEach(o => {
    if (o.startedAt && o.finishedAt) {
      const minutes = Math.max(0, (o.finishedAt.getTime() - o.startedAt.getTime()) / 60000);
      const key = `${o.workstation || 'Genel'}|${o.startedAt.toISOString().slice(0,10)}`;
      agg[key] = (agg[key] || 0) + minutes;
    }
  });
  return Object.entries(agg).map(([k, minutes]) => {
    const [workstation, date] = k.split('|');
    return { workstation, date, minutes };
  });
};

const exportLogsCsv = (logs: Record<string, WorkLog[]>) => {
  const header = ['IsEmri', 'Aksiyon', 'Operatör', 'Zaman', 'Not'];
  const lines: string[] = [];
  Object.entries(logs).forEach(([orderId, lgs]) => {
    lgs.forEach(l => {
      lines.push([
        orderId,
        l.action,
        l.operatorName || l.operatorId || '',
        l.timestamp.toISOString(),
        l.note || ''
      ].join(','));
    });
  });
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shopfloor_logs_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportLogsPdf = (logs: Record<string, WorkLog[]>) => {
  const doc = new jsPDF();
  let y = 14;
  doc.setFontSize(14);
  doc.text('Shop Floor Log Raporu', 14, y);
  y += 10;
  doc.setFontSize(10);
  Object.entries(logs).forEach(([orderId, lgs]) => {
    doc.text(`Is Emri: ${orderId}`, 14, y);
    y += 6;
    lgs.forEach((l) => {
      const line = `${logAction(l.action)} | ${l.operatorName || l.operatorId || '-'} | ${l.timestamp.toLocaleString('tr-TR')} | ${l.note || ''}`;
      doc.text(line, 16, y);
      y += 5;
      if (y > 280) {
        doc.addPage();
        y = 14;
      }
    });
    y += 4;
    if (y > 280) {
      doc.addPage();
      y = 14;
    }
  });
  doc.save(`shopfloor_logs_${new Date().toISOString().slice(0,10)}.pdf`);
};


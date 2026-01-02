import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { addLeaveRequest, getLeaveRequests, updateLeaveRequest, deleteLeaveRequest, LeaveRequest } from '../services/hrmService';
import { getPersonnel } from '../services/personnelService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { CalendarRange, Plus, Save, X, Edit, Trash2, CheckSquare, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { formatDate } from '../utils/formatDate';

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    personnelId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'annual' as LeaveRequest['type'],
    note: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const company = getCurrentCompany();
    const [p, l] = await Promise.all([
      getPersonnel({ companyId: company?.companyId }),
      getLeaveRequests(company?.companyId)
    ]);
    setPersonnel(p);
    setLeaves(l);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personnelId) {
      alert('Personel seçin');
      return;
    }
    const days = calcDays(form.startDate, form.endDate);
    const company = getCurrentCompany();
    const selected = personnel.find(p => p.id === form.personnelId);
    const payload: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'> = {
      personnelId: form.personnelId,
      personnelName: selected?.name,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      type: form.type,
      days,
      status: 'pending',
      note: form.note,
      companyId: company?.companyId
    };
    if (editingId) {
      await updateLeaveRequest(editingId, payload);
      alert('İzin güncellendi');
    } else {
      await addLeaveRequest(payload);
      alert('İzin eklendi');
    }
    setShowForm(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      personnelId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      type: 'annual',
      note: ''
    });
  };

  const handleEdit = (l: LeaveRequest) => {
    setEditingId(l.id || null);
    setForm({
      personnelId: l.personnelId,
      startDate: l.startDate.toISOString().split('T')[0],
      endDate: l.endDate.toISOString().split('T')[0],
      type: l.type,
      note: l.note || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deleteLeaveRequest(id);
    loadData();
  };

  const approve = async (id: string, status: LeaveRequest['status']) => {
    await updateLeaveRequest(id, { status });
    loadData();
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <CalendarRange size={24} />
          <h1 style={{ fontSize: '26px', fontWeight: 700 }}>İzin Yönetimi</h1>
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowForm(true)}>
            <Plus size={14} /> Yeni İzin
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '16px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">Personel</label>
                  <select className="excel-form-select" value={form.personnelId} onChange={(e) => setForm({ ...form, personnelId: e.target.value })}>
                    <option value="">Seçiniz</option>
                    {personnel.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Başlangıç</label>
                  <input type="date" className="excel-form-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Bitiş</label>
                  <input type="date" className="excel-form-input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Tür</label>
                  <select className="excel-form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeaveRequest['type'] })}>
                    <option value="annual">Yıllık</option>
                    <option value="sick">Hastalık</option>
                    <option value="unpaid">Ücretsiz</option>
                  </select>
                </div>
              </div>
              <div className="excel-form-group" style={{ marginTop: '10px' }}>
                <label className="excel-form-label">Not</label>
                <textarea className="excel-form-input" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-primary" type="submit"><Save size={14} /> Kaydet</button>
                <button className="btn btn-secondary" type="button" onClick={() => { setShowForm(false); resetForm(); }}><X size={14} /> İptal</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button className="btn btn-secondary" onClick={() => exportCsv(leaves)}>
              <Download size={14} /> CSV
            </button>
            <button className="btn btn-secondary" style={{ marginLeft: '8px' }} onClick={() => exportPdf(leaves)}>
              <FileText size={14} /> PDF
            </button>
          </div>
          <table className="excel-table">
            <thead>
              <tr>
                <th>Personel</th>
                <th>Tarih</th>
                <th>Süre</th>
                <th>Tür</th>
                <th>Durum</th>
                <th>Not</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id}>
                  <td>{l.personnelName || l.personnelId}</td>
                  <td>{formatDate(l.startDate)} - {formatDate(l.endDate)}</td>
                  <td>{l.days} gün</td>
                  <td>{typeLabel(l.type)}</td>
                  <td>{statusLabel(l.status)}</td>
                  <td>{l.note || '-'}</td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary" onClick={() => handleEdit(l)}><Edit size={12} /> Düzenle</button>
                    <button className="btn btn-secondary" style={{ color: '#dc3545' }} onClick={() => handleDelete(l.id)}><Trash2 size={12} /> Sil</button>
                    {l.status === 'pending' && (
                      <>
                        <button className="btn btn-secondary" onClick={() => l.id && approve(l.id, 'approved')}><CheckSquare size={12} /> Onay</button>
                        <button className="btn btn-secondary" onClick={() => l.id && approve(l.id, 'rejected')}><X size={12} /> Reddet</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

const calcDays = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24) + 1;
  return Math.max(0, Math.round(diff));
};

const typeLabel = (t: LeaveRequest['type']) => {
  if (t === 'annual') return 'Yıllık';
  if (t === 'sick') return 'Hastalık';
  return 'Ücretsiz';
};

const statusLabel = (s: LeaveRequest['status']) => {
  if (s === 'pending') return 'Beklemede';
  if (s === 'approved') return 'Onaylı';
  return 'Reddedildi';
};

const exportCsv = (rows: LeaveRequest[]) => {
  const header = ['Personel', 'Başlangıç', 'Bitiş', 'Süre', 'Tür', 'Durum', 'Not'];
  const lines = rows.map(r => [
    r.personnelName || r.personnelId,
    r.startDate.toISOString().slice(0,10),
    r.endDate.toISOString().slice(0,10),
    r.days,
    r.type,
    r.status,
    r.note || ''
  ].join(','));
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `izinler_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportPdf = (rows: LeaveRequest[]) => {
  const doc = new jsPDF();
  let y = 14;
  doc.setFontSize(14);
  doc.text('İzin Listesi', 14, y);
  y += 8;
  doc.setFontSize(10);
  rows.forEach((r) => {
    const line = `${r.personnelName || r.personnelId} | ${formatDate(r.startDate)} - ${formatDate(r.endDate)} | ${r.days} gün | ${typeLabel(r.type)} | ${statusLabel(r.status)}`;
    doc.text(line, 14, y);
    if (r.note) {
      y += 5;
      doc.text(`Not: ${r.note}`, 18, y);
    }
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 14;
    }
  });
  doc.save(`izinler_${new Date().toISOString().slice(0,10)}.pdf`);
};


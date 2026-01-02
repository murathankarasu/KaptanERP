import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getInvoices, updateInvoice, Invoice } from '../services/invoiceService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { Download, Edit, Save } from 'lucide-react';

export default function SalesInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<'draft' | 'issued' | 'paid'>('issued');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const company = getCurrentCompany();
    const data = await getInvoices(company?.companyId);
    setInvoices(data);
    setLoading(false);
  };

  const handleStatus = async (id: string, status: Invoice['status']) => {
    await updateInvoice(id, { status });
    loadData();
  };

  const exportCsv = () => {
    const header = ['Fatura No','Tarih','Müşteri','Tutar','PB','Durum','Sevkiyat','Sipariş'];
    const lines = invoices.map(i => [
      i.invoiceNumber,
      i.date.toISOString().slice(0,10),
      i.customerName || '',
      i.totalAmount,
      i.currency,
      i.status,
      i.shipmentNumber || '',
      i.orderNumber || ''
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_invoices_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Satış Faturaları</h1>
          <button className="btn btn-secondary" onClick={exportCsv}><Download size={14} /> CSV</button>
        </div>
        {loading ? (
          <div style={{ padding: '20px' }}>Yükleniyor...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '20px', color: '#666' }}>Fatura bulunamadı.</div>
        ) : (
          <table className="excel-table">
            <thead>
              <tr>
                <th>Fatura No</th>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Sevkiyat</th>
                <th>Sipariş</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoiceNumber}</td>
                  <td>{inv.date.toLocaleDateString('tr-TR')}</td>
                  <td>{inv.customerName || '-'}</td>
                  <td>{inv.totalAmount.toFixed(2)} {inv.currency}</td>
                  <td>{inv.status}</td>
                  <td>{inv.shipmentNumber || '-'}</td>
                  <td>{inv.orderNumber || '-'}</td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    {editingId === inv.id ? (
                      <>
                        <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as any)} className="excel-form-select">
                          <option value="draft">Taslak</option>
                          <option value="issued">Kesildi</option>
                          <option value="paid">Ödendi</option>
                        </select>
                        <button className="btn btn-primary" onClick={() => inv.id && handleStatus(inv.id, statusDraft)}><Save size={12} /> Kaydet</button>
                      </>
                    ) : (
                      <button className="btn btn-secondary" onClick={() => { setEditingId(inv.id || null); setStatusDraft(inv.status); }}>
                        <Edit size={12} /> Durum
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}


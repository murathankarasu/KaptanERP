import { useState } from 'react';
import Layout from '../components/Layout';
import { calculatePayroll } from '../services/hrmService';
import { Calculator, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

export default function PayrollCalculator() {
  const [form, setForm] = useState({
    gross: '',
    sgkPercent: '14',
    unemploymentPercent: '1',
    besPercent: '3',
    taxPercent: '20',
    garnishment: '0'
  });
  const [result, setResult] = useState<any | null>(null);

  const handleCalc = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(form.gross);
    if (isNaN(gross) || gross <= 0) {
      alert('Geçerli brüt maaş girin');
      return;
    }
    const res = calculatePayroll({
      personnelId: '',
      gross,
      sgkPercent: parseFloat(form.sgkPercent),
      unemploymentPercent: parseFloat(form.unemploymentPercent),
      besPercent: parseFloat(form.besPercent),
      taxPercent: parseFloat(form.taxPercent),
      garnishment: parseFloat(form.garnishment)
    });
    setResult(res);
  };

  return (
    <Layout>
      <div style={{ padding: '30px', maxWidth: '700px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Calculator size={24} />
          <h1 style={{ fontSize: '26px', fontWeight: 700 }}>Bordro Hesaplama</h1>
        </div>

        <form onSubmit={handleCalc} className="excel-form" style={{ marginBottom: '16px' }}>
          <div className="grid-3">
            <div className="excel-form-group">
              <label className="excel-form-label">Brüt</label>
              <input className="excel-form-input" value={form.gross} onChange={(e) => setForm({ ...form, gross: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">SGK %</label>
              <input className="excel-form-input" value={form.sgkPercent} onChange={(e) => setForm({ ...form, sgkPercent: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">İşsizlik %</label>
              <input className="excel-form-input" value={form.unemploymentPercent} onChange={(e) => setForm({ ...form, unemploymentPercent: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">BES %</label>
              <input className="excel-form-input" value={form.besPercent} onChange={(e) => setForm({ ...form, besPercent: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Gelir Vergisi %</label>
              <input className="excel-form-input" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">İcra / Kesinti</label>
              <input className="excel-form-input" value={form.garnishment} onChange={(e) => setForm({ ...form, garnishment: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" style={{ marginTop: '10px' }}>Hesapla</button>
        </form>

        {result && (
          <div className="excel-table" style={{ padding: '14px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button className="btn btn-secondary" onClick={() => downloadCsv(result)}>
                <Download size={14} /> CSV
              </button>
              <button className="btn btn-secondary" style={{ marginLeft: '8px' }} onClick={() => downloadPdf(result)}>
                <FileText size={14} /> PDF
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '8px' }}>
              <strong>Brüt</strong><span>{result.gross.toFixed(2)}</span>
              <strong>SGK</strong><span>{result.sgk.toFixed(2)}</span>
              <strong>İşsizlik</strong><span>{result.unemployment.toFixed(2)}</span>
              <strong>BES</strong><span>{result.bes.toFixed(2)}</span>
              <strong>Gelir Vergisi</strong><span>{result.tax.toFixed(2)}</span>
              <strong>İcra/Kesinti</strong><span>{result.garnishment.toFixed(2)}</span>
              <strong>Net</strong><span>{result.net.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const downloadCsv = (r: any) => {
  const rows = [
    ['Brüt', r.gross],
    ['SGK', r.sgk],
    ['İşsizlik', r.unemployment],
    ['BES', r.bes],
    ['Gelir Vergisi', r.tax],
    ['İcra/Kesinti', r.garnishment],
    ['Net', r.net]
  ];
  const csv = rows.map(line => line.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bordro_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadPdf = (r: any) => {
  const doc = new jsPDF();
  let y = 14;
  doc.setFontSize(14);
  doc.text('Bordro Hesap Özeti', 14, y);
  y += 8;
  doc.setFontSize(11);
  const lines = [
    ['Brüt', r.gross],
    ['SGK', r.sgk],
    ['İşsizlik', r.unemployment],
    ['BES', r.bes],
    ['Gelir Vergisi', r.tax],
    ['İcra/Kesinti', r.garnishment],
    ['Net', r.net]
  ];
  lines.forEach(([k, v]) => {
    doc.text(`${k}: ${Number(v).toFixed(2)}`, 14, y);
    y += 6;
  });
  doc.save(`bordro_${new Date().toISOString().slice(0,10)}.pdf`);
};


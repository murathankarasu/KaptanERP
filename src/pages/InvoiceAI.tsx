import { useState } from 'react';
import Layout from '../components/Layout';
import { parseInvoiceWithAI, saveParsedInvoice } from '../services/aiInvoiceService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { Download, Save, AlertTriangle } from 'lucide-react';

export default function InvoiceAI() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!file) {
      alert('Dosya seçin');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await parseInvoiceWithAI(file);
      setParsed(res);
    } catch (e: any) {
      setError(e.message || 'İşleme hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    const company = getCurrentCompany();
    await saveParsedInvoice(parsed, company?.companyId, undefined);
    alert('Taslak fatura kaydedildi (draft).');
  };

  return (
    <Layout>
      <div style={{ padding: '30px', maxWidth: '900px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '12px' }}>AI Fatura İşleme</h1>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
          PDF/JPEG yükleyin; AI ile alanlar çıkarılır ve taslak fatura oluşturabilirsiniz.
        </p>
        <div style={{ marginBottom: '12px' }}>
          <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn btn-primary" style={{ marginLeft: '10px' }} onClick={handleParse} disabled={loading}>
            {loading ? 'İşleniyor...' : 'Oku'}
          </button>
        </div>
        {error && (
          <div style={{ color: '#dc3545', marginBottom: '10px' }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}
        {parsed && (
          <div style={{ marginTop: '16px', border: '1px solid #ddd', padding: '12px', background: '#fff' }}>
            <h3 style={{ marginBottom: '8px' }}>Çıkan Veriler</h3>
            <pre style={{ background: '#f7f7f7', padding: '10px', fontSize: '12px', maxHeight: '320px', overflow: 'auto' }}>
{JSON.stringify(parsed, null, 2)}
            </pre>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-primary" onClick={handleSave}><Save size={14} /> Taslak Kaydet</button>
              <button className="btn btn-secondary" onClick={() => {
                const data = JSON.stringify(parsed, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'parsed_invoice.json';
                a.click();
                URL.revokeObjectURL(url);
              }}><Download size={14} /> JSON</button>
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#d9534f' }}>
              IBAN/VKN doğrulama: sistem tedarikçi kartıyla eşleşme yapılacaksa eklenebilir. Şu an yalnızca çıkarım yapılıyor.
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}


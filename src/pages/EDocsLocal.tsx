import { useState } from 'react';
import Layout from '../components/Layout';
import { buildInvoiceUBL, buildDespatchUBL } from '../utils/ublLocal';
import { generateInvoicePDF, generateDespatchPDF } from '../utils/pdfEdocs';
import { Save, FileText, Package } from 'lucide-react';

export default function EDocsLocal() {
  const [invForm, setInvForm] = useState({
    invoiceNumber: `FAT-${Date.now()}`,
    issueDate: new Date().toISOString().split('T')[0],
    scenario: 'E_FATURA' as 'E_FATURA' | 'E_ARSIV',
    customerName: 'Test Müşteri',
    customerVknTckn: '1234567890',
    sellerName: 'Test Şirket',
    sellerTaxNumber: '1111111111',
    sellerAddress: 'İstanbul',
    sellerPhone: '0212 000 00 00',
    currency: 'TRY',
    lines: [
      { name: 'Ürün A', qty: 1, unitPrice: 500, vatRate: 18, discountPercent: 0 },
      { name: 'Ürün B', qty: 2, unitPrice: 150, vatRate: 8, discountPercent: 10 }
    ]
  });

  const [desForm, setDesForm] = useState({
    despatchNumber: `IRS-${Date.now()}`,
    issueDate: new Date().toISOString().split('T')[0],
    customerName: 'Test Müşteri',
    customerVknTckn: '1234567890',
    items: [
      { name: 'Ürün A', qty: 1, unit: 'Adet' },
      { name: 'Ürün B', qty: 3, unit: 'Adet' }
    ]
  });

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInvoiceUbl = () => {
    const ubl = buildInvoiceUBL({
      invoiceNumber: invForm.invoiceNumber,
      issueDate: invForm.issueDate,
      scenario: invForm.scenario,
      currency: invForm.currency,
      customerName: invForm.customerName,
      customerVknTckn: invForm.customerVknTckn,
      lines: invForm.lines.map(l => ({
        name: l.name,
        quantity: l.qty,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
        discountPercent: l.discountPercent
      }))
    });
    downloadText(ubl, `${invForm.invoiceNumber}.xml`);
  };

  const handleInvoicePdf = () => {
    generateInvoicePDF({
      invoiceNumber: invForm.invoiceNumber,
      issueDate: invForm.issueDate,
      customerName: invForm.customerName,
      customerVknTckn: invForm.customerVknTckn,
      sellerName: invForm.sellerName,
      sellerTaxNumber: invForm.sellerTaxNumber,
      sellerAddress: invForm.sellerAddress,
      sellerPhone: invForm.sellerPhone,
      currency: invForm.currency,
      lines: invForm.lines
    });
  };

  const handleDespatchUbl = () => {
    const ubl = buildDespatchUBL({
      despatchNumber: desForm.despatchNumber,
      issueDate: desForm.issueDate,
      customerName: desForm.customerName,
      customerVknTckn: desForm.customerVknTckn,
      currency: 'TRY',
      lines: desForm.items.map(i => ({
        name: i.name,
        quantity: i.qty,
        unit: i.unit
      }))
    });
    downloadText(ubl, `${desForm.despatchNumber}.xml`);
  };

  const handleDespatchPdf = () => {
    generateDespatchPDF({
      despatchNumber: desForm.despatchNumber,
      issueDate: desForm.issueDate,
      customerName: desForm.customerName,
      customerVknTckn: desForm.customerVknTckn,
      items: desForm.items
    });
  };

  return (
    <Layout>
      <div style={{ padding: '30px', display: 'grid', gap: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700 }}>e-Belge Çıktıları (PDF / UBL - GİB Yükleme Yok)</h1>

        {/* e-Fatura / e-Arşiv */}
        <div style={{ border: '2px solid #000', padding: '20px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <FileText size={20} />
            <h2 style={{ margin: 0, fontSize: '18px' }}>e-Fatura / e-Arşiv</h2>
          </div>
          <div className="grid-3" style={{ gap: '10px' }}>
            <div className="excel-form-group">
              <label className="excel-form-label">Fatura No</label>
              <input className="excel-form-input" value={invForm.invoiceNumber} onChange={(e) => setInvForm({ ...invForm, invoiceNumber: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Tarih</label>
              <input type="date" className="excel-form-input" value={invForm.issueDate} onChange={(e) => setInvForm({ ...invForm, issueDate: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Senaryo</label>
              <select className="excel-form-select" value={invForm.scenario} onChange={(e) => setInvForm({ ...invForm, scenario: e.target.value as 'E_FATURA' | 'E_ARSIV' })}>
                <option value="E_FATURA">e-Fatura</option>
                <option value="E_ARSIV">e-Arşiv</option>
              </select>
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Müşteri</label>
              <input className="excel-form-input" value={invForm.customerName} onChange={(e) => setInvForm({ ...invForm, customerName: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">VKN/TCKN</label>
              <input className="excel-form-input" value={invForm.customerVknTckn} onChange={(e) => setInvForm({ ...invForm, customerVknTckn: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Para Birimi</label>
              <input className="excel-form-input" value={invForm.currency} onChange={(e) => setInvForm({ ...invForm, currency: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Satıcı Şirket</label>
              <input className="excel-form-input" value={invForm.sellerName} onChange={(e) => setInvForm({ ...invForm, sellerName: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Satıcı Vergi No</label>
              <input className="excel-form-input" value={invForm.sellerTaxNumber} onChange={(e) => setInvForm({ ...invForm, sellerTaxNumber: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Satıcı Adres</label>
              <input className="excel-form-input" value={invForm.sellerAddress} onChange={(e) => setInvForm({ ...invForm, sellerAddress: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Satıcı Telefon</label>
              <input className="excel-form-input" value={invForm.sellerPhone} onChange={(e) => setInvForm({ ...invForm, sellerPhone: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={handleInvoicePdf}><Save size={14} /> PDF Üret</button>
            <button className="btn btn-secondary" onClick={handleInvoiceUbl}><Save size={14} /> UBL XML</button>
          </div>
        </div>

        {/* e-İrsaliye */}
        <div style={{ border: '2px solid #000', padding: '20px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Package size={20} />
            <h2 style={{ margin: 0, fontSize: '18px' }}>e-İrsaliye</h2>
          </div>
          <div className="grid-3" style={{ gap: '10px' }}>
            <div className="excel-form-group">
              <label className="excel-form-label">İrsaliye No</label>
              <input className="excel-form-input" value={desForm.despatchNumber} onChange={(e) => setDesForm({ ...desForm, despatchNumber: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Tarih</label>
              <input type="date" className="excel-form-input" value={desForm.issueDate} onChange={(e) => setDesForm({ ...desForm, issueDate: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">Alıcı</label>
              <input className="excel-form-input" value={desForm.customerName} onChange={(e) => setDesForm({ ...desForm, customerName: e.target.value })} />
            </div>
            <div className="excel-form-group">
              <label className="excel-form-label">VKN/TCKN</label>
              <input className="excel-form-input" value={desForm.customerVknTckn} onChange={(e) => setDesForm({ ...desForm, customerVknTckn: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={handleDespatchPdf}><Save size={14} /> PDF Üret</button>
            <button className="btn btn-secondary" onClick={handleDespatchUbl}><Save size={14} /> UBL XML</button>
          </div>
        </div>

        {/* e-Defter notu */}
        <div style={{ border: '2px solid #000', padding: '20px', background: '#fff' }}>
          <h2 style={{ margin: 0, fontSize: '18px', marginBottom: '8px' }}>e-Defter (PDF/UBL Yerel Çıktı)</h2>
          <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
            Bu ekranda sadece PDF/UBL çıktısı alabilirsiniz. GİB’e gönderim, mali mühür veya entegratör kullanımı yoktur.
          </p>
        </div>
      </div>
    </Layout>
  );
}

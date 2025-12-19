import jsPDF from 'jspdf';

export interface InvoicePdfInput {
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  customerVknTckn: string;
  lines: {
    name: string;
    qty: number;
    unitPrice: number; // Belge para birimi
    vatRate: number;
    discountPercent?: number;
    lineCurrency?: string; // Kalem orijinal PB
    exchangeRate?: number; // lineCurrency -> belge PB
  }[];
  currency: string; // Belge para birimi
}

export const generateInvoicePDF = (input: InvoicePdfInput) => {
  const doc = new jsPDF();
  let y = 15;
  doc.setFontSize(14);
  doc.text('FATURA ÖZETİ (PDF)', 105, y, { align: 'center' });
  y += 10;
  doc.setFontSize(11);
  doc.text(`Fatura No: ${input.invoiceNumber}`, 14, y); y += 6;
  doc.text(`Tarih: ${input.issueDate}`, 14, y); y += 6;
  doc.text(`Müşteri: ${input.customerName} (${input.customerVknTckn})`, 14, y); y += 8;
  doc.text(`Belge PB: ${input.currency}`, 14, y); y += 8;
  doc.text('Kalemler:', 14, y); y += 6;
  input.lines.forEach((l, idx) => {
    const discText = l.discountPercent ? `, İsk:%${l.discountPercent}` : '';
    doc.text(`${idx + 1}) ${l.name} - ${l.qty} x ${l.unitPrice.toFixed(2)} ${input.currency} (KDV %${l.vatRate}${discText})`, 16, y);
    y += 6;
    if (l.lineCurrency && l.lineCurrency !== input.currency) {
      const fx = l.exchangeRate || 1;
      const origUnit = l.unitPrice / fx;
      doc.setFontSize(10);
      doc.text(`   Orijinal: ${origUnit.toFixed(2)} ${l.lineCurrency} | Kur: 1 ${l.lineCurrency} = ${fx.toFixed(4)} ${input.currency}`, 16, y);
      doc.setFontSize(11);
      y += 5;
    }
  });
  const total = input.lines.reduce((s, l) => s + l.qty * l.unitPrice * (l.discountPercent ? (1 - l.discountPercent / 100) : 1), 0);
  const vat = input.lines.reduce((s, l) => {
    const net = l.qty * l.unitPrice * (l.discountPercent ? (1 - l.discountPercent / 100) : 1);
    return s + net * (l.vatRate / 100);
  }, 0);
  doc.text(`Ara Toplam: ${total.toFixed(2)} ${input.currency}`, 14, y); y += 6;
  doc.text(`KDV: ${vat.toFixed(2)} ${input.currency}`, 14, y); y += 6;
  doc.text(`Genel Toplam: ${(total + vat).toFixed(2)} ${input.currency}`, 14, y); y += 6;
  doc.save(`fatura_${input.invoiceNumber}.pdf`);
};

export interface DespatchPdfInput {
  despatchNumber: string;
  issueDate: string;
  customerName: string;
  customerVknTckn: string;
  items: { name: string; qty: number; unit: string }[];
}

export const generateDespatchPDF = (input: DespatchPdfInput) => {
  const doc = new jsPDF();
  let y = 15;
  doc.setFontSize(14);
  doc.text('E-İRSALİYE ÖZETİ (PDF)', 105, y, { align: 'center' });
  y += 10;
  doc.setFontSize(11);
  doc.text(`İrsaliye No: ${input.despatchNumber}`, 14, y); y += 6;
  doc.text(`Tarih: ${input.issueDate}`, 14, y); y += 6;
  doc.text(`Alıcı: ${input.customerName} (${input.customerVknTckn})`, 14, y); y += 8;
  doc.text('Kalemler:', 14, y); y += 6;
  input.items.forEach((l, idx) => {
    doc.text(`${idx + 1}) ${l.name} - ${l.qty} ${l.unit}`, 16, y);
    y += 6;
  });
  doc.save(`irsaliye_${input.despatchNumber}.pdf`);
};


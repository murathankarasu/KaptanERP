import jsPDF from 'jspdf';
import { notoSansBold, notoSansRegular } from './pdfFonts';

const registerPdfFonts = (doc: jsPDF) => {
  doc.addFileToVFS('NotoSans-Regular.ttf', notoSansRegular);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', notoSansBold);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  doc.setFont('NotoSans', 'normal');
};

export interface InvoicePdfInput {
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  customerVknTckn: string;
  sellerName?: string;
  sellerTaxNumber?: string;
  sellerAddress?: string;
  sellerPhone?: string;
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    floatPrecision: 16
  });
  registerPdfFonts(doc);
  
  // UTF-8 desteği için encoding ayarı
  doc.setProperties({
    title: 'Fatura',
    subject: 'Fatura Belgesi',
    author: 'Kaptan ERP',
    creator: 'Kaptan ERP'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Başlık kutusu
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');
  doc.setFontSize(24);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('FATURA', pageWidth / 2, yPos + 16, { align: 'center' });
  yPos += 35;

  // Fatura bilgileri (sağ üst)
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(100, 100, 100);
  const infoX = pageWidth - margin - 50;
  doc.text('Fatura No:', infoX, yPos);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(input.invoiceNumber, infoX + 25, yPos);
  yPos += 6;
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Tarih:', infoX, yPos);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  const dateObj = new Date(input.issueDate);
  doc.text(
    (dateObj as any)?.toDate?.()
      ? (dateObj as any).toDate().toLocaleDateString('tr-TR')
      : new Date(dateObj as any).toLocaleDateString('tr-TR'),
    infoX + 25,
    yPos
  );
  yPos += 6;
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Para Birimi:', infoX, yPos);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(input.currency, infoX + 25, yPos);
  yPos += 15;

  const formatShortText = (value: string | undefined, fallback: string, maxLen: number) => {
    const safeValue = (value || '').trim();
    const base = safeValue.length > 0 ? safeValue : fallback;
    return base.length > maxLen ? base.substring(0, maxLen - 3) + '...' : base;
  };

  // Şirket bilgileri kutusu (sol)
  const companyBoxY = yPos;
  const boxWidth = (pageWidth - 3 * margin) / 2;
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, companyBoxY, boxWidth, 40, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(margin, companyBoxY, boxWidth, 40, 'D');
  
  doc.setFontSize(11);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  // SATICI başlığını ortala
  const saticiText = 'SATICI';
  doc.text(saticiText, margin + boxWidth / 2, companyBoxY + 8, { align: 'center' });
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(10);
  // Türkçe karakterler için NotoSans kullanıyoruz.
  doc.text(formatShortText(input.sellerName, 'Sirket Adi', 28), margin + 8, companyBoxY + 15);
  doc.text(formatShortText(input.sellerTaxNumber, 'Vergi No', 28), margin + 8, companyBoxY + 22);
  doc.text(formatShortText(input.sellerAddress, 'Adres', 28), margin + 8, companyBoxY + 29);
  doc.text(formatShortText(input.sellerPhone, 'Telefon', 28), margin + 8, companyBoxY + 36);

  // Müşteri bilgileri kutusu (sağ)
  const customerBoxX = margin + boxWidth + margin;
  doc.setFillColor(250, 250, 250);
  doc.rect(customerBoxX, companyBoxY, boxWidth, 40, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(customerBoxX, companyBoxY, boxWidth, 40, 'D');
  
  doc.setFontSize(11);
  doc.setFont('NotoSans', 'bold');
  // ALICI başlığını ortala
  const aliciText = 'ALICI';
  doc.text(aliciText, customerBoxX + boxWidth / 2, companyBoxY + 8, { align: 'center' });
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(10);
  // Müşteri adını kısalt (uzunsa)
  const customerName = (input.customerName || '').length > 25 
    ? (input.customerName || '').substring(0, 22) + '...' 
    : (input.customerName || '');
  doc.text(customerName, customerBoxX + 8, companyBoxY + 15);
  doc.text(input.customerVknTckn || '', customerBoxX + 8, companyBoxY + 22);
  yPos = companyBoxY + 50;

  // Kalemler tablosu başlığı
  yPos += 5;
  doc.setFillColor(60, 60, 60);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
  doc.setFontSize(9);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(255, 255, 255);
  
  // Tablo kolon genişlikleri - sayfaya sığacak şekilde optimize edildi
  const availableWidth = pageWidth - 2 * margin - 10; // 10 = padding
  const colPadding = 2; // Kolonlar arası padding
  const colWidths = {
    no: 7,
    name: 45,
    qty: 14,
    unit: 12,
    unitPrice: 22,
    discount: 16,
    vatRate: 14,
    net: 22,
    vat: 18,
    total: 22
  };
  
  // Toplam genişliği kontrol et ve ayarla (padding dahil)
  const totalPadding = (Object.keys(colWidths).length - 1) * colPadding;
  const totalWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0) + totalPadding;
  if (totalWidth > availableWidth) {
    // Oranlı olarak küçült
    const scale = availableWidth / totalWidth;
    Object.keys(colWidths).forEach(key => {
      colWidths[key as keyof typeof colWidths] = Math.floor(colWidths[key as keyof typeof colWidths] * scale);
    });
  }
  
  // Başlıklar - her kolon için doğru pozisyon ve padding
  let xPos = margin + 3;
  doc.text('#', xPos, yPos + 6);
  xPos += colWidths.no + colPadding;
  
  doc.text('Aciklama', xPos, yPos + 6);
  xPos += colWidths.name + colPadding;
  
  doc.text('Miktar', xPos + colWidths.qty, yPos + 6, { align: 'right' });
  xPos += colWidths.qty + colPadding;
  
  doc.text('Birim', xPos, yPos + 6);
  xPos += colWidths.unit + colPadding;
  
  doc.text('B.Fiyat', xPos + colWidths.unitPrice, yPos + 6, { align: 'right' });
  xPos += colWidths.unitPrice + colPadding;
  
  doc.text('Isk.', xPos + colWidths.discount, yPos + 6, { align: 'right' });
  xPos += colWidths.discount + colPadding;
  
  doc.text('KDV %', xPos + colWidths.vatRate, yPos + 6, { align: 'right' });
  xPos += colWidths.vatRate + colPadding;
  
  doc.text('Net', xPos + colWidths.net, yPos + 6, { align: 'right' });
  xPos += colWidths.net + colPadding;
  
  doc.text('KDV', xPos + colWidths.vat, yPos + 6, { align: 'right' });
  xPos += colWidths.vat + colPadding;
  
  doc.text('Toplam', xPos + colWidths.total, yPos + 6, { align: 'right' });
  
  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(9);

  // Kalemler
  let totalNet = 0;
  let totalVat = 0;
  let totalGross = 0;

  input.lines.forEach((line, idx) => {
    // Sayfa sonu kontrolü
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    const netAmount = line.qty * line.unitPrice * (line.discountPercent ? (1 - line.discountPercent / 100) : 1);
    const vatAmount = netAmount * (line.vatRate / 100);
    const grossAmount = netAmount + vatAmount;
    
    totalNet += netAmount;
    totalVat += vatAmount;
    totalGross += grossAmount;

    // Satır arka planı (zebra)
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    }

    // Her kolon için doğru pozisyon ve hizalama
    xPos = margin + 3;
    doc.text(String(idx + 1), xPos, yPos);
    xPos += colWidths.no + colPadding;
    
    // Açıklama (uzunsa kısalt) - kolon genişliğine göre
    const maxNameLength = Math.floor(colWidths.name / 2.5); // Font size'a göre yaklaşık karakter sayısı
    const name = line.name.length > maxNameLength ? line.name.substring(0, maxNameLength - 3) + '...' : line.name;
    doc.text(name, xPos, yPos);
    xPos += colWidths.name + colPadding;
    
    // Sayısal değerler sağa hizalı
    doc.text(line.qty.toFixed(2), xPos + colWidths.qty, yPos, { align: 'right' });
    xPos += colWidths.qty + colPadding;
    
    doc.text('Adet', xPos, yPos);
    xPos += colWidths.unit + colPadding;
    
    doc.text(line.unitPrice.toFixed(2), xPos + colWidths.unitPrice, yPos, { align: 'right' });
    xPos += colWidths.unitPrice + colPadding;
    
    doc.text(line.discountPercent ? `%${line.discountPercent}` : '-', xPos + colWidths.discount, yPos, { align: 'right' });
    xPos += colWidths.discount + colPadding;
    
    doc.text(`%${line.vatRate}`, xPos + colWidths.vatRate, yPos, { align: 'right' });
    xPos += colWidths.vatRate + colPadding;
    
    doc.text(netAmount.toFixed(2), xPos + colWidths.net, yPos, { align: 'right' });
    xPos += colWidths.net + colPadding;
    
    doc.text(vatAmount.toFixed(2), xPos + colWidths.vat, yPos, { align: 'right' });
    xPos += colWidths.vat + colPadding;
    
    doc.text(grossAmount.toFixed(2), xPos + colWidths.total, yPos, { align: 'right' });
    
    yPos += 8;

    // Kur bilgisi (varsa)
    if (line.lineCurrency && line.lineCurrency !== input.currency) {
      const fx = line.exchangeRate || 1;
      const origUnit = line.unitPrice / fx;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`   Orijinal: ${origUnit.toFixed(2)} ${line.lineCurrency} | Kur: 1 ${line.lineCurrency} = ${fx.toFixed(4)} ${input.currency}`, margin + colWidths.no, yPos);
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    }
  });

  // Toplam çizgisi
  yPos += 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Toplamlar - sağ blok, taşmayı önlemek için ayrı satırlar
  const totalsValueX = pageWidth - margin;
  const totalsLabelX = totalsValueX - 60;
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.text('ARA TOPLAM:', totalsLabelX, yPos);
  doc.text(totalNet.toFixed(2), totalsValueX, yPos, { align: 'right' });
  yPos += 6;
  doc.text('KDV TOPLAM:', totalsLabelX, yPos);
  doc.text(totalVat.toFixed(2), totalsValueX, yPos, { align: 'right' });
  yPos += 6;
  doc.setFontSize(12);
  doc.text('GENEL TOPLAM:', totalsLabelX, yPos);
  doc.setFontSize(12);
  doc.text(`${totalGross.toFixed(2)} ${input.currency}`, totalsValueX, yPos, { align: 'right' });

  // Alt not
  yPos = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Bu belge elektronik ortamda olusturulmustur. GIB entegrasyonu yoktur.', pageWidth / 2, yPos, { align: 'center' });

  // PDF'i kaydet
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });
  registerPdfFonts(doc);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Başlık kutusu
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');
  doc.setFontSize(24);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('E-İRSALİYE', pageWidth / 2, yPos + 16, { align: 'center' });
  yPos += 35;

  // İrsaliye bilgileri (sağ üst)
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(100, 100, 100);
  const infoX = pageWidth - margin - 50;
  doc.text('İrsaliye No:', infoX, yPos);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(input.despatchNumber, infoX + 25, yPos);
  yPos += 6;
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Tarih:', infoX, yPos);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  const dateObj = new Date(input.issueDate);
  doc.text(
    (dateObj as any)?.toDate?.()
      ? (dateObj as any).toDate().toLocaleDateString('tr-TR')
      : new Date(dateObj as any).toLocaleDateString('tr-TR'),
    infoX + 25,
    yPos
  );
  yPos += 15;

  // Gönderen bilgileri kutusu (sol)
  const senderBoxY = yPos;
  const boxWidth = (pageWidth - 3 * margin) / 2;
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, senderBoxY, boxWidth, 40, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(margin, senderBoxY, boxWidth, 40, 'D');
  
  doc.setFontSize(11);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(0, 0, 0);
  // GÖNDEREN başlığını ortala
  const gonderText = 'GÖNDEREN';
  doc.text(gonderText, margin + boxWidth / 2, senderBoxY + 8, { align: 'center' });
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(10);
  // Türkçe karakterler için NotoSans kullanıyoruz.
  doc.text('Sirket Adi', margin + 8, senderBoxY + 15);
  doc.text('Vergi No', margin + 8, senderBoxY + 22);
  doc.text('Adres', margin + 8, senderBoxY + 29);
  doc.text('Telefon', margin + 8, senderBoxY + 36);

  // Alıcı bilgileri kutusu (sağ)
  const receiverBoxX = margin + boxWidth + margin;
  doc.setFillColor(250, 250, 250);
  doc.rect(receiverBoxX, senderBoxY, boxWidth, 40, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(receiverBoxX, senderBoxY, boxWidth, 40, 'D');
  
  doc.setFontSize(11);
  doc.setFont('NotoSans', 'bold');
  // ALICI başlığını ortala
  const aliciText = 'ALICI';
  doc.text(aliciText, receiverBoxX + boxWidth / 2, senderBoxY + 8, { align: 'center' });
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(10);
  // Alıcı adını kısalt (uzunsa)
  const customerName = (input.customerName || '').length > 25 
    ? (input.customerName || '').substring(0, 22) + '...' 
    : (input.customerName || '');
  doc.text(customerName, receiverBoxX + 8, senderBoxY + 15);
  doc.text(input.customerVknTckn || '', receiverBoxX + 8, senderBoxY + 22);
  yPos = senderBoxY + 50;

  // Kalemler tablosu başlığı
  yPos += 5;
  doc.setFillColor(60, 60, 60);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
  doc.setFontSize(10);
  doc.setFont('NotoSans', 'bold');
  doc.setTextColor(255, 255, 255);
  
  const colPadding = 2;
  const colWidths = {
    no: 10,
    name: 100,
    qty: 25,
    unit: 25
  };
  
  // Toplam genişliği kontrol et (padding dahil)
  const availableWidth = pageWidth - 2 * margin - 10;
  const totalPadding = (Object.keys(colWidths).length - 1) * colPadding;
  const totalWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0) + totalPadding;
  if (totalWidth > availableWidth) {
    const scale = availableWidth / totalWidth;
    Object.keys(colWidths).forEach(key => {
      colWidths[key as keyof typeof colWidths] = Math.floor(colWidths[key as keyof typeof colWidths] * scale);
    });
  }
  
  let xPos = margin + 3;
  doc.text('#', xPos, yPos + 7);
  xPos += colWidths.no + colPadding;
  doc.text('Aciklama', xPos, yPos + 7);
  xPos += colWidths.name + colPadding;
  doc.text('Miktar', xPos + colWidths.qty, yPos + 7, { align: 'right' });
  xPos += colWidths.qty + colPadding;
  doc.text('Birim', xPos, yPos + 7);
  
  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFont('NotoSans', 'normal');
  doc.setFontSize(10);

  // Kalemler
  input.items.forEach((item, idx) => {
    // Sayfa sonu kontrolü
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    // Satır arka planı (zebra)
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    }

    xPos = margin + 3;
    doc.text(String(idx + 1), xPos, yPos);
    xPos += colWidths.no + colPadding;
    
    // Açıklama (uzunsa kısalt) - kolon genişliğine göre
    const maxNameLength = Math.floor(colWidths.name / 2.5);
    const name = item.name.length > maxNameLength ? item.name.substring(0, maxNameLength - 3) + '...' : item.name;
    doc.text(name, xPos, yPos);
    xPos += colWidths.name + colPadding;
    
    doc.text(item.qty.toString(), xPos + colWidths.qty, yPos, { align: 'right' });
    xPos += colWidths.qty + colPadding;
    
    doc.text(item.unit, xPos, yPos);
    
    yPos += 8;
  });

  // Toplam çizgisi
  yPos += 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // Toplam miktar
  const totalQty = input.items.reduce((sum, item) => sum + item.qty, 0);
  doc.setFontSize(11);
  doc.setFont('NotoSans', 'bold');
  xPos = margin + colWidths.no + colWidths.name;
  doc.text('TOPLAM:', xPos, yPos);
  xPos += colWidths.qty;
  doc.text(totalQty.toString(), xPos, yPos);

  // Alt not
  yPos = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('NotoSans', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Bu belge elektronik ortamda olusturulmustur. GIB entegrasyonu yoktur.', pageWidth / 2, yPos, { align: 'center' });

  // PDF'i kaydet
  doc.save(`irsaliye_${input.despatchNumber}.pdf`);
};

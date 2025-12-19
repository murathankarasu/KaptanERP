import jsPDF from 'jspdf';
import { Shipment } from '../services/shipmentService';
import { Customer } from '../services/customerService';

/**
 * Sevkiyat çeki listesini PDF olarak oluştur
 */
export const generateShipmentPDF = async (
  shipment: Shipment,
  customer?: Customer
): Promise<void> => {
  const doc = new jsPDF();
  
  // Sayfa ayarları
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Başlık
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SEVKİYAT ÇEKİ LİSTESİ', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Sevkiyat bilgileri
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Sevkiyat No: ${shipment.shipmentNumber}`, margin, yPos);
  yPos += 7;
  doc.text(`Tarih: ${shipment.shipmentDate.toLocaleDateString('tr-TR')}`, margin, yPos);
  yPos += 7;
  doc.text(`Durum: ${getStatusText(shipment.status)}`, margin, yPos);
  yPos += 10;

  // Müşteri bilgileri
  doc.setFont('helvetica', 'bold');
  doc.text('MÜŞTERİ BİLGİLERİ', margin, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Müşteri: ${shipment.customerName}`, margin, yPos);
  yPos += 7;
  
  if (customer) {
    if (customer.companyName) {
      doc.text(`Şirket: ${customer.companyName}`, margin, yPos);
      yPos += 7;
    }
    if (customer.address) {
      doc.text(`Adres: ${customer.address}`, margin, yPos);
      yPos += 7;
    }
    if (customer.city || customer.district) {
      const cityDistrict = [customer.city, customer.district].filter(Boolean).join(' / ');
      doc.text(`Şehir/İlçe: ${cityDistrict}`, margin, yPos);
      yPos += 7;
    }
    if (customer.phone) {
      doc.text(`Telefon: ${customer.phone}`, margin, yPos);
      yPos += 7;
    }
    if (customer.email) {
      doc.text(`E-posta: ${customer.email}`, margin, yPos);
      yPos += 7;
    }
    if (customer.taxNumber) {
      doc.text(`Vergi No: ${customer.taxNumber}`, margin, yPos);
      yPos += 7;
    }
  }
  
  yPos += 5;

  // Ürün listesi başlığı
  doc.setFont('helvetica', 'bold');
  doc.text('ÜRÜN LİSTESİ', margin, yPos);
  yPos += 10;

  // Tablo başlıkları
  const docCurrency = shipment.currency || 'TRY';

  const colWidths = {
    no: 12,
    material: 60,
    quantity: 22,
    unit: 18,
    unitPrice: 25,
    discount: 20,
    total: 30
  };
  
  let xPos = margin;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('No', xPos, yPos);
  xPos += colWidths.no;
  doc.text('Malzeme', xPos, yPos);
  xPos += colWidths.material;
  doc.text('Miktar', xPos, yPos);
  xPos += colWidths.quantity;
  doc.text('Birim', xPos, yPos);
  xPos += colWidths.unit;
  doc.text('İskonto', xPos, yPos);
  xPos += colWidths.discount;
  doc.text('Birim Fiyat', xPos, yPos);
  xPos += colWidths.unitPrice;
  doc.text('Toplam', xPos, yPos);
  
  yPos += 7;
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Ürün listesi
  doc.setFont('helvetica', 'normal');
  shipment.items.forEach((item, index) => {
    // Sayfa sonu kontrolü
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    xPos = margin;
    doc.text(String(index + 1), xPos, yPos);
    xPos += colWidths.no;
    
    // Malzeme adı uzunsa kısalt
    const materialName = item.materialName.length > 30 
      ? item.materialName.substring(0, 27) + '...' 
      : item.materialName;
    doc.text(materialName, xPos, yPos);
    xPos += colWidths.material;
    
    doc.text(item.quantity.toString(), xPos, yPos);
    xPos += colWidths.quantity;
    
    doc.text(item.unit, xPos, yPos);
    xPos += colWidths.unit;
    
    doc.text(item.discountPercent !== undefined ? `%${item.discountPercent}` : '-', xPos, yPos);
    xPos += colWidths.discount;
    
    doc.text(item.unitPrice.toFixed(2) + ` ${docCurrency}`, xPos, yPos);
    xPos += colWidths.unitPrice;
    
    doc.text(item.totalPrice.toFixed(2) + ` ${docCurrency}`, xPos, yPos);
    
    yPos += 7;

    // Orijinal PB / Kur bilgisi
    if (item.currency && item.currency !== 'TRY') {
      const fx = item.exchangeRate || 1;
      const origUnit = item.unitPrice / fx;
      doc.setFontSize(9);
      doc.text(`   Orijinal: ${origUnit.toFixed(2)} ${item.currency} | Kur: 1 ${item.currency} = ${fx.toFixed(4)} ${docCurrency}`, margin + colWidths.no, yPos);
      doc.setFontSize(10);
      yPos += 6;
    }
  });

  // Toplam çizgisi
  yPos += 3;
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 7;

  // Toplam tutar
  xPos = margin + colWidths.no + colWidths.material + colWidths.quantity + colWidths.unit + colWidths.discount + colWidths.unitPrice;
  doc.setFont('helvetica', 'bold');
  doc.text('TOPLAM:', xPos, yPos);
  xPos += colWidths.unitPrice;
  doc.text(shipment.totalAmount.toFixed(2) + ` ${docCurrency}`, xPos, yPos);

  // Notlar
  if (shipment.notes) {
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('NOTLAR:', margin, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(shipment.notes, pageWidth - 2 * margin);
    notesLines.forEach((line: string) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += 7;
    });
  }

  // Fiyat kuralı notları
  const ruleNotes = shipment.items
    .map((it, idx) => it.priceRuleNote ? `${idx + 1}) ${it.materialName}: ${it.priceRuleNote}${it.discountPercent ? ` (%${it.discountPercent})` : ''}` : null)
    .filter(Boolean) as string[];
  if (ruleNotes.length > 0) {
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Fiyat Kuralı Bilgisi:', margin, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    ruleNotes.forEach((note) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(note, margin, yPos);
      yPos += 6;
    });
  }

  // Depo bilgisi
  if (shipment.warehouse) {
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Depo: ${shipment.warehouse}`, margin, yPos);
  }

  // PDF'i indir
  const filename = `Sevkiyat_${shipment.shipmentNumber}_${shipment.shipmentDate.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Durum metnini Türkçe'ye çevir
 */
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Beklemede',
    preparing: 'Hazırlanıyor',
    shipped: 'Sevk Edildi',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi'
  };
  return statusMap[status] || status;
};


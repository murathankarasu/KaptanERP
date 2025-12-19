import * as XLSX from 'xlsx';
import { StockEntry, StockOutput, StockStatus } from '../services/stockService';

export const exportStockEntriesToExcel = (entries: StockEntry[], filename: string = 'stok_girisleri.xlsx') => {
  const data = entries.map(entry => ({
    'Geliş Tarihi': entry.arrivalDate.toLocaleDateString('tr-TR'),
    'Malzeme Adı': entry.materialName,
    'Kategori': entry.category,
    'Birim': entry.unit,
    'Gelen Miktar': entry.quantity,
    'Birim Fiyat': entry.unitPrice,
    'Tedarikçi': entry.supplier,
    'Not': entry.note || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stok Girişleri');
  
  // Sütun genişliklerini ayarla
  const colWidths = [
    { wch: 15 }, // Geliş Tarihi
    { wch: 25 }, // Malzeme Adı
    { wch: 15 }, // Kategori
    { wch: 10 }, // Birim
    { wch: 12 }, // Gelen Miktar
    { wch: 12 }, // Birim Fiyat
    { wch: 20 }, // Tedarikçi
    { wch: 30 }  // Not
  ];
  ws['!cols'] = colWidths;
  
  XLSX.writeFile(wb, filename);
};

export const exportStockOutputsToExcel = (outputs: StockOutput[], filename: string = 'personel_cikislari.xlsx') => {
  const data = outputs.map(output => ({
    'Veriliş Tarihi': output.issueDate.toLocaleDateString('tr-TR'),
    'Personel': output.employee,
    'Departman': output.department,
    'Malzeme Adı': output.materialName,
    'Verilen Miktar': output.quantity,
    'Teslim Eden': output.issuedBy,
    'Açıklama': output.description || ''
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Personel Çıkışları');
  
  // Sütun genişliklerini ayarla
  const colWidths = [
    { wch: 15 }, // Veriliş Tarihi
    { wch: 20 }, // Personel
    { wch: 15 }, // Departman
    { wch: 25 }, // Malzeme Adı
    { wch: 15 }, // Verilen Miktar
    { wch: 20 }, // Teslim Eden
    { wch: 30 }  // Açıklama
  ];
  ws['!cols'] = colWidths;
  
  XLSX.writeFile(wb, filename);
};

export const exportStockStatusToExcel = (statuses: StockStatus[], filename: string = 'stok_durumu.xlsx') => {
  const data = statuses.map(status => ({
    'Malzeme Adı': status.materialName,
    'Toplam Giriş': status.totalEntry,
    'Toplam Çıkış': status.totalOutput,
    'Mevcut Stok': status.currentStock,
    'Kritik Seviye': status.criticalLevel,
    'Durum': status.status === 'green' ? 'Yeşil' : status.status === 'orange' ? 'Turuncu' : 'Kırmızı',
    'Birim': status.unit
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stok Durumu');
  
  // Sütun genişliklerini ayarla
  const colWidths = [
    { wch: 25 }, // Malzeme Adı
    { wch: 15 }, // Toplam Giriş
    { wch: 15 }, // Toplam Çıkış
    { wch: 15 }, // Mevcut Stok
    { wch: 15 }, // Kritik Seviye
    { wch: 12 }, // Durum
    { wch: 10 }  // Birim
  ];
  ws['!cols'] = colWidths;
  
  XLSX.writeFile(wb, filename);
};


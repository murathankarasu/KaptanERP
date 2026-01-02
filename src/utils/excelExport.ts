import * as XLSX from 'xlsx';
import { StockEntry, StockOutput, StockStatus } from '../services/stockService';

export const exportStockEntriesToExcel = (entries: StockEntry[], filename: string = 'stok_girisleri.xlsx') => {
  const data = entries.map(entry => {
    // Tarihi Date objesi olarak tut (Excel otomatik formatlar)
    let arrivalDate: Date | string = '';
    if (entry.arrivalDate) {
      if (entry.arrivalDate instanceof Date) {
        arrivalDate = entry.arrivalDate;
      } else {
        // Firestore Timestamp veya diğer formatlar için
        const dateValue = entry.arrivalDate as any;
        if (dateValue && typeof dateValue.toDate === 'function') {
          // Firestore Timestamp
          arrivalDate = dateValue.toDate();
        } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
          arrivalDate = new Date(dateValue);
        } else {
          arrivalDate = new Date(dateValue);
        }
      }
    }
    
    return {
      'Geliş Tarihi': arrivalDate,
      'Malzeme Adı': entry.materialName,
      'Kategori': entry.category,
      'Birim': entry.unit,
      'Gelen Miktar': entry.quantity,
      'Birim Fiyat': entry.unitPrice,
      'Tedarikçi': entry.supplier,
      'Not': entry.note || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stok Girişleri');
  
  // Tarih sütununu bul ve formatla
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const headerRow = 0;
  let dateColIndex = -1;
  
  // Başlık satırında "Geliş Tarihi" sütununu bul
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = ws[cellAddress];
    if (cell && cell.v && String(cell.v).includes('Geliş Tarihi')) {
      dateColIndex = col;
      break;
    }
  }
  
  // Tarih sütununu formatla (Excel tarih formatı: dd.mm.yyyy)
  if (dateColIndex >= 0) {
    for (let row = headerRow + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: dateColIndex });
      const cell = ws[cellAddress];
      if (cell && cell.v) {
        // Excel'in anlayacağı tarih formatına çevir
        if (cell.v instanceof Date) {
          // Date objesi zaten doğru formatta
          cell.z = 'dd.mm.yyyy'; // Excel format kodu
          cell.t = 'd'; // Excel cell type: date
        } else if (typeof cell.v === 'string' && cell.v.trim() !== '') {
          // String tarihi Date'e çevir
          const date = new Date(cell.v);
          if (!isNaN(date.getTime())) {
            cell.v = date;
            cell.z = 'dd.mm.yyyy';
            cell.t = 'd'; // Excel cell type: date
          }
        }
      }
    }
  }
  
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
    'Veriliş Tarihi': output.issueDate
      ? new Date(output.issueDate as any).toLocaleDateString('tr-TR')
      : '',
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


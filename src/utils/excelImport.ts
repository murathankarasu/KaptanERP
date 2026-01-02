import * as XLSX from 'xlsx';
import { StockEntry as StockEntryType } from '../services/stockService';
import { fixExcelFormatWithAI } from '../services/aiService';

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export const importStockEntriesFromExcel = async (
  file: File,
  onProgress?: (progress: number) => void,
  useAIFormatFix?: boolean
): Promise<{ entries: StockEntryType[]; result: ImportResult; needsFormatFix?: boolean; aiFixedData?: any[] }> => {
  return new Promise(async (resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // İlk sayfayı al
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // JSON'a dönüştür
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // İlk satır başlık satırı
        if (jsonData.length < 2) {
          reject(new Error('Excel dosyası boş veya geçersiz format'));
          return;
        }
        
        const headers = jsonData[0].map((h: any) => String(h).trim());
        
        // Format kontrolü - beklenen başlıkları kontrol et
        const expectedHeaders = ['Geliş Tarihi', 'Malzeme Adı', 'Kategori', 'Birim', 'Gelen Miktar', 'Birim Fiyat', 'Tedarikçi', 'Depo'];
        const headerMap: { [key: string]: string } = {
          'Geliş Tarihi': 'arrivalDate',
          'Malzeme Adı': 'materialName',
          'Kategori': 'category',
          'Birim': 'unit',
          'Gelen Miktar': 'quantity',
          'Birim Fiyat': 'unitPrice',
          'Tedarikçi': 'supplier',
          'Depo': 'warehouse',
          'Not': 'note',
          'Kritik Seviye': 'criticalLevel'
        };
        
        const missingHeaders = expectedHeaders.filter(h => 
          !headers.some(header => header.toLowerCase().includes(h.toLowerCase()))
        );
        
        // Eğer format uygun değilse ve AI düzeltme isteniyorsa
        if (missingHeaders.length > 0 && useAIFormatFix) {
          try {
            const rawData = jsonData.slice(1).map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index];
              });
              return obj;
            });
            
            const aiResult = await fixExcelFormatWithAI(rawData, {
              requiredFields: expectedHeaders,
              fieldTypes: {
                'Geliş Tarihi': 'date',
                'Malzeme Adı': 'string',
                'Kategori': 'string',
                'Birim': 'string',
                'Gelen Miktar': 'number',
                'Birim Fiyat': 'number',
                'Tedarikçi': 'string'
              }
            });
            
            if (aiResult.success && aiResult.fixedData) {
              return resolve({
                entries: [],
                result: { success: 0, failed: 0, errors: [] },
                needsFormatFix: true,
                aiFixedData: aiResult.fixedData
              });
            }
          } catch (aiError) {
            console.error('AI format düzeltme hatası:', aiError);
          }
        }
        
        if (missingHeaders.length > 0) {
          return resolve({
            entries: [],
            result: { success: 0, failed: 0, errors: [] },
            needsFormatFix: true
          });
        }
        
        // headerMap zaten yukarıda tanımlanmış, tekrar tanımlamaya gerek yok
        
        const entries: StockEntryType[] = [];
        const errors: string[] = [];
        let success = 0;
        let failed = 0;
        
        // Veri satırlarını işle
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          if (onProgress) {
            onProgress((i / jsonData.length) * 100);
          }
          
          try {
            const entry: any = {};
            
            // Her sütunu eşleştir
            headers.forEach((header, index) => {
              const mappedKey = headerMap[header];
              if (mappedKey && row[index] !== undefined && row[index] !== null && row[index] !== '') {
                entry[mappedKey] = row[index];
              }
            });
            
            // Gerekli alanları kontrol et
            if (!entry.materialName || !entry.category || !entry.unit || !entry.warehouse) {
              failed++;
              errors.push(`Satır ${i + 1}: Malzeme Adı, Kategori, Birim ve Depo zorunludur`);
              continue; // Bir sonraki satıra geç, return yerine continue kullanmalıyız
            }
            
            // Tarih dönüşümü
            if (entry.arrivalDate) {
              if (typeof entry.arrivalDate === 'number') {
                // Excel tarih numarası (1900-01-01'den itibaren gün sayısı)
                const excelEpoch = new Date(1899, 11, 30);
                const days = entry.arrivalDate;
                entry.arrivalDate = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
              } else if (typeof entry.arrivalDate === 'string') {
                // String tarih
                const date = new Date(entry.arrivalDate);
                if (isNaN(date.getTime())) {
                  // Türkçe tarih formatı denemesi (GG.AA.YYYY)
                  const parts = entry.arrivalDate.split(/[.\/\-]/);
                  if (parts.length === 3) {
                    entry.arrivalDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                  } else {
                    throw new Error(`Satır ${i + 1}: Geçersiz tarih formatı`);
                  }
                } else {
                  entry.arrivalDate = date;
                }
              } else if (entry.arrivalDate instanceof Date) {
                entry.arrivalDate = entry.arrivalDate;
              } else {
                entry.arrivalDate = new Date();
              }
            } else {
              entry.arrivalDate = new Date();
            }
            
            // Sayısal alanları dönüştür
            entry.quantity = parseFloat(entry.quantity) || 0;
            entry.unitPrice = parseFloat(entry.unitPrice) || 0;
            entry.criticalLevel = parseFloat(entry.criticalLevel) || 0;
            
            // Tip kontrolü
            const stockEntry: StockEntryType = {
              arrivalDate: entry.arrivalDate instanceof Date ? entry.arrivalDate : new Date(entry.arrivalDate),
              materialName: String(entry.materialName).trim(),
              category: String(entry.category).trim(),
              unit: String(entry.unit).trim(),
              quantity: entry.quantity,
              unitPrice: entry.unitPrice,
              supplier: String(entry.supplier || '').trim(),
              warehouse: String(entry.warehouse || '').trim(),
              note: String(entry.note || '').trim()
            };
            
            entries.push(stockEntry);
            success++;
          } catch (error: any) {
            failed++;
            errors.push(`Satır ${i + 1}: ${error.message || 'Bilinmeyen hata'}`);
          }
        }
        
        resolve({
          entries,
          result: {
            success,
            failed,
            errors
          }
        });
      } catch (error: any) {
        reject(new Error(`Excel dosyası okunurken hata: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Dosya okunamadı'));
    };
    
    reader.readAsBinaryString(file);
  });
};


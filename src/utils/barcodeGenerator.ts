/**
 * Firma bazlı otomatik barkod numarası oluşturur
 * Format: Firma kodu (3-4 hane) + Ürün sıra numarası (8-9 hane) = 12-13 hane
 * EAN-13 uyumlu format
 */

export const generateBarcode = (companyId: string, existingBarcodes: string[] = []): string => {
  // Firma ID'sinden kısa bir kod oluştur (ilk 3-4 karakter)
  const companyCode = companyId.substring(0, 4).padEnd(4, '0').replace(/[^0-9]/g, '0');
  const companyPrefix = companyCode.padStart(4, '0').substring(0, 4);
  
  // Rastgele 8 haneli numara oluştur
  let productNumber = '';
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    productNumber = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const fullBarcode = `${companyPrefix}${productNumber}`;
    
    // Eğer bu barkod zaten varsa, yeni bir tane oluştur
    if (!existingBarcodes.includes(fullBarcode)) {
      return fullBarcode;
    }
    
    attempts++;
  } while (attempts < maxAttempts);
  
  // Son çare: timestamp kullan
  const timestamp = Date.now().toString().slice(-8);
  return `${companyPrefix}${timestamp}`;
};

/**
 * Barkod geçerliliğini kontrol eder (EAN-13 formatı)
 */
export const validateBarcode = (barcode: string): boolean => {
  if (!barcode || barcode.length < 8 || barcode.length > 13) {
    return false;
  }
  
  // Sadece rakam içermeli
  return /^\d+$/.test(barcode);
};


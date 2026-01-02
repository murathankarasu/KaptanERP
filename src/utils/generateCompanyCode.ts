/**
 * Benzersiz şirket kodu oluşturur
 * Format: 3 harf + 3 rakam (örn: ABC123, XYZ789)
 */
export const generateCompanyCode = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  // 3 rastgele harf
  let code = '';
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // 3 rastgele rakam
  for (let i = 0; i < 3; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return code;
};


export const formatDate = (
  value: any,
  locale: string = 'tr-TR',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!value) return '-';
  try {
    let d: Date;
    if (value?.toDate && typeof value.toDate === 'function') {
      // Firestore Timestamp
      d = value.toDate();
    } else if (value instanceof Date) {
      d = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      d = new Date(value);
    } else {
      return '-';
    }
    
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(locale, options || {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Tarih formatlama hatası:', error, value);
    return '-';
  }
};



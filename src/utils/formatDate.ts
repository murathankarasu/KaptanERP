export const formatDate = (
  value: any,
  locale: string = 'tr-TR',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!value) return '';
  try {
    const d = value?.toDate?.() ? value.toDate() : new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, options);
  } catch {
    return '';
  }
};



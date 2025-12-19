/**
 * Mevcut kullanıcının şirket bilgisini döndürür
 */
export const getCurrentCompany = () => {
  try {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const userData = JSON.parse(currentUser);
      return {
        companyId: userData.companyId,
        companyCode: userData.companyCode
      };
    }
    return null;
  } catch (error) {
    console.error('Şirket bilgisi alınırken hata:', error);
    return null;
  }
};


import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

/**
 * Şirket logosunu Firebase Storage'a yükler
 * @param file Logo dosyası
 * @param companyId Şirket ID'si
 * @returns Download URL
 */
export const uploadCompanyLogo = async (file: File, companyId: string): Promise<string> => {
  try {
    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
      throw new Error('Sadece görsel dosyaları yükleyebilirsiniz (jpg, png, gif, webp)');
    }

    // Dosya boyutu kontrolü (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Logo dosyası 5MB\'dan büyük olamaz');
    }

    // Storage path: company-logos/{companyId}/logo.{extension}
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `logo.${fileExtension}`;
    const storageRef = ref(storage, `company-logos/${companyId}/${fileName}`);

    // Dosyayı yükle
    await uploadBytes(storageRef, file);

    // Download URL'i al
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error: any) {
    console.error('Logo yükleme hatası:', error);
    throw new Error('Logo yüklenirken hata oluştu: ' + (error.message || error));
  }
};

/**
 * Şirket logosunu siler
 * @param companyId Şirket ID'si
 * @param logoUrl Logo URL'i (opsiyonel, yoksa companyId'den bulur)
 */
export const deleteCompanyLogo = async (companyId: string, logoUrl?: string): Promise<void> => {
  try {
    if (logoUrl) {
      // URL'den storage path'i çıkar
      const urlParts = logoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      const storageRef = ref(storage, `company-logos/${companyId}/${fileName}`);
      await deleteObject(storageRef);
    } else {
      // Tüm logo dosyalarını sil (farklı extension'lar olabilir)
      const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      for (const ext of extensions) {
        try {
          const storageRef = ref(storage, `company-logos/${companyId}/logo.${ext}`);
          await deleteObject(storageRef);
        } catch {
          // Dosya yoksa devam et
        }
      }
    }
  } catch (error: any) {
    console.error('Logo silme hatası:', error);
    // Hata olsa bile devam et (dosya zaten yok olabilir)
  }
};


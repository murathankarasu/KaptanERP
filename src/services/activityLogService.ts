import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { PermissionType } from '../types/permissions';

export interface ActivityLog {
  id?: string;
  userId?: string;
  username?: string;
  userEmail?: string;
  personnelId?: string;
  personnelName?: string;
  action: string; // Yapılan işlem (örn: "Stok Giriş Eklendi", "Personel Silindi")
  module: PermissionType | string; // Hangi modülde yapıldı
  details?: string; // Detaylı bilgi (JSON string olabilir)
  companyId?: string;
  timestamp: Date;
  ipAddress?: string;
}

const collectionName = 'activityLogs';

/**
 * Aktivite logu ekle
 */
export const addActivityLog = async (log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<string> => {
  try {
    // Firestore undefined değerleri kabul etmez, bu yüzden undefined olan alanları filtrele
    const logData: any = {
      action: log.action,
      module: log.module,
      timestamp: Timestamp.now()
    };
    
    // Sadece tanımlı (undefined olmayan) değerleri ekle
    if (log.userId !== undefined) logData.userId = log.userId;
    if (log.username !== undefined) logData.username = log.username;
    if (log.userEmail !== undefined) logData.userEmail = log.userEmail;
    if (log.personnelId !== undefined) logData.personnelId = log.personnelId;
    if (log.personnelName !== undefined) logData.personnelName = log.personnelName;
    if (log.details !== undefined) logData.details = log.details;
    if (log.companyId !== undefined) logData.companyId = log.companyId;
    if (log.ipAddress !== undefined) logData.ipAddress = log.ipAddress;
    
    const docRef = await addDoc(collection(db, collectionName), logData);
    return docRef.id;
  } catch (error) {
    console.error('Aktivite logu eklenirken hata:', error);
    throw error;
  }
};

/**
 * Aktivite loglarını getir (sadece manager görebilir)
 */
export const getActivityLogs = async (filters?: {
  companyId?: string;
  userId?: string;
  personnelId?: string;
  module?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<ActivityLog[]> => {
  try {
    let q = query(collection(db, collectionName), orderBy('timestamp', 'desc'));
    
    if (filters?.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }
    
    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    
    if (filters?.personnelId) {
      q = query(q, where('personnelId', '==', filters.personnelId));
    }
    
    if (filters?.module) {
      q = query(q, where('module', '==', filters.module));
    }
    
    if (filters?.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(start)));
    }
    
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(end)));
    }
    
    const querySnapshot = await getDocs(q);
    let logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    })) as ActivityLog[];
    
    // Limit uygula
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }
    
    return logs;
  } catch (error) {
    console.error('Aktivite logları yüklenirken hata:', error);
    throw error;
  }
};

/**
 * Kullanıcının IP adresini al (basit yöntem)
 */
export const getUserIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    return 'unknown';
  }
};


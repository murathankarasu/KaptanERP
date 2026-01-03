import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { AIDailyReport } from './aiService';

const collectionName = 'aiDailyReports';

// Tarihi YYYY-MM-DD formatına çevir
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// YYYY-MM-DD formatındaki string'i Date'e çevir
const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// tr-TR formatındaki tarihi (DD.MM.YYYY) Date'e çevir
const parseTRDate = (dateStr: string): Date | null => {
  try {
    if (dateStr.includes('.')) {
      const [day, month, year] = dateStr.split('.').map(Number);
      return new Date(year, month - 1, day);
    }
    // ISO formatı deneyelim
    return new Date(dateStr);
  } catch {
    return null;
  }
};

// Cache'den günlük raporu getir
export const getCachedDailyReport = async (
  date: Date,
  companyId?: string
): Promise<AIDailyReport | null> => {
  try {
    const dateKey = formatDateKey(date);
    const docId = companyId ? `${companyId}_${dateKey}` : `global_${dateKey}`;
    
    const docSnap = await getDoc(doc(db, collectionName, docId));
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        date: data.date,
        summary: data.summary,
        highlights: data.highlights || [],
        warnings: data.warnings || [],
        recommendations: data.recommendations || []
      };
    }
    
    return null;
  } catch (error) {
    console.error('Cache okuma hatası:', error);
    return null;
  }
};

// Günlük raporu cache'e kaydet
export const saveDailyReportToCache = async (
  report: AIDailyReport,
  companyId?: string
): Promise<void> => {
  try {
    // Tarihi parse et (tr-TR veya ISO formatı olabilir)
    const reportDate = parseTRDate(report.date) || new Date();
    const dateKey = formatDateKey(reportDate);
    const docId = companyId ? `${companyId}_${dateKey}` : `global_${dateKey}`;
    
    await setDoc(doc(db, collectionName, docId), {
      date: report.date,
      summary: report.summary,
      highlights: report.highlights || [],
      warnings: report.warnings || [],
      recommendations: report.recommendations || [],
      companyId: companyId || null,
      createdAt: Timestamp.now(),
      dateKey
    });
  } catch (error) {
    console.error('Cache kaydetme hatası:', error);
  }
};

// Belirli bir tarih aralığındaki raporları getir
export const getCachedReportsByDateRange = async (
  startDate: Date,
  endDate: Date,
  companyId?: string,
  limitCount: number = 30
): Promise<AIDailyReport[]> => {
  try {
    let q = query(
      collection(db, collectionName),
      orderBy('dateKey', 'desc'),
      limit(limitCount)
    );
    
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    
    const querySnapshot = await getDocs(q);
    const reports: AIDailyReport[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const reportDate = parseDateKey(data.dateKey);
      
      // Tarih aralığı kontrolü (sadece tarih kısmı, saat bilgisi olmadan)
      const reportDateOnly = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      if (reportDateOnly >= startDateOnly && reportDateOnly <= endDateOnly) {
        reports.push({
          date: data.date,
          summary: data.summary,
          highlights: data.highlights || [],
          warnings: data.warnings || [],
          recommendations: data.recommendations || []
        });
      }
    });
    
    // Tarihe göre sırala (en yeni önce) - dateKey'e göre sırala
    return reports.sort((a, b) => {
      const dateA = parseTRDate(a.date) || new Date();
      const dateB = parseTRDate(b.date) || new Date();
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Tarih aralığı rapor getirme hatası:', error);
    return [];
  }
};

// Son N günün raporlarını getir
export const getRecentCachedReports = async (
  days: number = 7,
  companyId?: string
): Promise<AIDailyReport[]> => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return getCachedReportsByDateRange(startDate, endDate, companyId, days);
};


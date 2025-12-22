import { collection, addDoc, deleteDoc, doc, getDocs, limit, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export type HealthStatus = 'ok' | 'warn' | 'fail';

export interface HealthCheckItem {
  key: string;
  status: HealthStatus;
  message: string;
  detail?: string;
}

export interface HealthReport {
  id?: string;
  status: HealthStatus;
  items: HealthCheckItem[];
  createdAt: Date;
  createdBy?: string;
  createdByName?: string;
}

const healthCollection = 'systemHealth';

const mergeStatus = (items: HealthCheckItem[]): HealthStatus => {
  if (items.some(i => i.status === 'fail')) return 'fail';
  if (items.some(i => i.status === 'warn')) return 'warn';
  return 'ok';
};

export const runHealthCheck = async (userId?: string, username?: string): Promise<HealthReport> => {
  const items: HealthCheckItem[] = [];

  // Firestore write/read smoke test
  try {
    const tempRef = await addDoc(collection(db, 'healthChecks'), {
      createdAt: Timestamp.now(),
      userId: userId || null,
      username: username || null,
      note: 'health-check'
    });
    await deleteDoc(tempRef);
    items.push({ key: 'firestore_rw', status: 'ok', message: 'Firestore ok' });
  } catch (err: any) {
    items.push({ key: 'firestore_rw', status: 'fail', message: 'Firestore yaz/oku hatası', detail: err?.message });
  }

  // Products temel alan kontrolü
  try {
    const snap = await getDocs(query(collection(db, 'products'), limit(1)));
    if (snap.empty) {
      items.push({ key: 'products_schema', status: 'warn', message: 'Ürün yok, şema doğrulanamadı' });
    } else {
      const data = snap.docs[0].data();
      if (data.sku && data.name && data.baseUnit) {
        items.push({ key: 'products_schema', status: 'ok', message: 'Ürün şema OK' });
      } else {
        items.push({ key: 'products_schema', status: 'warn', message: 'Ürün şemasında eksik zorunlu alanlar' });
      }
    }
  } catch (err: any) {
    items.push({ key: 'products_schema', status: 'fail', message: 'Ürün şema kontrol hatası', detail: err?.message });
  }

  // Personnel temel alan kontrolü
  try {
    const snap = await getDocs(query(collection(db, 'personnel'), limit(1)));
    if (snap.empty) {
      items.push({ key: 'personnel_schema', status: 'warn', message: 'Personel yok, şema doğrulanamadı' });
    } else {
      const data = snap.docs[0].data();
      if (data.name && data.department) {
        items.push({ key: 'personnel_schema', status: 'ok', message: 'Personel şema OK' });
      } else {
        items.push({ key: 'personnel_schema', status: 'warn', message: 'Personel şemasında eksik zorunlu alanlar' });
      }
    }
  } catch (err: any) {
    items.push({ key: 'personnel_schema', status: 'fail', message: 'Personel şema kontrol hatası', detail: err?.message });
  }

  // Hata logları son 24 saat
  try {
    const since = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const snap = await getDocs(query(collection(db, 'errorLogs'), where('timestamp', '>=', since)));
    items.push({
      key: 'error_logs',
      status: snap.size > 0 ? 'warn' : 'ok',
      message: snap.size > 0 ? `Son 24s içinde ${snap.size} hata logu` : 'Son 24s hata logu yok'
    });
  } catch (err: any) {
    items.push({ key: 'error_logs', status: 'fail', message: 'Hata logları okunamadı', detail: err?.message });
  }

  const status = mergeStatus(items);
  const report: HealthReport = {
    status,
    items,
    createdAt: new Date(),
    createdBy: userId,
    createdByName: username
  };

  // Kaydet
  try {
    await addDoc(collection(db, healthCollection), {
      ...report,
      createdAt: Timestamp.fromDate(report.createdAt)
    });
  } catch (err) {
    // kayıt hatası sessiz geçilir
    console.warn('[systemHealth] rapor kaydedilemedi', err);
  }

  return report;
};

export const getLatestHealthReport = async (): Promise<HealthReport | null> => {
  try {
    const snap = await getDocs(query(collection(db, healthCollection), limit(1)));
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      status: data.status,
      items: data.items || [],
      createdAt: data.createdAt?.toDate?.() || new Date(),
      createdBy: data.createdBy,
      createdByName: data.createdByName
    };
  } catch (err) {
    console.warn('[systemHealth] latest rapor okunamadı', err);
    return null;
  }
};


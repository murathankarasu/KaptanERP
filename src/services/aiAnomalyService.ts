import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  where,
  Timestamp,
  updateDoc,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface AIAnomalyAlert {
  id?: string;
  companyId?: string;
  createdAt: Date;
  createdBy?: string;
  title: string;
  summary: string;
  severity: 'low' | 'medium' | 'high';
  evidence?: string[];
  relatedUsers?: string[];
  relatedModules?: string[];
  status: 'open' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: Date;
}

const collectionName = 'aiAnomalyAlerts';
const scansCollection = 'aiAnomalyScans';

export const addAIAnomalyAlert = async (
  alert: Omit<AIAnomalyAlert, 'id' | 'createdAt' | 'status'>
): Promise<string> => {
  const payload: any = {
    title: alert.title,
    summary: alert.summary,
    severity: alert.severity,
    createdAt: Timestamp.now(),
    status: 'open'
  };

  if (alert.companyId !== undefined) payload.companyId = alert.companyId;
  if (alert.createdBy !== undefined) payload.createdBy = alert.createdBy;
  if (alert.evidence !== undefined) payload.evidence = alert.evidence;
  if (alert.relatedUsers !== undefined) payload.relatedUsers = alert.relatedUsers;
  if (alert.relatedModules !== undefined) payload.relatedModules = alert.relatedModules;

  const docRef = await addDoc(collection(db, collectionName), payload);
  return docRef.id;
};

export const getAIAnomalyAlerts = async (filters?: {
  companyId?: string;
  status?: 'open' | 'resolved';
  limit?: number;
}): Promise<AIAnomalyAlert[]> => {
  let q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
  if (filters?.companyId) {
    q = query(q, where('companyId', '==', filters.companyId));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  const querySnapshot = await getDocs(q);
  let alerts = querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    resolvedAt: docSnap.data().resolvedAt?.toDate()
  })) as AIAnomalyAlert[];

  if (filters?.limit) {
    alerts = alerts.slice(0, filters.limit);
  }
  return alerts;
};

export const resolveAIAnomalyAlert = async (id: string, resolvedBy?: string) => {
  await updateDoc(doc(db, collectionName, id), {
    status: 'resolved',
    resolvedBy: resolvedBy || null,
    resolvedAt: Timestamp.now()
  });
};

export const getAIAnomalyScanState = async (companyId?: string) => {
  const key = companyId || 'global';
  const snap = await getDoc(doc(db, scansCollection, key));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    companyId: data.companyId || companyId || 'global',
    lastScanAt: data.lastScanAt?.toDate?.() || null
  };
};

export const setAIAnomalyScanState = async (companyId?: string) => {
  const key = companyId || 'global';
  await setDoc(doc(db, scansCollection, key), {
    companyId: companyId || null,
    lastScanAt: Timestamp.now()
  });
};

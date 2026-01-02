import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface BOMItem {
  materialName: string;
  quantity: number;
  unit: string;
  type: 'raw' | 'semi' | 'labor';
  costPerUnit?: number;
}

export interface BOM {
  id?: string;
  productName: string;
  sku?: string;
  version?: string;
  items: BOMItem[];
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductionOrder {
  id?: string;
  orderNumber: string;
  productName: string;
  quantity: number;
  unit: string;
  bomId?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  workstation?: string;
  plannedDate?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkLog {
  id?: string;
  productionOrderId: string;
  operatorId?: string;
  operatorName?: string;
  action: 'start' | 'stop' | 'complete';
  timestamp: Date;
  note?: string;
  companyId?: string;
}

const bomCol = 'boms';
const prodCol = 'productionOrders';
const logCol = 'workLogs';

const cleanDeep = (value: any): any => {
  if (Array.isArray(value)) {
    return value
      .map(cleanDeep)
      .filter((v) => v !== undefined);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanDeep(v)])
    );
  }
  return value;
};

const withTimestamps = <T extends Record<string, any>>(payload: T) => ({
  ...cleanDeep(payload),
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
});

export const addBOM = async (bom: Omit<BOM, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, bomCol), withTimestamps(bom));
  return ref.id;
};

export const getBOMs = async (companyId?: string): Promise<BOM[]> => {
  let qRef = query(collection(db, bomCol), orderBy('productName', 'asc'));
  if (companyId) qRef = query(qRef, where('companyId', '==', companyId));
  const snap = await getDocs(qRef);
  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as BOM;
  });
};

export const updateBOM = async (id: string, bom: Partial<BOM>) => {
  const ref = doc(db, bomCol, id);
  await updateDoc(ref, { ...bom, updatedAt: Timestamp.now() });
};

export const deleteBOM = async (id: string) => {
  await deleteDoc(doc(db, bomCol, id));
};

export const addProductionOrder = async (po: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, prodCol), withTimestamps(po));
  return ref.id;
};

export const updateProductionOrder = async (id: string, po: Partial<ProductionOrder>) => {
  const ref = doc(db, prodCol, id);
  const payload: any = { ...po, updatedAt: Timestamp.now() };
  if (po.plannedDate) payload.plannedDate = Timestamp.fromDate(po.plannedDate);
  if (po.startedAt) payload.startedAt = Timestamp.fromDate(po.startedAt);
  if (po.finishedAt) payload.finishedAt = Timestamp.fromDate(po.finishedAt);
  await updateDoc(ref, payload);
};

export const getProductionOrders = async (companyId?: string): Promise<ProductionOrder[]> => {
  let qRef = query(collection(db, prodCol), orderBy('orderNumber', 'desc'));
  if (companyId) qRef = query(qRef, where('companyId', '==', companyId));
  const snap = await getDocs(qRef);
  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      plannedDate: data.plannedDate?.toDate(),
      startedAt: data.startedAt?.toDate(),
      finishedAt: data.finishedAt?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as ProductionOrder;
  });
};

export const addWorkLog = async (log: Omit<WorkLog, 'id'>) => {
  const ref = await addDoc(collection(db, logCol), {
    ...log,
    timestamp: Timestamp.fromDate(log.timestamp)
  });
  return ref.id;
};

export const getWorkLogs = async (productionOrderId: string): Promise<WorkLog[]> => {
  const qRef = query(collection(db, logCol), where('productionOrderId', '==', productionOrderId), orderBy('timestamp', 'desc'));
  const snap = await getDocs(qRef);
  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      timestamp: data.timestamp?.toDate()
    } as WorkLog;
  });
};


import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface BinLocation {
  id?: string;
  warehouseId: string;
  code: string; // raf/göz
  description?: string;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const collectionName = 'binLocations';

export const addBinLocation = async (bin: Omit<BinLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, collectionName), {
    ...bin,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const getBinLocations = async (warehouseId?: string, companyId?: string): Promise<BinLocation[]> => {
  let qRef = query(collection(db, collectionName));
  if (warehouseId) {
    qRef = query(qRef, where('warehouseId', '==', warehouseId));
  }
  if (companyId) {
    qRef = query(qRef, where('companyId', '==', companyId));
  }
  const snap = await getDocs(qRef);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate(),
    updatedAt: d.data().updatedAt?.toDate()
  })) as BinLocation[];
};

export const updateBinLocation = async (id: string, bin: Partial<BinLocation>) => {
  const ref = doc(db, collectionName, id);
  await updateDoc(ref, { ...bin, updatedAt: Timestamp.now() });
};

export const deleteBinLocation = async (id: string) => {
  const ref = doc(db, collectionName, id);
  await deleteDoc(ref);
};


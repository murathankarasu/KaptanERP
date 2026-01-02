import { 
  collection, 
  addDoc, 
  getDocs, 
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Warehouse {
  id?: string;
  name: string;
  description?: string;
  location?: string;
  companyId?: string; // Şirket ID'si
  createdAt?: Date;
  updatedAt?: Date;
}

const collectionName = 'warehouses';

export const addWarehouse = async (warehouse: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...warehouse,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Depo eklenirken hata:', error);
    throw error;
  }
};

export const getWarehouses = async (companyId?: string): Promise<Warehouse[]> => {
  try {
    let q = query(collection(db, collectionName), orderBy('name', 'asc'));
    
    // CompanyId filtresi (multi-tenant için)
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Warehouse[];
  } catch (error) {
    console.error('Depo listesi yüklenirken hata:', error);
    throw error;
  }
};

export const updateWarehouse = async (id: string, warehouse: Partial<Warehouse>): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...warehouse,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Depo güncellenirken hata:', error);
    throw error;
  }
};

export const deleteWarehouse = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Depo silinirken hata:', error);
    throw error;
  }
};


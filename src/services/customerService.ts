import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Customer {
  id?: string;
  name: string;
  companyName?: string;
  taxNumber?: string;
  taxOffice?: string;
  address?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  creditLimit?: number;
  balance?: number;
  notes?: string;
  group?: string;
  companyId?: string; // Şirket ID'si
  createdAt?: Date;
  updatedAt?: Date;
}

const collectionName = 'customers';

export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...customer,
      balance: customer.balance || 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Müşteri eklenirken hata:', error);
    throw error;
  }
};

export const getCustomers = async (companyId?: string): Promise<Customer[]> => {
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
      balance: doc.data().balance || 0,
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Customer[];
  } catch (error) {
    console.error('Müşteri listesi yüklenirken hata:', error);
    throw error;
  }
};

export const updateCustomer = async (id: string, customer: Partial<Customer>): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...customer,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Müşteri güncellenirken hata:', error);
    throw error;
  }
};

export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Müşteri silinirken hata:', error);
    throw error;
  }
};

export const getCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as Customer;
  } catch (error) {
    console.error('Müşteri getirilirken hata:', error);
    return null;
  }
};


import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, Timestamp, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Company {
  id?: string;
  name: string;
  code?: string; // Optional, can be generated
  description?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const companiesCollection = 'companies';

export const getCompanyById = async (id: string): Promise<Company | null> => {
  const docRef = doc(db, companiesCollection, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    id: snap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt
  } as Company;
};

export const addCompany = async (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, companiesCollection), {
    ...company,
    isActive: company.isActive ?? true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
};

export const getCompanies = async (): Promise<Company[]> => {
  const q = query(collection(db, companiesCollection), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() ?? doc.data().createdAt,
    updatedAt: doc.data().updatedAt?.toDate?.() ?? doc.data().updatedAt
  })) as Company[];
};

export const getCompanyByCode = async (code: string): Promise<Company | null> => {
  const q = query(collection(db, companiesCollection), where('code', '==', code));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.() ?? docSnap.data().createdAt,
      updatedAt: docSnap.data().updatedAt?.toDate?.() ?? docSnap.data().updatedAt
    } as Company;
  }
  return null;
};

export const getCompanyByName = async (name: string): Promise<Company | null> => {
  const q = query(collection(db, companiesCollection), where('name', '==', name));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.() ?? docSnap.data().createdAt,
      updatedAt: docSnap.data().updatedAt?.toDate?.() ?? docSnap.data().updatedAt
    } as Company;
  }
  return null;
};

export const updateCompany = async (id: string, company: Partial<Omit<Company, 'id' | 'createdAt'>>): Promise<void> => {
  const docRef = doc(db, companiesCollection, id);
  await updateDoc(docRef, {
    ...company,
    updatedAt: Timestamp.now()
  });
};

export const deleteCompany = async (id: string): Promise<void> => {
  const docRef = doc(db, companiesCollection, id);
  await deleteDoc(docRef);
};
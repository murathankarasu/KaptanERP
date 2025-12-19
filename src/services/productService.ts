import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface ProductVariant {
  color?: string;
  size?: string;
  attributes?: Record<string, string>;
}

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number; // fromUnit * factor = toUnit quantity
}

export interface Product {
  id?: string;
  sku: string;
  name: string;
  category?: string;
  baseUnit: string;
  units?: UnitConversion[];
  barcode?: string;
  variant?: ProductVariant;
  lotTracking?: boolean;
  expiryRequired?: boolean;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const collectionName = 'products';

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...product,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
};

export const getProducts = async (companyId?: string): Promise<Product[]> => {
  let qRef = query(collection(db, collectionName));
  if (companyId) {
    qRef = query(qRef, where('companyId', '==', companyId));
  }
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate(),
    updatedAt: d.data().updatedAt?.toDate()
  })) as Product[];
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  const ref = doc(db, collectionName, id);
  await updateDoc(ref, {
    ...product,
    updatedAt: Timestamp.now()
  });
};

export const deleteProduct = async (id: string) => {
  const ref = doc(db, collectionName, id);
  await deleteDoc(ref);
};


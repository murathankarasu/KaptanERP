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
  sku?: string;
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

// Firestore add/update undefined alanları kabul etmiyor; temizleyici
const cleanPayload = (obj: Record<string, any>) => {
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value === undefined) {
      delete obj[key];
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      cleanPayload(value);
      // alt obje tamamen boş kaldıysa sil
      if (Object.keys(value).length === 0) {
        delete obj[key];
      }
    }
  });
  return obj;
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const payload = cleanPayload({
    ...product,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  const docRef = await addDoc(collection(db, collectionName), payload);
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
  const payload = cleanPayload({
    ...product,
    updatedAt: Timestamp.now()
  });
  await updateDoc(ref, payload);
};

export const deleteProduct = async (id: string) => {
  const ref = doc(db, collectionName, id);
  await deleteDoc(ref);
};


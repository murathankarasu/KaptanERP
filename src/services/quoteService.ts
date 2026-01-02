import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface QuoteItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  currency?: string;
  exchangeRate?: number;
}

export interface Quote {
  id?: string;
  quoteNumber: string;
  quoteDate: Date;
  customerId?: string;
  customerName?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  items: QuoteItem[];
  totalAmount: number;
  notes?: string;
  currency?: string;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const collectionName = 'quotes';

export const addQuote = async (quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, collectionName), {
    ...quote,
    quoteDate: Timestamp.fromDate(quote.quoteDate),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const getQuotes = async (companyId?: string): Promise<Quote[]> => {
  let qRef = query(collection(db, collectionName), orderBy('quoteDate', 'desc'));
  if (companyId) {
    qRef = query(qRef, where('companyId', '==', companyId));
  }
  const snap = await getDocs(qRef);
  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      quoteDate: data.quoteDate?.toDate ? data.quoteDate.toDate() : data.quoteDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as Quote;
  });
};

export const updateQuote = async (id: string, quote: Partial<Quote>) => {
  const ref = doc(db, collectionName, id);
  const payload: any = { ...quote, updatedAt: Timestamp.now() };
  if (quote.quoteDate) payload.quoteDate = Timestamp.fromDate(quote.quoteDate);
  await updateDoc(ref, payload);
};

export const deleteQuote = async (id: string) => {
  const ref = doc(db, collectionName, id);
  await deleteDoc(ref);
};


import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface InvoiceItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate?: number;
  discountPercent?: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  date: Date;
  customerId?: string;
  customerName?: string;
  currency: string;
  totalAmount: number;
  status: 'draft' | 'issued' | 'paid';
  items: InvoiceItem[];
  shipmentId?: string;
  shipmentNumber?: string;
  orderId?: string;
  orderNumber?: string;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const col = 'invoices';

export const addInvoice = async (inv: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, col), {
    ...inv,
    date: Timestamp.fromDate(inv.date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const getInvoices = async (companyId?: string): Promise<Invoice[]> => {
  let qRef = query(collection(db, col), orderBy('date', 'desc'));
  if (companyId) qRef = query(qRef, where('companyId', '==', companyId));
  const snap = await getDocs(qRef);
  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate() : data.date,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as Invoice;
  });
};

export const updateInvoice = async (id: string, inv: Partial<Invoice>) => {
  const ref = doc(db, col, id);
  const payload: any = { ...inv, updatedAt: Timestamp.now() };
  if (inv.date) payload.date = Timestamp.fromDate(inv.date);
  await updateDoc(ref, payload);
};


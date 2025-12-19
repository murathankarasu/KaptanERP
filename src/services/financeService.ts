import {
  collection,
  addDoc,
  runTransaction,
  doc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export type JournalSide = 'debit' | 'credit';

export interface JournalLine {
  accountCode: string;
  amount: number;
  currency?: string;
  exchangeRate?: number; // 1 base currency = exchangeRate * currency
  side: JournalSide;
  description?: string;
}

export interface JournalEntry {
  id?: string;
  date: Date;
  description: string;
  companyId?: string;
  baseCurrency?: string;
  lines: JournalLine[];
  referenceType?: string;
  referenceId?: string;
  createdAt?: Date;
}

const JOURNAL_COLLECTION = 'journalEntries';
const CUSTOMERS_COLLECTION = 'customers';
const CUSTOMER_TX_COLLECTION = 'customerTransactions';

export type CustomerTxType = 'charge' | 'payment';

export interface CustomerTransaction {
  id?: string;
  customerId: string;
  companyId?: string;
  date: Date;
  type: CustomerTxType;
  amount: number; // charge: +, payment: -
  currency?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt?: Date;
}

/**
 * Genel günlük kaydı ekler.
 */
export const addJournalEntry = async (
  entry: Omit<JournalEntry, 'id' | 'createdAt'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), {
    ...entry,
    date: Timestamp.fromDate(entry.date),
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getJournalEntries = async (params?: {
  companyId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<JournalEntry[]> => {
  const { companyId, startDate, endDate, limit = 200 } = params || {};
  let qRef = query(collection(db, JOURNAL_COLLECTION), orderBy('date', 'desc'));
  if (companyId) {
    qRef = query(qRef, where('companyId', '==', companyId));
  }
  if (startDate) {
    qRef = query(qRef, where('date', '>=', Timestamp.fromDate(startDate)));
  }
  if (endDate) {
    qRef = query(qRef, where('date', '<=', Timestamp.fromDate(endDate)));
  }
  const snapshot = await getDocs(qRef);
  const entries = snapshot.docs.slice(0, limit).map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate() : data.date,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
    } as JournalEntry;
  });
  return entries;
};

/**
 * Müşteri hareketi kaydı oluşturur.
 */
const addCustomerTransaction = async (tx: Omit<CustomerTransaction, 'id' | 'createdAt'>) => {
  await addDoc(collection(db, CUSTOMER_TX_COLLECTION), {
    ...tx,
    date: tx.date,
    createdAt: serverTimestamp()
  });
};

/**
 * Müşteri bakiyesini (alacak bakiyesi) günceller.
 * amount > 0: müşteriye borç (satış / sevkiyat)
 * amount < 0: tahsilat / iade
 */
export const applyCustomerCharge = async (params: {
  customerId: string;
  amount: number;
  currency?: string;
  companyId?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<void> => {
  const {
    customerId,
    amount,
    currency = 'TRY',
    companyId,
    description,
    referenceType,
    referenceId
  } = params;

  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(customerRef);
    if (!snap.exists()) {
      throw new Error('Müşteri bulunamadı');
    }
    const data = snap.data() as any;
    const currentBalance = data.balance || 0;
    const newBalance = currentBalance + amount;

    transaction.update(customerRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });
  });

  await addCustomerTransaction({
    customerId,
    companyId,
    date: new Date(),
    type: 'charge',
    amount,
    currency,
    description: description || 'Müşteri hareketi',
    referenceType,
    referenceId
  });

  // Basit günlük kaydı
  await addJournalEntry({
    date: new Date(),
    description: description || 'Müşteri hareketi',
    companyId,
    referenceType,
    referenceId,
    lines: [
      {
        accountCode: '120', // Alıcılar
        amount: Math.abs(amount),
        currency,
        side: amount >= 0 ? 'debit' : 'credit',
        description: 'Müşteri cari'
      },
      {
        accountCode: '600', // Satışlar varsayılan
        amount: Math.abs(amount),
        currency,
        side: amount >= 0 ? 'credit' : 'debit',
        description: 'Satış gelirleri'
      }
    ]
  });
};

export const getCustomerBalance = async (customerId: string): Promise<number> => {
  const ref = doc(db, CUSTOMERS_COLLECTION, customerId);
  const snap = await import('firebase/firestore').then(({ getDoc }) => getDoc(ref));
  if (!snap.exists()) return 0;
  const data = snap.data() as any;
  return data.balance || 0;
};

/**
 * Tahsilat uygular: bakiyeyi düşürür, günlük kaydı ekler.
 */
export const applyCustomerPayment = async (params: {
  customerId: string;
  amount: number; // tahsil edilen tutar
  currency?: string;
  companyId?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<void> => {
  const {
    customerId,
    amount,
    currency = 'TRY',
    companyId,
    description,
    referenceType,
    referenceId
  } = params;

  if (amount <= 0) {
    throw new Error('Tahsilat tutarı pozitif olmalıdır');
  }

  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(customerRef);
    if (!snap.exists()) {
      throw new Error('Müşteri bulunamadı');
    }
    const data = snap.data() as any;
    const currentBalance = data.balance || 0;
    const newBalance = currentBalance - amount;

    transaction.update(customerRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });
  });

  await addCustomerTransaction({
    customerId,
    companyId,
    date: new Date(),
    type: 'payment',
    amount: -amount,
    currency,
    description: description || 'Tahsilat',
    referenceType,
    referenceId
  });

  await addJournalEntry({
    date: new Date(),
    description: description || 'Tahsilat',
    companyId,
    referenceType,
    referenceId,
    lines: [
      {
        accountCode: '102', // Banka varsayımı
        amount,
        currency,
        side: 'debit',
        description: 'Banka tahsilat'
      },
      {
        accountCode: '120', // Alıcılar
        amount,
        currency,
        side: 'credit',
        description: 'Cari kapama'
      }
    ]
  });
};

/**
 * Müşteri işlemlerini getirir (tarih desc).
 */
export const getCustomerTransactions = async (params: {
  customerId: string;
  companyId?: string;
}): Promise<CustomerTransaction[]> => {
  const { customerId, companyId } = params;
  let qRef = query(
    collection(db, CUSTOMER_TX_COLLECTION),
    where('customerId', '==', customerId),
    orderBy('date', 'desc')
  );
  if (companyId) {
    qRef = query(
      collection(db, CUSTOMER_TX_COLLECTION),
      where('customerId', '==', customerId),
      where('companyId', '==', companyId),
      orderBy('date', 'desc')
    );
  }
  const snapshot = await getDocs(qRef);
  return snapshot.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate() : data.date,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
    } as CustomerTransaction;
  });
};

/**
 * Basit yaşlandırma (0-30 / 31-60 / 61-90 / 90+).
 * amount pozitif: alacak; negatif: tahsilat.
 */
export const getCustomerAging = async (params: {
  customerId: string;
  asOf?: Date;
  companyId?: string;
}): Promise<{
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90plus: number;
  total: number;
}> => {
  const { customerId, companyId, asOf = new Date() } = params;
  const txs = await getCustomerTransactions({ customerId, companyId });
  const buckets = {
    bucket0_30: 0,
    bucket31_60: 0,
    bucket61_90: 0,
    bucket90plus: 0,
    total: 0
  };
  txs.forEach((tx) => {
    const diffDays = Math.floor((asOf.getTime() - tx.date.getTime()) / (1000 * 60 * 60 * 24));
    const amt = tx.amount;
    if (diffDays <= 30) buckets.bucket0_30 += amt;
    else if (diffDays <= 60) buckets.bucket31_60 += amt;
    else if (diffDays <= 90) buckets.bucket61_90 += amt;
    else buckets.bucket90plus += amt;
    buckets.total += amt;
  });
  return buckets;
};


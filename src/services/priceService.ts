import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface PriceRule {
  id?: string;
  sku?: string;
  materialName: string;
  customerId?: string;
  customerGroup?: string;
  price: number;
  currency: string;
  discountPercent?: number;
  minQuantity?: number;
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const collectionName = 'priceRules';

const toTimestamp = (d?: Date) => (d ? Timestamp.fromDate(d) : undefined);

export const addPriceRule = async (rule: Omit<PriceRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const ref = await addDoc(collection(db, collectionName), {
    ...rule,
    startDate: toTimestamp(rule.startDate),
    endDate: toTimestamp(rule.endDate),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const getPriceRules = async (companyId?: string): Promise<PriceRule[]> => {
  let qRef = query(collection(db, collectionName));
  if (companyId) {
    qRef = query(qRef, where('companyId', '==', companyId));
  }
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
      endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as PriceRule;
  });
};

// Öncelik: 1) müşteri eşleşmesi 2) grup eşleşmesi 3) genel kural
// Tarih aralığı: startDate <= today <= endDate (tanımlıysa)
export const selectPriceRule = (
  materialName: string,
  customerId: string | undefined,
  customerGroup: string | undefined,
  rules: PriceRule[],
  quantity?: number,
  currency?: string
): PriceRule | undefined => {
  const today = new Date();
  const inRange = (r: PriceRule) => {
    const startOk = r.startDate ? r.startDate <= today : true;
    const endOk = r.endDate ? r.endDate >= today : true;
    return startOk && endOk;
  };

  const filterWith = (ignoreMinQty: boolean) =>
    rules.filter(r => {
      const qtyOk = r.minQuantity ? (!!quantity && quantity >= r.minQuantity) : true;
      const curOk = currency ? r.currency === currency : true;
      return r.materialName === materialName && inRange(r) && (ignoreMinQty ? curOk : (qtyOk && curOk));
    });

  const pickByPriority = (candidates: PriceRule[]) => {
    const ranked = candidates
      .map(r => {
        const priority = r.customerId
          ? 1
          : r.customerGroup
            ? 2
            : 3;
        return { r, priority };
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const aStart = a.r.startDate ? a.r.startDate.getTime() : 0;
        const bStart = b.r.startDate ? b.r.startDate.getTime() : 0;
        return bStart - aStart;
      });
    for (const { r } of ranked) {
      if (r.customerId && customerId && r.customerId === customerId) return r;
      if (r.customerGroup && customerGroup && r.customerGroup === customerGroup) return r;
      if (!r.customerId && !r.customerGroup) return r;
    }
    return undefined;
  };

  // Önce minQuantity şartını sağlayanları dene, yoksa fallback (minQuantity göz ardı)
  return pickByPriority(filterWith(false)) || pickByPriority(filterWith(true));
};

export const updatePriceRule = async (id: string, rule: Partial<PriceRule>) => {
  const ref = doc(db, collectionName, id);
  const payload: any = { ...rule, updatedAt: Timestamp.now() };
  if (rule.startDate) payload.startDate = toTimestamp(rule.startDate);
  if (rule.endDate) payload.endDate = toTimestamp(rule.endDate);
  await updateDoc(ref, payload);
};

export const deletePriceRule = async (id: string) => {
  const ref = doc(db, collectionName, id);
  await deleteDoc(ref);
};


import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export type RequisitionStatus = 'draft' | 'approved' | 'rejected' | 'converted';
export type RFQStatus = 'open' | 'quoted' | 'closed';
export type POStatus = 'pending' | 'issued' | 'received' | 'billed' | 'closed';
export type GRNStatus = 'pending' | 'accepted' | 'rejected';

export interface RequisitionItem {
  materialName: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface Requisition {
  id?: string;
  reqNumber: string;
  requestDate: Date;
  requestedBy?: string;
  status: RequisitionStatus;
  items: RequisitionItem[];
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RFQ {
  id?: string;
  rfqNumber: string;
  suppliers: string[];
  dueDate: Date;
  items: RequisitionItem[];
  status: RFQStatus;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PurchaseOrder {
  id?: string;
  poNumber: string;
  supplier: string;
  orderDate: Date;
  items: RequisitionItem[];
  status: POStatus;
  totalAmount?: number;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GoodsReceipt {
  id?: string;
  grnNumber: string;
  poId?: string;
  receiptDate: Date;
  items: Array<RequisitionItem & { acceptedQty?: number }>;
  status: GRNStatus;
  warehouse?: string;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const reqCol = 'requisitions';
const rfqCol = 'rfqs';
const poCol = 'purchaseOrders';
const grnCol = 'goodsReceipts';

const toTimestamp = (d?: Date) => (d ? Timestamp.fromDate(d) : undefined);

export const addRequisition = async (req: Omit<Requisition, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, reqCol), {
    ...req,
    requestDate: toTimestamp(req.requestDate),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const getRequisitions = async (companyId?: string): Promise<Requisition[]> => {
  let qRef = query(collection(db, reqCol));
  if (companyId) qRef = query(qRef, where('companyId', '==', companyId));
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      requestDate: data.requestDate?.toDate ? data.requestDate.toDate() : data.requestDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as Requisition;
  });
};

export const updateRequisition = async (id: string, payload: Partial<Requisition>) => {
  const ref = doc(db, reqCol, id);
  const data: any = { ...payload, updatedAt: Timestamp.now() };
  if (payload.requestDate) data.requestDate = toTimestamp(payload.requestDate);
  await updateDoc(ref, data);
};

export const addRFQ = async (rfq: Omit<RFQ, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, rfqCol), {
    ...rfq,
    dueDate: toTimestamp(rfq.dueDate),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const updateRFQ = async (id: string, rfq: Partial<RFQ>) => {
  const ref = doc(db, rfqCol, id);
  const data: any = { ...rfq, updatedAt: Timestamp.now() };
  if (rfq.dueDate) data.dueDate = toTimestamp(rfq.dueDate);
  await updateDoc(ref, data);
};

export const getRFQs = async (companyId?: string): Promise<RFQ[]> => {
  let qRef = query(collection(db, rfqCol));
  if (companyId) qRef = query(qRef, where('companyId', '==', companyId));
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : data.dueDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as RFQ;
  });
};

export const addPurchaseOrder = async (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, poCol), {
    ...po,
    orderDate: toTimestamp(po.orderDate),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const getPurchaseOrders = async (companyId?: string): Promise<PurchaseOrder[]> => {
  let qRef = query(collection(db, poCol));
  if (companyId) qRef = query(qRef, where('companyId', '==', companyId));
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      orderDate: data.orderDate?.toDate ? data.orderDate.toDate() : data.orderDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as PurchaseOrder;
  });
};

export const updatePurchaseOrder = async (id: string, payload: Partial<PurchaseOrder>) => {
  const ref = doc(db, poCol, id);
  const data: any = { ...payload, updatedAt: Timestamp.now() };
  if (payload.orderDate) data.orderDate = toTimestamp(payload.orderDate);
  await updateDoc(ref, data);
};

export const addGoodsReceipt = async (grn: Omit<GoodsReceipt, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, grnCol), {
    ...grn,
    receiptDate: toTimestamp(grn.receiptDate),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const getGoodsReceipts = async (companyId?: string): Promise<GoodsReceipt[]> => {
  let qRef = query(collection(db, grnCol));
  if (companyId) qRef = query(qRef, where('companyId', '==', companyId));
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      receiptDate: data.receiptDate?.toDate ? data.receiptDate.toDate() : data.receiptDate,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as GoodsReceipt;
  });
};

export const updateGoodsReceipt = async (id: string, payload: Partial<GoodsReceipt>) => {
  const ref = doc(db, grnCol, id);
  const data: any = { ...payload, updatedAt: Timestamp.now() };
  if (payload.receiptDate) data.receiptDate = toTimestamp(payload.receiptDate);
  await updateDoc(ref, data);
};


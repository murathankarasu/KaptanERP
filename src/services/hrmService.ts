import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface LeaveRequest {
  id?: string;
  personnelId: string;
  personnelName?: string;
  startDate: Date;
  endDate: Date;
  type: 'annual' | 'sick' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  days: number;
  note?: string;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PayrollInput {
  personnelId: string;
  personnelName?: string;
  gross: number;
  sgkPercent?: number; // default 14
  unemploymentPercent?: number; // default 1
  besPercent?: number; // default 3
  taxPercent?: number; // default 20
  garnishment?: number; // icra
}

export interface PayrollResult {
  net: number;
  sgk: number;
  unemployment: number;
  bes: number;
  tax: number;
  garnishment: number;
  gross: number;
}

const leaveCol = 'leaveRequests';

export const addLeaveRequest = async (leave: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, leaveCol), {
    ...leave,
    startDate: Timestamp.fromDate(leave.startDate),
    endDate: Timestamp.fromDate(leave.endDate),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const getLeaveRequests = async (companyId?: string): Promise<LeaveRequest[]> => {
  let qRef = query(collection(db, leaveCol), orderBy('startDate', 'desc'));
  if (companyId) qRef = query(qRef, where('companyId', '==', companyId));
  const snap = await getDocs(qRef);
  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      startDate: data.startDate?.toDate(),
      endDate: data.endDate?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as LeaveRequest;
  });
};

export const updateLeaveRequest = async (id: string, leave: Partial<LeaveRequest>) => {
  const ref = doc(db, leaveCol, id);
  const payload: any = { ...leave, updatedAt: Timestamp.now() };
  if (leave.startDate) payload.startDate = Timestamp.fromDate(leave.startDate);
  if (leave.endDate) payload.endDate = Timestamp.fromDate(leave.endDate);
  await updateDoc(ref, payload);
};

export const deleteLeaveRequest = async (id: string) => {
  await deleteDoc(doc(db, leaveCol, id));
};

export const calculatePayroll = (input: PayrollInput): PayrollResult => {
  const sgkRate = input.sgkPercent ?? 14;
  const unempRate = input.unemploymentPercent ?? 1;
  const besRate = input.besPercent ?? 3;
  const taxRate = input.taxPercent ?? 20;
  const garn = input.garnishment ?? 0;

  const sgk = input.gross * (sgkRate / 100);
  const unemp = input.gross * (unempRate / 100);
  const bes = input.gross * (besRate / 100);
  const taxBase = input.gross - sgk - unemp - bes;
  const tax = taxBase * (taxRate / 100);

  const net = input.gross - sgk - unemp - bes - tax - garn;
  return { net, sgk, unemployment: unemp, bes, tax, garnishment: garn, gross: input.gross };
};


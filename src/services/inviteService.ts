import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface InviteCode {
  id?: string;
  code: string;
  companyId: string;
  companyName?: string;
  role: 'manager' | 'user';
  isActive: boolean;
  createdBy?: string;
  usedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const col = 'inviteCodes';

export const addInviteCode = async (invite: Omit<InviteCode, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, col), {
    ...invite,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return ref.id;
};

export const getInviteByCode = async (code: string): Promise<InviteCode | null> => {
  const qRef = query(collection(db, col), where('code', '==', code), where('isActive', '==', true));
  const snap = await getDocs(qRef);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data() as any;
  return {
    id: d.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
  } as InviteCode;
};

export const getInviteCodes = async (): Promise<InviteCode[]> => {
  const snap = await getDocs(query(collection(db, col), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as InviteCode;
  });
};

export const consumeInvite = async (id: string, usedBy: string) => {
  const ref = doc(db, col, id);
  await updateDoc(ref, {
    isActive: false,
    usedBy,
    updatedAt: Timestamp.now()
  });
};


import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Order {
  id?: string;
  orderNumber: string;
  orderDate: Date;
  customerId?: string;
  customerName?: string;
  supplier?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  items: OrderItem[];
  totalAmount?: number;
  notes?: string;
  companyId?: string; // Şirket ID'si
   currency?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  currency?: string;
  exchangeRate?: number;
}

const collectionName = 'orders';

export const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...order,
      orderDate: Timestamp.fromDate(order.orderDate),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Sipariş eklenirken hata:', error);
    throw error;
  }
};

export const getOrders = async (filters?: {
  status?: string;
  supplier?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
}): Promise<Order[]> => {
  try {
    let q = query(collection(db, collectionName), orderBy('orderDate', 'desc'));
    
    // CompanyId filtresi (zorunlu - multi-tenant için)
    if (filters?.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }
    
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    if (filters?.supplier) {
      q = query(q, where('supplier', '==', filters.supplier));
    }
    if (filters?.customerId) {
      q = query(q, where('customerId', '==', filters.customerId));
    }
    
    if (filters?.startDate) {
      q = query(q, where('orderDate', '>=', Timestamp.fromDate(filters.startDate)));
    }
    
    if (filters?.endDate) {
      q = query(q, where('orderDate', '<=', Timestamp.fromDate(filters.endDate)));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      orderDate: doc.data().orderDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Order[];
  } catch (error) {
    console.error('Sipariş listesi yüklenirken hata:', error);
    throw error;
  }
};

export const updateOrder = async (id: string, order: Partial<Order>): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    const updateData: any = {
      ...order,
      updatedAt: Timestamp.now()
    };
    
    if (order.orderDate) {
      updateData.orderDate = Timestamp.fromDate(order.orderDate);
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Sipariş güncellenirken hata:', error);
    throw error;
  }
};


import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface ShipmentItem {
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  discountPercent?: number;
  listPrice?: number;
  priceRuleNote?: string;
  vatRate?: number;
  currency?: string;
  exchangeRate?: number;
  warehouse?: string;
  sku?: string;
  variant?: string;
  binCode?: string;
  serialLot?: string;
  expiryDate?: Date;
}

export interface Shipment {
  id?: string;
  shipmentNumber: string;
  shipmentDate: Date;
  customerId: string;
  customerName: string;
  items: ShipmentItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  warehouse?: string;
  orderId?: string;
  orderNumber?: string;
  quoteId?: string;
  quoteNumber?: string;
  currency?: string;
  companyId?: string; // Şirket ID'si
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const collectionName = 'shipments';

export const addShipment = async (shipment: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...shipment,
      shipmentDate: Timestamp.fromDate(shipment.shipmentDate),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Sevkiyat eklenirken hata:', error);
    throw error;
  }
};

export const getShipments = async (filters?: {
  companyId?: string;
  customerId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<Shipment[]> => {
  try {
    let q = query(collection(db, collectionName), orderBy('shipmentDate', 'desc'));
    
    // CompanyId filtresi (multi-tenant için)
    if (filters?.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }
    
    if (filters?.customerId) {
      q = query(q, where('customerId', '==', filters.customerId));
    }
    
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    const querySnapshot = await getDocs(q);
    const shipments: Shipment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const shipment: Shipment = {
        id: doc.id,
        shipmentNumber: data.shipmentNumber,
        shipmentDate: data.shipmentDate.toDate(),
        customerId: data.customerId,
        customerName: data.customerName,
        items: data.items,
        totalAmount: data.totalAmount,
        status: data.status,
        notes: data.notes,
        warehouse: data.warehouse,
        companyId: data.companyId,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
      
      // Tarih filtreleme (client-side)
      if (filters?.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (shipment.shipmentDate < start) return;
      }
      if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (shipment.shipmentDate > end) return;
      }
      
      shipments.push(shipment);
    });
    
    return shipments;
  } catch (error) {
    console.error('Sevkiyat listesi yüklenirken hata:', error);
    throw error;
  }
};

export const updateShipmentStatus = async (id: string, status: Shipment['status']): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Sevkiyat durumu güncellenirken hata:', error);
    throw error;
  }
};

export const getShipmentById = async (id: string): Promise<Shipment | null> => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      shipmentNumber: data.shipmentNumber,
      shipmentDate: data.shipmentDate.toDate(),
      customerId: data.customerId,
      customerName: data.customerName,
      items: data.items,
      totalAmount: data.totalAmount,
      status: data.status,
      notes: data.notes,
      warehouse: data.warehouse,
      currency: data.currency,
      companyId: data.companyId,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as Shipment;
  } catch (error) {
    console.error('Sevkiyat getirilirken hata:', error);
    return null;
  }
};

// Sevkiyat numarası oluştur
export const generateShipmentNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SEV-${year}${month}${day}-${random}`;
};


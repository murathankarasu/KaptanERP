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

export interface StockEntry {
  id?: string;
  arrivalDate: Date;
  materialName: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
  note?: string;
  createdAt?: Date;
}

export interface StockOutput {
  id?: string;
  issueDate: Date;
  employee: string;
  department: string;
  materialName: string;
  quantity: number;
  issuedBy: string;
  description?: string;
  createdAt?: Date;
}

export interface StockStatus {
  id?: string;
  materialName: string;
  totalEntry: number;
  totalOutput: number;
  currentStock: number;
  criticalLevel: number;
  status: 'green' | 'orange' | 'red';
  unit: string;
}

// Stok Giriş Ekleme
export const addStockEntry = async (entry: StockEntry): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'stockEntries'), {
      ...entry,
      arrivalDate: Timestamp.fromDate(entry.arrivalDate),
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Stok girişi ekleme hatası:', error);
    throw error;
  }
};

// Stok Girişleri Getirme (Filtreleme ile)
export const getStockEntries = async (filters?: {
  materialName?: string;
  category?: string;
  supplier?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<StockEntry[]> => {
  try {
    let q = query(collection(db, 'stockEntries'), orderBy('arrivalDate', 'desc'));
    
    if (filters?.materialName) {
      q = query(q, where('materialName', '==', filters.materialName));
    }
    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.supplier) {
      q = query(q, where('supplier', '==', filters.supplier));
    }
    
    const querySnapshot = await getDocs(q);
    const entries: StockEntry[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const entry: StockEntry = {
        id: doc.id,
        arrivalDate: data.arrivalDate.toDate(),
        materialName: data.materialName,
        category: data.category,
        unit: data.unit,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        supplier: data.supplier,
        note: data.note,
        createdAt: data.createdAt?.toDate()
      };
      
      // Tarih filtreleme (client-side)
      if (filters?.startDate && entry.arrivalDate < filters.startDate) {
        return;
      }
      if (filters?.endDate && entry.arrivalDate > filters.endDate) {
        return;
      }
      
      entries.push(entry);
    });
    
    return entries;
  } catch (error) {
    console.error('Stok girişleri getirme hatası:', error);
    throw error;
  }
};

// Personel Çıkış Ekleme (Stok kontrolü ile)
export const addStockOutput = async (output: StockOutput): Promise<string> => {
  try {
    // Önce stok durumunu kontrol et
    const stockStatus = await getStockStatusByMaterial(output.materialName);
    
    if (!stockStatus || stockStatus.currentStock < output.quantity) {
      throw new Error(`Yetersiz stok! Mevcut stok: ${stockStatus?.currentStock || 0} ${stockStatus?.unit || ''}`);
    }
    
    // Çıkış kaydını ekle
    const docRef = await addDoc(collection(db, 'stockOutputs'), {
      ...output,
      issueDate: Timestamp.fromDate(output.issueDate),
      createdAt: Timestamp.now()
    });
    
    // Stok durumunu güncelle
    await updateStockStatus(output.materialName, -output.quantity);
    
    return docRef.id;
  } catch (error) {
    console.error('Stok çıkışı ekleme hatası:', error);
    throw error;
  }
};

// Personel Çıkışları Getirme (Filtreleme ile)
export const getStockOutputs = async (filters?: {
  employee?: string;
  department?: string;
  materialName?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<StockOutput[]> => {
  try {
    let q = query(collection(db, 'stockOutputs'), orderBy('issueDate', 'desc'));
    
    if (filters?.employee) {
      q = query(q, where('employee', '==', filters.employee));
    }
    if (filters?.department) {
      q = query(q, where('department', '==', filters.department));
    }
    if (filters?.materialName) {
      q = query(q, where('materialName', '==', filters.materialName));
    }
    
    const querySnapshot = await getDocs(q);
    const outputs: StockOutput[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const output: StockOutput = {
        id: doc.id,
        issueDate: data.issueDate.toDate(),
        employee: data.employee,
        department: data.department,
        materialName: data.materialName,
        quantity: data.quantity,
        issuedBy: data.issuedBy,
        description: data.description,
        createdAt: data.createdAt?.toDate()
      };
      
      // Tarih filtreleme (client-side)
      if (filters?.startDate && output.issueDate < filters.startDate) {
        return;
      }
      if (filters?.endDate && output.issueDate > filters.endDate) {
        return;
      }
      
      outputs.push(output);
    });
    
    return outputs;
  } catch (error) {
    console.error('Stok çıkışları getirme hatası:', error);
    throw error;
  }
};

// Stok Durumunu Getirme (Malzeme adına göre)
const getStockStatusByMaterial = async (materialName: string): Promise<StockStatus | null> => {
  try {
    const q = query(
      collection(db, 'stockStatus'),
      where('materialName', '==', materialName)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data
    } as StockStatus;
  } catch (error) {
    console.error('Stok durumu getirme hatası:', error);
    return null;
  }
};

// Stok Durumunu Güncelleme
const updateStockStatus = async (materialName: string, quantityChange: number): Promise<void> => {
  try {
    const stockStatus = await getStockStatusByMaterial(materialName);
    
    if (!stockStatus) {
      throw new Error('Stok durumu bulunamadı!');
    }
    
    const newTotalOutput = stockStatus.totalOutput + Math.abs(quantityChange);
    const newCurrentStock = stockStatus.currentStock + quantityChange;
    
    // Durum hesaplama
    let status: 'green' | 'orange' | 'red' = 'green';
    if (newCurrentStock <= 0) {
      status = 'red';
    } else if (newCurrentStock <= stockStatus.criticalLevel) {
      status = 'red';
    } else if (newCurrentStock <= stockStatus.criticalLevel * 1.5) {
      status = 'orange';
    }
    
    await updateDoc(doc(db, 'stockStatus', stockStatus.id!), {
      totalOutput: newTotalOutput,
      currentStock: newCurrentStock,
      status
    });
  } catch (error) {
    console.error('Stok durumu güncelleme hatası:', error);
    throw error;
  }
};

// Tüm Stok Durumlarını Getirme
export const getAllStockStatus = async (): Promise<StockStatus[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'stockStatus'));
    const statuses: StockStatus[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      statuses.push({
        id: doc.id,
        ...data
      } as StockStatus);
    });
    
    return statuses.sort((a, b) => a.materialName.localeCompare(b.materialName));
  } catch (error) {
    console.error('Tüm stok durumları getirme hatası:', error);
    throw error;
  }
};

// Stok Girişi yapıldığında stok durumunu güncelle
export const updateStockStatusOnEntry = async (
  materialName: string,
  quantity: number,
  unit: string,
  criticalLevel: number
): Promise<void> => {
  try {
    const stockStatus = await getStockStatusByMaterial(materialName);
    
    if (stockStatus) {
      // Mevcut stok durumunu güncelle
      const newTotalEntry = stockStatus.totalEntry + quantity;
      const newCurrentStock = stockStatus.currentStock + quantity;
      // Kritik seviye güncellenmişse yeni değeri kullan, değilse mevcut değeri koru
      const finalCriticalLevel = criticalLevel > 0 ? criticalLevel : stockStatus.criticalLevel;
      
      let status: 'green' | 'orange' | 'red' = 'green';
      if (newCurrentStock <= 0) {
        status = 'red';
      } else if (finalCriticalLevel > 0 && newCurrentStock <= finalCriticalLevel) {
        status = 'red';
      } else if (finalCriticalLevel > 0 && newCurrentStock <= finalCriticalLevel * 1.5) {
        status = 'orange';
      }
      
      await updateDoc(doc(db, 'stockStatus', stockStatus.id!), {
        totalEntry: newTotalEntry,
        currentStock: newCurrentStock,
        criticalLevel: finalCriticalLevel,
        status
      });
    } else {
      // Yeni stok durumu oluştur
      const finalCriticalLevel = criticalLevel > 0 ? criticalLevel : quantity * 0.2; // Varsayılan olarak miktarın %20'si
      let status: 'green' | 'orange' | 'red' = 'green';
      if (quantity <= 0) {
        status = 'red';
      } else if (quantity <= finalCriticalLevel) {
        status = 'red';
      } else if (quantity <= finalCriticalLevel * 1.5) {
        status = 'orange';
      }
      
      const newStatus: StockStatus = {
        materialName,
        totalEntry: quantity,
        totalOutput: 0,
        currentStock: quantity,
        criticalLevel: finalCriticalLevel,
        status,
        unit
      };
      
      await addDoc(collection(db, 'stockStatus'), newStatus);
    }
  } catch (error) {
    console.error('Stok durumu güncelleme hatası:', error);
    throw error;
  }
};


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
  sku?: string;
  barcode?: string;
  materialName: string;
  category: string;
  variant?: string;
  unit: string;
  baseUnit?: string;
  conversionFactor?: number;
  quantity: number;
  unitPrice?: number;
  supplier?: string;
  warehouse?: string;
  binCode?: string;
  serialLot?: string;
  expiryDate?: Date;
  note?: string;
  companyId?: string; // Şirket ID'si
  createdAt?: Date;
}

export interface StockOutput {
  id?: string;
  issueDate: Date;
  sku?: string;
  employee: string;
  department: string;
  personnelId?: string; // Personel ID'si
  variant?: string;
  materialName: string;
  quantity: number;
  issuedBy: string;
  warehouse?: string;
  binCode?: string;
  serialLot?: string;
  expiryDate?: Date;
  description?: string;
  companyId?: string; // Şirket ID'si
  createdAt?: Date;
}

export interface StockStatus {
  id?: string;
  sku?: string;
  materialName: string;
  variant?: string;
  warehouse?: string; // Depo bilgisi
  binCode?: string;
  totalEntry: number;
  totalOutput: number;
  currentStock: number;
  criticalLevel: number;
  status: 'green' | 'orange' | 'red';
  unit: string;
  companyId?: string; // Şirket ID'si
}

// Firestore'a giderken undefined alanları ve boş objeleri temizle
const cleanPayload = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  // Date ve Firestore Timestamp gibi tipleri bozma
  if (obj instanceof Date) return obj;
  if (obj?.toDate && typeof obj.toDate === 'function') return obj; // Timestamp
  const copy: any = Array.isArray(obj) ? [...obj] : { ...obj };
  Object.keys(copy).forEach((key) => {
    const value = copy[key];
    if (value === undefined) {
      delete copy[key];
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value instanceof Date) {
        copy[key] = value;
        return;
      }
      if (value?.toDate && typeof value.toDate === 'function') {
        copy[key] = value; // Timestamp vb.
        return;
      }
      copy[key] = cleanPayload(value);
      if (copy[key] && typeof copy[key] === 'object' && Object.keys(copy[key]).length === 0) {
        delete copy[key];
      }
    }
  });
  return copy;
};

// Barkod kontrolü - aynı barkod daha önce girilmiş mi?
export const checkBarcodeExists = async (barcode: string, companyId?: string): Promise<boolean> => {
  if (!barcode) return false;
  try {
    let q = query(
      collection(db, 'stockEntries'),
      where('barcode', '==', barcode)
    );
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Barkod kontrolü hatası:', error);
    return false;
  }
};

// Firma bazlı tüm barkodları getir
export const getAllBarcodesByCompany = async (companyId: string): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'stockEntries'),
      where('companyId', '==', companyId)
    );
    const querySnapshot = await getDocs(q);
    const barcodes: string[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.barcode) {
        barcodes.push(data.barcode);
      }
    });
    return barcodes;
  } catch (error) {
    console.error('Barkodlar getirilirken hata:', error);
    return [];
  }
};

// Barkod ile stok girişi bul
export const getStockEntryByBarcode = async (barcode: string, companyId?: string): Promise<StockEntry | null> => {
  try {
    let q = query(
      collection(db, 'stockEntries'),
      where('barcode', '==', barcode)
    );
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const doc = querySnapshot.docs[0];
    const data: any = doc.data();

    // arrivalDate'i güvenli şekilde parse et
    let arrivalDate: Date;
    if (data.arrivalDate?.toDate && typeof data.arrivalDate.toDate === 'function') {
      arrivalDate = data.arrivalDate.toDate();
    } else if (data.arrivalDate instanceof Date) {
      arrivalDate = data.arrivalDate;
    } else if (data.arrivalDate) {
      arrivalDate = new Date(data.arrivalDate);
    } else {
      arrivalDate = new Date();
    }
    if (isNaN(arrivalDate.getTime())) {
      const createdAt = data.createdAt?.toDate?.() ?? data.createdAt;
      const fallback = createdAt ? new Date(createdAt) : new Date();
      arrivalDate = isNaN(fallback.getTime()) ? new Date() : fallback;
    }

    // expiryDate'i güvenli şekilde parse et
    let expiryDate: Date | undefined;
    if (data.expiryDate?.toDate && typeof data.expiryDate.toDate === 'function') {
      expiryDate = data.expiryDate.toDate();
    } else if (data.expiryDate instanceof Date) {
      expiryDate = data.expiryDate;
    } else if (data.expiryDate) {
      expiryDate = new Date(data.expiryDate);
    }
    if (expiryDate && isNaN(expiryDate.getTime())) {
      expiryDate = undefined;
    }

    return {
      id: doc.id,
      arrivalDate,
      sku: data.sku,
      barcode: data.barcode,
      materialName: data.materialName,
      category: data.category,
      variant: data.variant,
      unit: data.unit,
      baseUnit: data.baseUnit,
      conversionFactor: data.conversionFactor,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      supplier: data.supplier,
      warehouse: data.warehouse,
      binCode: data.binCode,
      serialLot: data.serialLot,
      expiryDate,
      note: data.note,
      companyId: data.companyId,
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt
    };
  } catch (error) {
    console.error('Barkod ile stok girişi bulunurken hata:', error);
    return null;
  }
};

// Stok Giriş Ekleme
export const addStockEntry = async (entry: StockEntry): Promise<string> => {
  try {
    // Barkod kontrolü
    if (entry.barcode && entry.companyId) {
      const exists = await checkBarcodeExists(entry.barcode, entry.companyId);
      if (exists) {
        throw new Error('Bu barkod daha önce girilmiş. Aynı barkod tekrar kullanılamaz.');
      }
    }
    
    const payload = cleanPayload({
      ...entry,
      arrivalDate: Timestamp.fromDate(entry.arrivalDate),
      expiryDate: entry.expiryDate ? Timestamp.fromDate(entry.expiryDate) : undefined,
      createdAt: Timestamp.now()
    });
    const docRef = await addDoc(collection(db, 'stockEntries'), payload);
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
  companyId?: string;
}): Promise<StockEntry[]> => {
  try {
    let q = query(collection(db, 'stockEntries'), orderBy('arrivalDate', 'desc'));
    
    // CompanyId filtresi (zorunlu - multi-tenant için)
    if (filters?.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }
    
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
    
    querySnapshot.forEach((docSnap) => {
      const data: any = docSnap.data();
      
      // arrivalDate'i güvenli şekilde parse et
      let arrivalDate: Date;
      if (data.arrivalDate?.toDate && typeof data.arrivalDate.toDate === 'function') {
        arrivalDate = data.arrivalDate.toDate();
      } else if (data.arrivalDate instanceof Date) {
        arrivalDate = data.arrivalDate;
      } else if (data.arrivalDate) {
        arrivalDate = new Date(data.arrivalDate);
      } else {
        arrivalDate = new Date(); // Fallback
      }
      // Geçersiz tarih fallback
      if (isNaN(arrivalDate.getTime())) {
        const createdAt = data.createdAt?.toDate?.() ?? data.createdAt;
        const fallback = createdAt ? new Date(createdAt) : new Date();
        arrivalDate = isNaN(fallback.getTime()) ? new Date() : fallback;
      }
      
      // expiryDate'i güvenli şekilde parse et
      let expiryDate: Date | undefined;
      if (data.expiryDate?.toDate && typeof data.expiryDate.toDate === 'function') {
        expiryDate = data.expiryDate.toDate();
      } else if (data.expiryDate instanceof Date) {
        expiryDate = data.expiryDate;
      } else if (data.expiryDate) {
        expiryDate = new Date(data.expiryDate);
      }
      if (expiryDate && isNaN(expiryDate.getTime())) {
        expiryDate = undefined;
      }
      
      const entry: StockEntry = {
        id: docSnap.id,
        arrivalDate,
        sku: data.sku,
        barcode: data.barcode,
        materialName: data.materialName,
        category: data.category,
        variant: data.variant,
        unit: data.unit,
        baseUnit: data.baseUnit,
        conversionFactor: data.conversionFactor,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        supplier: data.supplier,
        warehouse: data.warehouse,
        binCode: data.binCode,
        serialLot: data.serialLot,
        expiryDate,
        note: data.note,
        companyId: data.companyId,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt
      };
      
    // Tarih filtreleme (client-side)
    if (filters?.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      if (entry.arrivalDate < start) return;
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      if (entry.arrivalDate > end) return;
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
    // Önce stok durumunu kontrol et (materialName + warehouse + companyId ile)
    const stockStatus = await getStockStatusByMaterial(output.materialName, output.companyId, output.warehouse);
    
    if (!stockStatus || stockStatus.currentStock < output.quantity) {
      const warehouseInfo = output.warehouse ? ` (${output.warehouse} deposunda)` : '';
      throw new Error(`Yetersiz stok${warehouseInfo}! Mevcut stok: ${stockStatus?.currentStock || 0} ${stockStatus?.unit || ''}`);
    }
    
    // Çıkış kaydını ekle
    const payload = cleanPayload({
      ...output,
      issueDate: Timestamp.fromDate(output.issueDate),
      expiryDate: output.expiryDate ? Timestamp.fromDate(output.expiryDate) : undefined,
      createdAt: Timestamp.now()
    });
    const docRef = await addDoc(collection(db, 'stockOutputs'), payload);
    
    // Stok durumunu güncelle (materialName + warehouse + companyId ile)
    await updateStockStatus(output.materialName, -output.quantity, output.companyId, output.warehouse);
    
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
  companyId?: string;
}): Promise<StockOutput[]> => {
  try {
    let q = query(collection(db, 'stockOutputs'), orderBy('issueDate', 'desc'));
    
    // CompanyId filtresi (zorunlu - multi-tenant için)
    if (filters?.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }
    
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
    
    querySnapshot.forEach((docSnap) => {
      const data: any = docSnap.data();
      const output: StockOutput = {
        id: docSnap.id,
        issueDate: data.issueDate?.toDate?.() ?? data.issueDate,
        sku: data.sku,
        employee: data.employee,
        department: data.department,
        personnelId: data.personnelId,
        variant: data.variant,
        materialName: data.materialName,
        quantity: data.quantity,
        issuedBy: data.issuedBy,
        binCode: data.binCode,
        serialLot: data.serialLot,
        expiryDate: data.expiryDate?.toDate ? data.expiryDate.toDate() : undefined,
        warehouse: data.warehouse,
        description: data.description,
        companyId: data.companyId,
        createdAt: data.createdAt?.toDate?.() ?? data.createdAt
      };
      
    // Tarih filtreleme (client-side)
    if (filters?.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      if (output.issueDate < start) return;
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      if (output.issueDate > end) return;
    }
    
    outputs.push(output);
    });
    
    return outputs;
  } catch (error) {
    console.error('Stok çıkışları getirme hatası:', error);
    throw error;
  }
};

// Stok Durumunu Getirme (Malzeme adına ve depoya göre)
const getStockStatusByMaterial = async (materialName: string, companyId?: string, warehouse?: string): Promise<StockStatus | null> => {
  try {
    let q = query(
      collection(db, 'stockStatus'),
      where('materialName', '==', materialName)
    );
    
    // CompanyId filtresi (multi-tenant için)
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    
    // Warehouse filtresi (depo bazında stok takibi)
    if (warehouse) {
      q = query(q, where('warehouse', '==', warehouse));
    } else {
      // Warehouse yoksa null veya undefined olanları getir
      q = query(q, where('warehouse', '==', null));
    }
    
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
const updateStockStatus = async (materialName: string, quantityChange: number, companyId?: string, warehouse?: string): Promise<void> => {
  try {
    const stockStatus = await getStockStatusByMaterial(materialName, companyId, warehouse);
    
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
export const getAllStockStatus = async (companyId?: string, warehouse?: string, sku?: string, variant?: string, binCode?: string): Promise<StockStatus[]> => {
  try {
    let q = companyId
      ? query(collection(db, 'stockStatus'), where('companyId', '==', companyId))
      : query(collection(db, 'stockStatus'));
    
    if (warehouse) q = query(q, where('warehouse', '==', warehouse));
    if (sku) q = query(q, where('sku', '==', sku));
    if (variant) q = query(q, where('variant', '==', variant));
    if (binCode) q = query(q, where('binCode', '==', binCode));
    
    const querySnapshot = await getDocs(q);
    const statuses: StockStatus[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      statuses.push({
        id: doc.id,
        ...data
      } as StockStatus);
    });
    
    // Önce depoya göre, sonra malzeme adına göre sırala
    return statuses.sort((a, b) => {
      const warehouseCompare = (a.warehouse || '').localeCompare(b.warehouse || '');
      if (warehouseCompare !== 0) return warehouseCompare;
      return a.materialName.localeCompare(b.materialName);
    });
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
  criticalLevel: number,
  companyId?: string,
  warehouse?: string,
  sku?: string,
  variant?: string,
  binCode?: string
): Promise<void> => {
  try {
    const stockStatus = await getStockStatusByMaterial(materialName, companyId, warehouse);
    
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
        status,
        // Stok girişte girilen detayları sakla (mevcut varsa ezmemek için sadece doluysa yaz)
        ...(sku ? { sku } : {}),
        ...(variant ? { variant } : {}),
        ...(binCode ? { binCode } : {})
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
        sku,
        materialName,
        variant,
        warehouse,
        binCode,
        totalEntry: quantity,
        totalOutput: 0,
        currentStock: quantity,
        criticalLevel: finalCriticalLevel,
        status,
        unit,
        companyId
      };
      
      await addDoc(collection(db, 'stockStatus'), cleanPayload(newStatus));
    }
  } catch (error) {
    console.error('Stok durumu güncelleme hatası:', error);
    throw error;
  }
};


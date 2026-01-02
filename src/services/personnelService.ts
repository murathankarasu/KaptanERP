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
  updateDoc,
  deleteDoc,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { PermissionType } from '../types/permissions';

export interface Personnel {
  id?: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  companyId?: string; // Şirket ID'si
  permissions?: PermissionType[]; // Personelin yetkileri
  passwordHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const collectionName = 'personnel';

export const addPersonnel = async (personnel: Omit<Personnel, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const payload: any = {
      ...personnel,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    if (payload.permissions === undefined) {
      delete payload.permissions;
    }
    const docRef = await addDoc(collection(db, collectionName), payload);
    return docRef.id;
  } catch (error) {
    console.error('Personel eklenirken hata:', error);
    throw error;
  }
};

export const getPersonnel = async (filters?: {
  department?: string;
  name?: string;
  companyId?: string;
}): Promise<Personnel[]> => {
  try {
    let q = query(collection(db, collectionName), orderBy('name', 'asc'));
    
    // CompanyId filtresi (zorunlu - multi-tenant için)
    if (filters?.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }
    
    if (filters?.department) {
      q = query(q, where('department', '==', filters.department));
    }
    
    if (filters?.name) {
      q = query(q, where('name', '>=', filters.name), where('name', '<=', filters.name + '\uf8ff'));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Personnel[];
  } catch (error) {
    console.error('Personel listesi yüklenirken hata:', error);
    throw error;
  }
};

export const updatePersonnel = async (id: string, personnel: Partial<Personnel>): Promise<Personnel> => {
  try {
    const docRef = doc(db, collectionName, id);
    const payload: any = {
      ...personnel,
      updatedAt: Timestamp.now()
    };

    // Permissions özel işleme: boş array ise açıkça sil, undefined ise dokunma
    if (personnel.permissions !== undefined) {
      if (Array.isArray(personnel.permissions) && personnel.permissions.length === 0) {
        // Boş array ise Firestore'dan sil
        payload.permissions = deleteField();
      } else if (Array.isArray(personnel.permissions) && personnel.permissions.length > 0) {
        // Dolu array ise gönder
        payload.permissions = personnel.permissions;
      }
    }

    // Firestore updateDoc undefined alanları kabul etmiyor, temizle
    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof typeof payload] === undefined && payload[key] !== deleteField()) {
        delete payload[key as keyof typeof payload];
      }
    });

    await updateDoc(docRef, payload);

    // Güncelleme sonrası veriyi tekrar oku ve döndür (doğrulama için)
    const updatedDoc = await getDoc(docRef);
    if (!updatedDoc.exists()) {
      throw new Error('Personel güncellendikten sonra veri bulunamadı');
    }
    
    const data = updatedDoc.data();
    const updatedPersonnel: Personnel = {
      id: updatedDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      permissions: data.permissions || [] // Boş array olarak döndür
    };
    
    return updatedPersonnel;
  } catch (error) {
    console.error('Personel güncellenirken hata:', error);
    throw error;
  }
};

export const deletePersonnel = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Personel silinirken hata:', error);
    throw error;
  }
};

export const getPersonnelByEmail = async (email: string, companyId?: string): Promise<Personnel | null> => {
  try {
    let q = query(collection(db, collectionName), where('email', '==', email));
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.(),
      updatedAt: data.updatedAt?.toDate?.()
    } as Personnel;
  } catch (error) {
    console.error('Personel email ile getirilirken hata:', error);
    return null;
  }
};

export const getPersonnelById = async (id: string): Promise<Personnel | null> => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as Personnel;
    }
    return null;
  } catch (error) {
    console.error('Personel getirilirken hata:', error);
    return null;
  }
};


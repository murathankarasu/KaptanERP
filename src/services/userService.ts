import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { addPersonnel, getPersonnelByEmail } from './personnelService';
import { getCompanyByCode, getCompanyByName, getCompanyById, getCompanies } from './companyService';

export interface User {
  id?: string;
  username: string;
  password: string; // Hash'lenmiş olacak
  email?: string;
  fullName?: string;
  role: 'admin' | 'manager' | 'user'; // admin: sistem admini, manager: şirket yöneticisi, user: normal kullanıcı
  companyId?: string; // Şirket ID'si
  companyCode?: string; // Şirket kodu (hızlı erişim için)
  companyName?: string;
  createdBy?: string; // Bu kullanıcıyı oluşturan kullanıcının ID'si
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

export interface ErrorLog {
  id?: string;
  userId?: string;
  username?: string;
  error: string;
  page?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

const usersCollection = 'users';
const errorLogsCollection = 'errorLogs';

// Basit hash fonksiyonu (production'da daha güvenli bir yöntem kullanılmalı)
const hashPassword = (password: string): string => {
  // Basit hash - production'da bcrypt veya benzeri kullanılmalı
  return btoa(password).split('').reverse().join('');
};

export const addUser = async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'>, createdBy?: string): Promise<string> => {
  try {
    const normalizedEmail = user.email?.trim().toLowerCase();
    const normalizedUsername = user.username?.trim() || normalizedEmail;
    const hashedPassword = hashPassword(user.password);
    const docRef = await addDoc(collection(db, usersCollection), {
      ...user,
      password: hashedPassword,
      username: normalizedUsername,
      email: normalizedEmail || user.email,
      createdBy: createdBy || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Otomatik personel kartı: beyaz yaka (admin hariç) davet/eklenen kullanıcılar personele düşsün
    if (user.role !== 'admin' && user.companyId) {
      const emailToCheck = normalizedEmail || user.email;
      const existing = emailToCheck ? await getPersonnelByEmail(emailToCheck, user.companyId) : null;
      if (!existing) {
        const payload: any = {
          name: user.fullName || normalizedUsername || 'Yeni Kullanıcı',
          department: 'Beyaz Yaka',
          email: emailToCheck,
          phone: '',
          employeeId: normalizedUsername || undefined,
          companyId: user.companyId,
          permissions: ['dashboard']
        };
        await addPersonnel(payload);
      }
    }
    return docRef.id;
  } catch (error) {
    console.error('Kullanıcı eklenirken hata:', error);
    throw error;
  }
};

export const ensurePersonnelForUser = async (user: User): Promise<User> => {
  try {
    let companyId = user.companyId;
    let companyCode = user.companyCode;
    let companyName = user.companyName;

    const commitUserUpdate = async () => {
      if (!user.id) return;
      await updateDoc(doc(db, usersCollection, user.id), {
        companyId: companyId || null,
        companyCode: companyCode || null,
        companyName: companyName || null,
        updatedAt: Timestamp.now()
      });
      console.log('[ensurePersonnelForUser] user updated', {
        userId: user.id,
        companyId,
        companyCode,
        companyName
      });
    };

    // 1) companyId varsa, eksik ad/kod doldur
    if (companyId) {
      const c = await getCompanyById(companyId);
      if (c) {
        companyCode = companyCode || c.code;
        companyName = companyName || c.name;
        console.log('[ensurePersonnelForUser] resolved from companyId', { companyId, companyCode, companyName });
      }
    }

    // 2) companyId yoksa koddan bul
    if (!companyId && companyCode) {
      const company = await getCompanyByCode(companyCode);
      if (company?.id) {
        companyId = company.id;
        companyCode = company.code;
        companyName = company.name;
        console.log('[ensurePersonnelForUser] resolved from companyCode', { companyId, companyCode, companyName });
      }
    }

    // 3) hâlâ yoksa isimden bul (trim/lower eşleştirme)
    if (!companyId && companyName) {
      const nameTrim = companyName.trim();
      const companyByName = await getCompanyByName(nameTrim);
      if (companyByName?.id) {
        companyId = companyByName.id;
        companyCode = companyByName.code;
        companyName = companyByName.name;
        console.log('[ensurePersonnelForUser] resolved from companyName', { companyId, companyCode, companyName });
      }
    }

    // 4) Son çare: tek firma varsa ona bağla
    if (!companyId) {
      const all = await getCompanies();
      if (all.length === 1) {
        companyId = all[0].id;
        companyCode = all[0].code;
        companyName = all[0].name;
        console.log('[ensurePersonnelForUser] resolved from single company fallback', { companyId, companyCode, companyName });
      }
    }

    // Güncelleme
    await commitUserUpdate();

    const emailToCheck = user.email?.toLowerCase();
    if (companyId && emailToCheck) {
      const existing = await getPersonnelByEmail(emailToCheck, companyId);
      if (!existing) {
        const payload: any = {
          name: user.fullName || user.username || 'Kullanıcı',
          department: 'Beyaz Yaka',
          email: emailToCheck,
          phone: '',
          employeeId: user.username,
          companyId,
          permissions: ['dashboard'] // Varsayılan yetki
        };
        await addPersonnel(payload);
        console.log('[ensurePersonnelForUser] personnel created', { email: emailToCheck, companyId });
      }
    }
    if (companyId && emailToCheck) {
      const existing = await getPersonnelByEmail(emailToCheck, companyId);
      console.log('[ensurePersonnelForUser] personnel check after create', { exists: !!existing, email: emailToCheck, companyId });
    }
    if (!companyId) {
      console.warn('[ensurePersonnelForUser] companyId unresolved', { user });
    }

    return { ...user, companyId, companyCode, companyName };
  } catch (err) {
    console.error('ensurePersonnelForUser hata:', err);
    return user;
  }
};

export const getUsers = async (companyId?: string): Promise<User[]> => {
  try {
    let q;
    if (companyId) {
      q = query(collection(db, usersCollection), where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, usersCollection), orderBy('createdAt', 'desc'));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      password: '***', // Şifreyi gizle
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastLogin: doc.data().lastLogin?.toDate()
    })) as User[];
  } catch (error) {
    console.error('Kullanıcı listesi yüklenirken hata:', error);
    throw error;
  }
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const q = query(collection(db, usersCollection), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      } as User;
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı getirilirken hata:', error);
    return null;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const q = query(collection(db, usersCollection), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      } as User;
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı getirilirken hata:', error);
    return null;
  }
};

// Admin kullanıcısı kontrolü (.env'den)
export const checkAdminCredentials = async (username: string, password: string): Promise<User | null> => {
  try {
    const adminUsername = import.meta.env.VITE_ADMIN_USERNAME;
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    
    if (adminUsername && adminPassword && username === adminUsername && password === adminPassword) {
      // Admin kullanıcısı varsa onu döndür, yoksa oluştur
      let adminUser = await getUserByUsername(username);
      
      if (!adminUser) {
        // İlk admin kullanıcısını oluştur
        await addUser({
          username: adminUsername,
          password: adminPassword,
          role: 'admin',
          isActive: true
        });
        adminUser = await getUserByUsername(username);
      }
      
      if (adminUser) {
        // Son giriş zamanını güncelle
        if (adminUser.id) {
          await updateDoc(doc(db, usersCollection, adminUser.id), {
            lastLogin: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
        return adminUser;
      }
    }
  } catch (error) {
    console.error('Admin credentials kontrolü hatası:', error);
  }
  
  return null;
};

export const verifyPassword = (usernameOrEmail: string, password: string): Promise<User | null> => {
  return new Promise(async (resolve) => {
    try {
      const input = usernameOrEmail.trim();
      const lowerEmail = input.includes('@') ? input.toLowerCase() : undefined;

      // username veya email ile kullanıcıyı bul
      let user = await getUserByUsername(input);
      if (!user && lowerEmail) {
        user = await getUserByEmail(lowerEmail);
      }
      if (!user) {
        user = await getUserByEmail(input); // fallback eskisi için
      }
      if (!user) {
        console.warn('[verifyPassword] user not found', { input });
        resolve(null);
        return;
      }

      const hashedPassword = hashPassword(password);
      if (user.password === hashedPassword && user.isActive) {
        if (user.id) {
          await updateDoc(doc(db, usersCollection, user.id), {
            lastLogin: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
        console.log('[verifyPassword] ok', { userId: user.id, username: user.username, companyId: user.companyId, companyCode: user.companyCode });
        resolve(user);
      } else {
        console.warn('[verifyPassword] wrong password or inactive', { userId: user.id, isActive: user.isActive });
        resolve(null);
      }
    } catch (error) {
      console.error('Şifre doğrulama hatası:', error);
      await addErrorLog(`Şifre doğrulama hatası: ${error}`, 'Login');
      resolve(null);
    }
  });
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  try {
    const docRef = doc(db, usersCollection, id);
    const updateData: any = {
      ...user,
      updatedAt: Timestamp.now()
    };
    
    // Şifre değiştiriliyorsa hash'le
    if (user.password && user.password !== '***') {
      updateData.password = hashPassword(user.password);
    } else {
      delete updateData.password; // Şifre değiştirilmiyorsa gönderme
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Kullanıcı güncellenirken hata:', error);
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, usersCollection, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Kullanıcı silinirken hata:', error);
    throw error;
  }
};

// Hata Logları
export const addErrorLog = async (error: string, page?: string, userId?: string, username?: string): Promise<void> => {
  try {
    await addDoc(collection(db, errorLogsCollection), {
      error,
      page,
      userId,
      username,
      timestamp: Timestamp.now(),
      resolved: false
    });
  } catch (error) {
    console.error('Hata logu eklenirken hata:', error);
  }
};

export const getErrorLogs = async (filters?: {
  resolved?: boolean;
  userId?: string;
}): Promise<ErrorLog[]> => {
  try {
    let q = query(collection(db, errorLogsCollection), orderBy('timestamp', 'desc'));
    
    if (filters?.resolved !== undefined) {
      q = query(q, where('resolved', '==', filters.resolved));
    }
    
    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate()
    })) as ErrorLog[];
  } catch (error) {
    console.error('Hata logları yüklenirken hata:', error);
    throw error;
  }
};

export const resolveErrorLog = async (id: string, resolvedBy: string): Promise<void> => {
  try {
    const docRef = doc(db, errorLogsCollection, id);
    await updateDoc(docRef, {
      resolved: true,
      resolvedBy,
      resolvedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Hata logu çözülürken hata:', error);
    throw error;
  }
};


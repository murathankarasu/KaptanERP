import { 
  signOut
} from 'firebase/auth';
import { 
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export interface AllowedUser {
  email: string;
  name?: string;
  role?: string;
}

/**
 * Kullanıcının Firestore'daki users koleksiyonunda kayıtlı olup olmadığını kontrol eder
 * Admin panelden eklenen kullanıcıların email'leri ile Google giriş yapılabilir
 */
export const checkIfUserAllowed = async (email: string): Promise<boolean> => {
  try {
    if (!email) {
      return false;
    }

    // Users koleksiyonunda bu email ile kayıtlı aktif kullanıcı var mı kontrol et
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('email', '==', email),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    // Eğer aktif bir kullanıcı bulunduysa giriş yapabilir
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Kullanıcı kontrolü hatası:', error);
    return false;
  }
};

export const logout = async (): Promise<void> => {
  try {
    // Firebase auth state kontrolü - eğer kullanıcı giriş yapmışsa çıkış yap
    const currentUser = auth.currentUser;
    if (currentUser) {
      await signOut(auth);
    }
    // localStorage'ı temizle (hem Firebase hem password-based login için)
    localStorage.removeItem('currentUser');
  } catch (error) {
    console.error('Çıkış hatası:', error);
    // Hata olsa bile localStorage'ı temizle
    localStorage.removeItem('currentUser');
    // Hata fırlatma, sadece logla
  }
};


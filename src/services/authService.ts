import { 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';

export interface AllowedUser {
  email: string;
  name?: string;
  role?: string;
}

export const checkIfUserAllowed = async (email: string): Promise<boolean> => {
  try {
    const allowedUsersRef = doc(db, 'settings', 'allowedUsers');
    const allowedUsersSnap = await getDoc(allowedUsersRef);
    
    if (allowedUsersSnap.exists()) {
      const data = allowedUsersSnap.data();
      const allowedEmails = data.emails || [];
      return allowedEmails.includes(email);
    }
    
    // Eğer allowedUsers dokümanı yoksa, ilk kullanıcıya izin ver
    return true;
  } catch (error) {
    console.error('Kullanıcı kontrolü hatası:', error);
    return false;
  }
};

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Kullanıcının izinli olup olmadığını kontrol et
    const isAllowed = await checkIfUserAllowed(user.email || '');
    
    if (!isAllowed) {
      await signOut(auth);
      throw new Error('Bu Google hesabı ile giriş yapma yetkiniz bulunmamaktadır.');
    }
    
    return user;
  } catch (error: any) {
    console.error('Google ile giriş hatası:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Çıkış hatası:', error);
    throw error;
  }
};


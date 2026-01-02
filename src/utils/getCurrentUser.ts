import { PermissionType } from '../types/permissions';

export interface CurrentUser {
  id?: string;
  username?: string;
  email?: string;
  fullName?: string;
  role?: 'admin' | 'manager' | 'user';
  companyId?: string;
  companyCode?: string;
  companyName?: string;
  personnelId?: string;
  permissions?: PermissionType[];
}

/**
 * Mevcut kullanıcı bilgisini localStorage'dan alır
 */
export const getCurrentUser = (): CurrentUser | null => {
  try {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      return JSON.parse(currentUser) as CurrentUser;
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı bilgisi alınırken hata:', error);
    return null;
  }
};

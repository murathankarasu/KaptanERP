/**
 * Yetki tipleri - Her yetki bir modülü temsil eder
 */
export type PermissionType = 
  | 'stock_entry'        // Stok Giriş
  | 'stock_output'        // Personel Çıkış
  | 'stock_status'       // Stok Durumu
  | 'personnel'           // Personel Yönetimi
  | 'orders'              // Sipariş Takip
  | 'warehouse'           // Depo Yönetimi
  | 'customer'            // Müşteri Yönetimi
  | 'shipment'            // Sevkiyat Yönetimi
  | 'finance'             // Finans / GL
  | 'dashboard';          // Dashboard

/**
 * Yetki tanımları
 */
export const PERMISSIONS: Record<PermissionType, { label: string; description: string }> = {
  stock_entry: {
    label: 'Stok Giriş',
    description: 'Stok giriş işlemlerini yapabilir'
  },
  stock_output: {
    label: 'Personel Çıkış',
    description: 'Personellere malzeme çıkışı yapabilir'
  },
  stock_status: {
    label: 'Stok Durumu',
    description: 'Stok durumunu görüntüleyebilir'
  },
  personnel: {
    label: 'Personel Yönetimi',
    description: 'Personel kayıtlarını yönetebilir'
  },
  orders: {
    label: 'Sipariş Takip',
    description: 'Sipariş işlemlerini yönetebilir'
  },
  warehouse: {
    label: 'Depo Yönetimi',
    description: 'Depo işlemlerini yönetebilir'
  },
  customer: {
    label: 'Müşteri Yönetimi',
    description: 'Müşteri kayıtlarını yönetebilir'
  },
  shipment: {
    label: 'Sevkiyat Yönetimi',
    description: 'Sevkiyat işlemlerini yönetebilir'
  },
  finance: {
    label: 'Finans',
    description: 'Finans/GL işlemlerini yönetebilir'
  },
  dashboard: {
    label: 'Dashboard',
    description: 'Dashboard\'u görüntüleyebilir'
  }
};

export const PERMISSION_GROUPS: { title: string; items: PermissionType[] }[] = [
  { title: 'Genel', items: ['dashboard'] },
  { title: 'Stok / Depo', items: ['stock_entry', 'stock_output', 'stock_status', 'warehouse'] },
  { title: 'Satış / CRM', items: ['orders', 'customer', 'shipment'] },
  { title: 'Finans / GL', items: ['finance'] },
  { title: 'İK / Personel', items: ['personnel'] }
];

/**
 * Kullanıcının yetkilerini kontrol eder
 */
export const hasPermission = (userPermissions: PermissionType[] | undefined, requiredPermission: PermissionType): boolean => {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  return userPermissions.includes(requiredPermission);
};

/**
 * Manager rolü tüm yetkilere sahiptir
 */
export const getAllPermissions = (): PermissionType[] => {
  return Object.keys(PERMISSIONS) as PermissionType[];
};


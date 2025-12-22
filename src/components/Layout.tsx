import { ReactNode, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import { getCurrentUser } from '../utils/getCurrentUser';
import { hasPermission, getAllPermissions, PermissionType } from '../types/permissions';
import { LogOut, LayoutDashboard, Package, ArrowDownCircle, BarChart3, Users, ShoppingCart, Warehouse, Shield, Activity, FileText, UserCircle, Truck, CreditCard, CalendarRange, BookOpen, ClipboardList, FileQuestion, DollarSign, Inbox, FileCheck, Tags, UserCircle2, Info, Brain } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const handleLogout = async () => {
    try {
      // Firebase auth varsa çıkış yap
      await logout();
    } catch (error) {
      console.error('Firebase çıkış hatası:', error);
      // Hata olsa bile devam et
    } finally {
      // Her durumda localStorage'ı temizle ve login'e yönlendir
      localStorage.removeItem('currentUser');
      window.location.href = '/login';
    }
  };

  const currentUser = getCurrentUser();
  const userRole = currentUser?.role;
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  
  // Manager tüm yetkilere sahiptir
  const userPermissions = isManager ? getAllPermissions() : (currentUser?.permissions || []);

  // Menü grupları
  const sections = [
    {
      title: 'Genel',
      items: [
        { path: '/dashboard', label: 'Yönetim Paneli', icon: LayoutDashboard, permission: 'dashboard' as PermissionType },
        { path: '/about', label: 'Hakkında', icon: Info, permission: 'dashboard' as PermissionType },
        { path: '/ai-assistant', label: 'Yapay Zeka Asistanı', icon: Brain, permission: 'dashboard' as PermissionType }
      ]
    },
    {
      title: 'Stok / Depo',
      items: [
        { path: '/stock-entry', label: 'Stok Giriş', icon: Package, permission: 'stock_entry' as PermissionType },
        { path: '/stock-output', label: 'Personel Çıkış', icon: ArrowDownCircle, permission: 'stock_output' as PermissionType },
        { path: '/stock-status', label: 'Stok Durumu', icon: BarChart3, permission: 'stock_status' as PermissionType },
        { path: '/warehouse-management', label: 'Depo Yönetimi', icon: Warehouse, permission: 'warehouse' as PermissionType },
        { path: '/product-management', label: 'Ürün Kartları', icon: Package, permission: 'stock_entry' as PermissionType },
        { path: '/shipment-management', label: 'Sevkiyat Takip', icon: Truck, permission: 'shipment' as PermissionType }
      ]
    },
    {
      title: 'Satınalma / SCM',
      items: [
        { path: '/requisition-management', label: 'Satınalma Talepleri', icon: ClipboardList, permission: 'orders' as PermissionType },
        { path: '/rfq-management', label: 'Teklif Toplama (RFQ)', icon: FileQuestion, permission: 'orders' as PermissionType },
        { path: '/purchase-orders', label: 'Satınalma Siparişleri', icon: DollarSign, permission: 'orders' as PermissionType },
        { path: '/goods-receipts', label: 'Mal Kabul (GRN)', icon: Inbox, permission: 'orders' as PermissionType },
        { path: '/price-lists', label: 'Fiyat Listeleri', icon: Tags, permission: 'orders' as PermissionType }
      ]
    },
    {
      title: 'Satış / CRM',
      items: [
        { path: '/customer-management', label: 'Müşteri Kayıtları', icon: UserCircle, permission: 'customer' as PermissionType },
        { path: '/customer-payments', label: 'Tahsilat', icon: CreditCard, permission: 'customer' as PermissionType },
        { path: '/customer-aging', label: 'Cari Yaşlandırma', icon: CalendarRange, permission: 'customer' as PermissionType },
        { path: '/customer-insights', label: 'Müşteri Görünümü', icon: UserCircle2, permission: 'customer' as PermissionType },
        { path: '/order-management', label: 'Sipariş Yönetimi', icon: ShoppingCart, permission: 'orders' as PermissionType },
        { path: '/quotes', label: 'Teklifler', icon: ClipboardList, permission: 'orders' as PermissionType }
      ]
    },
    {
      title: 'Üretim',
      items: [
        { path: '/bom', label: 'BOM Yönetimi', icon: Package, permission: 'orders' as PermissionType },
        { path: '/mrp', label: 'MRP Planlama', icon: BarChart3, permission: 'orders' as PermissionType },
        { path: '/shop-floor', label: 'Shop Floor', icon: ClipboardList, permission: 'orders' as PermissionType }
      ]
    },
    {
      title: 'Finans / e-Belge',
      items: [
        { path: '/journal-entries', label: 'Hareket Kayıtları', icon: BookOpen, permission: 'finance' as PermissionType },
        { path: '/edocs-local', label: 'e-Belge PDF/UBL', icon: FileCheck, permission: 'finance' as PermissionType },
        { path: '/sales-invoices', label: 'Satış Faturaları', icon: FileCheck, permission: 'finance' as PermissionType }
      ]
    },
    {
      title: 'İK',
      items: [
        { path: '/personnel-management', label: 'Personel Yönetimi', icon: Users, permission: 'personnel' as PermissionType },
        { path: '/leave-management', label: 'İzin Yönetimi', icon: CalendarRange, permission: 'personnel' as PermissionType },
        { path: '/payroll', label: 'Bordro Hesaplama', icon: DollarSign, permission: 'personnel' as PermissionType }
      ]
    },
    {
      title: 'Kayıt / Admin',
      items: [
        ...(isManager ? [{ path: '/activity-logs', label: 'Kullanıcı İşlemleri', icon: Activity, permission: null }] : []),
        { path: '/settings', label: 'Ayarlar', icon: Shield, permission: null },
        ...(isAdmin ? [
          { path: '/transaction-orders', label: 'İşlem Kayıtları', icon: FileText, permission: null },
          { path: '/admin-panel', label: 'Yönetici Paneli', icon: Shield, permission: null }
        ] : [])
      ]
    }
  ];

  const filterItems = (items: any[]) => items.filter(item => {
    if (!item.permission) return true;
    return hasPermission(userPermissions, item.permission);
  });

  const navRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const stored = sessionStorage.getItem('sidebarScroll');
    if (stored && navRef.current) {
      navRef.current.scrollTop = parseInt(stored, 10);
    }
  }, []);

  const onScrollSave = () => {
    if (navRef.current) {
      sessionStorage.setItem('sidebarScroll', String(navRef.current.scrollTop));
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        background: '#000000',
        color: 'white',
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <img src="/Kaptan.png" alt="Kaptan Logo" style={{ width: '40px', height: '40px' }} />
            <h1 style={{ fontSize: '26px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>Kaptan</h1>
          </div>
          <p style={{ fontSize: '11px', color: '#999', marginTop: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>İş Yönetim Sistemi</p>
        </div>
        
        <nav ref={navRef} onScroll={onScrollSave} style={{ flex: 1, padding: '12px 0', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
          {sections.map((section) => {
            const items = filterItems(section.items);
            if (items.length === 0) return null;
            return (
              <div key={section.title} style={{ marginBottom: '12px' }}>
                <div style={{ padding: '8px 20px', fontSize: '11px', letterSpacing: '1px', color: '#aaa', textTransform: 'uppercase' }}>
                  {section.title}
                </div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 20px',
                        color: isActive ? '#fff' : '#999',
                        background: isActive ? '#1a1a1a' : 'transparent',
                        textDecoration: 'none',
                        borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = '#1a1a1a';
                          e.currentTarget.style.color = '#fff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#999';
                        }
                      }}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={20} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', background: '#ffffff' }}>
        {children}
      </main>
    </div>
  );
}


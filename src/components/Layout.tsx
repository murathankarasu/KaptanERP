import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import { getCurrentUser } from '../utils/getCurrentUser';
import { hasPermission, getAllPermissions, PermissionType } from '../types/permissions';
import { LogOut, LayoutDashboard, Package, ArrowDownCircle, BarChart3, Users, ShoppingCart, Warehouse, Shield, Activity, FileText, UserCircle, Truck, CreditCard, CalendarRange, BookOpen, ClipboardList, FileQuestion, DollarSign, Inbox, FileCheck, Tags, UserCircle2, Info, Brain, HelpCircle, X as CloseIcon } from 'lucide-react';
import AIBotWidget from './AIBotWidget';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);

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

  const helpContent: Record<string, { title: string; items: string[] }> = {
    '/dashboard': {
      title: 'Yönetim Paneli',
      items: [
        'Genel özet, kritik uyarılar ve son hareketler.',
        'Stok giriş/çıkış, personel çıkışları, satış trendi hızlı görüntüleme.'
      ]
    },
    '/stock-entry': {
      title: 'Stok Giriş',
      items: [
        'Geliş Tarihi: Malzemenin depoya fiilen kabul edildiği gün. Stok yaşlandırma, günlük rapor ve hareket sıralaması bu tarihe göre hesaplanır; fatura tarihi yerine kabul tarihini yazın.',
        'SKU: Ürün kartındaki stok kodu. Doluysa ürün kartı ile otomatik eşleştirme, hızlı arama ve raporlarda standart kimlik sağlar; boş bırakılabilir.',
        'Malzeme Adı: Stokta gözükecek ana ad. Aynı ürün için aynı yazım kullanın; farklı yazım ayrı malzeme gibi görünür.',
        'Kategori: Ürünün sınıfı (Hammadde, Ambalaj, Yarı Mamul vb.). Kategori bazlı filtre, rapor ve analizlerde kullanılır.',
        'Varyant (Renk/Beden): Aynı malzemenin alt tipi. Örn: Kırmızı-M; varyant girilirse stok takibi malzeme+varyant seviyesinde ayrılır.',
        'Birim: Giriş miktarının ölçü birimi (Adet, Kg, Lt...). Stok ve çıkış işlemleri bu birime göre hesaplanır.',
        'Temel Birim: Ürün kartında tanımlı ana birim. Farklı birimle giriş yapıyorsanız dönüşüm için referanstır.',
        'Dönüşüm Katsayısı: Seçilen birimin temel birime çevrim oranı. Örn: 1 Koli = 12 Adet ise 12 yazın; stok hesabı buna göre yapılır.',
        'Gelen Miktar: Bu girişte depoya alınan toplam miktar. Birim alanındaki ölçüye göre girilir.',
        'Birim Fiyat: Malzemenin giriş birim maliyeti. Toplam giriş tutarı ve maliyet raporları bu değerle hesaplanır.',
        'Tedarikçi: Malzemenin temin edildiği firma. Tedarikçi bazlı rapor, izleme ve kalite karşılaştırmalarında kullanılır.',
        'Depo: Malzemenin gireceği fiziksel depo. Zorunludur; stoklar depo bazında tutulur.',
        'Raf/Göz (Bin): Depo içi konum kodu (örn: A-01-03). Sayım ve toplamada hızlı bulunmasını sağlar.',
        'Seri/Lot: Lot veya seri numarası. İzlenebilirlik ve geri çağırma süreçleri için kritiktir; opsiyonel.',
        'SKT: Son kullanma tarihi. Yaklaşan SKT uyarıları ve FIFO takibi için kullanılır; opsiyonel.',
        'Kritik Seviye: Minimum stok eşiği. Stok bu seviyenin altına düşerse uyarı oluşturur.',
        'Not: İrsaliye no, kalite kontrol sonucu, teslim şartı gibi bu girişe özel açıklamalar.'
      ]
    },
    '/stock-output': {
      title: 'Personel Çıkış',
      items: [
        'Personellere zimmet çıkışı; miktar stoktan düşülür.',
        'Zimmet imzası için çıkış sonrası yönlendirme.'
      ]
    },
    '/stock-status': {
      title: 'Stok Durumu',
      items: [
        'Anlık stok, kritik seviye ve depo bazlı durum.',
        'Kırmızı: kritik, turuncu: uyarı, yeşil: yeterli.'
      ]
    },
    '/warehouse-management': {
      title: 'Depo Yönetimi',
      items: [
        'Depo ve raf (bin) tanımlarını yönetin.',
        'Adresleme ve stok konumlandırma.'
      ]
    },
    '/product-management': {
      title: 'Ürün Kartları',
      items: [
        'SKU, temel birim, barkod ve varyant tanımı.',
        'Birim dönüşümleri ve lot/SKT gereksinimi.'
      ]
    },
    '/shipment-management': {
      title: 'Sevkiyat Takip',
      items: [
        'Sipariş/teklif bağlı sevkiyat oluşturma.',
        'İrsaliye ve teslimat planlaması.'
      ]
    },
    '/requisition-management': {
      title: 'Satınalma Talepleri',
      items: [
        'İç talepleri topla, onayla, RFQ/PO sürecine aktar.',
        'Talep durumları: taslak, onay, kapalı.'
      ]
    },
    '/rfq-management': {
      title: 'Teklif Toplama (RFQ)',
      items: [
        'Tedarikçilere teklif isteği gönder, yanıtları kaydet.',
        'RFQ kapatılınca siparişe dönüştürülebilir.'
      ]
    },
    '/purchase-orders': {
      title: 'Satınalma Siparişleri',
      items: [
        'Onaylı siparişleri GRN/irsaliye ile kapatın.',
        'Para birimi ve miktar takibi.'
      ]
    },
    '/goods-receipts': {
      title: 'Mal Kabul (GRN)',
      items: [
        'Gelen siparişleri kabul et, stok girişine bağla.',
        'Kabul/red miktarlarını kaydedin.'
      ]
    },
    '/price-lists': {
      title: 'Fiyat Listeleri',
      items: [
        'Müşteri grubu, tarih ve miktar kırılımı ile fiyat kuralı.',
        'Önceliklendirme ve indirim yüzdesi yönetimi.'
      ]
    },
    '/customer-management': {
      title: 'Müşteri Kayıtları',
      items: [
        'Cari bilgiler, bakiye ve kredi limiti takibi.',
        'Grup, iletişim ve vergi bilgileri.'
      ]
    },
    '/customer-payments': {
      title: 'Tahsilat',
      items: [
        'Müşteri tahsilatlarını kaydet ve bakiyeyi güncelle.',
        'Ödeme tarihi ve açıklama ekleyin.'
      ]
    },
    '/customer-aging': {
      title: 'Cari Yaşlandırma',
      items: [
        'Vade bazlı alacakların dağılımı (0-30-60-90+).',
        'Nakit akış öngörüsü için kullanılır.'
      ]
    },
    '/customer-insights': {
      title: 'Müşteri Görünümü',
      items: [
        'Satış davranışı, ürün tercihleri ve ödeme alışkanlıkları.',
        'Risk/kazanç segmentasyonu.'
      ]
    },
    '/order-management': {
      title: 'Sipariş Yönetimi',
      items: [
        'Satış siparişi oluşturma, durum takibi ve fiyat kontrolü.',
        'Kredi limiti aşımı uyarıları.'
      ]
    },
    '/quotes': {
      title: 'Teklifler',
      items: [
        'Müşterilere teklif hazırlama, revize etme.',
        'Teklifi siparişe dönüştürme akışı.'
      ]
    },
    '/bom': {
      title: 'BOM Yönetimi',
      items: [
        'Ürün reçetesi (çok seviyeli) tanımlama.',
        'MRP ve üretim emirlerine girdi sağlar.'
      ]
    },
    '/mrp': {
      title: 'MRP Planlama',
      items: [
        'Talep ve stok durumuna göre malzeme ihtiyaç planı.',
        'Satınalma/üretim önerileri üretir.'
      ]
    },
    '/shop-floor': {
      title: 'Shop Floor',
      items: [
        'Üretim emirlerinin iş istasyonu bazlı takibi.',
        'Gerçekleşen süre ve duruş kayıtları.'
      ]
    },
    '/journal-entries': {
      title: 'Hareket Kayıtları',
      items: [
        'Muhasebe fişleri: tarih, açıklama, tutar, hesap.',
        'Çoklu para birimi desteği.'
      ]
    },
    '/edocs-local': {
      title: 'e-Belge PDF/UBL',
      items: [
        'e-Fatura/e-Arşiv PDF ve UBL üretimi.',
        'Yerel olarak indirme ve paylaşma.'
      ]
    },
    '/sales-invoices': {
      title: 'Satış Faturaları',
      items: [
        'Sipariş/irsaliye bağlı fatura oluşturma.',
        'Durum takibi: taslak, kesildi, ödendi.'
      ]
    },
    '/personnel-management': {
      title: 'Personel Yönetimi',
      items: [
        'Personel kartları, departman ve yetki atamaları.',
        'Yetkiler: stok giriş/çıkış, depo, dashboard vb.'
      ]
    },
    '/leave-management': {
      title: 'İzin Yönetimi',
      items: [
        'İzin talebi oluşturma/onaylama.',
        'Tarih aralığı ve durum takibi.'
      ]
    },
    '/payroll': {
      title: 'Bordro Hesaplama',
      items: [
        'Brütten nete maaş hesaplama (TR mevzuatına uygun).',
        'AGI/SGK/BES kesinti simülasyonu.'
      ]
    },
    '/activity-logs': {
      title: 'Kullanıcı İşlemleri',
      items: [
        'Kullanıcı bazlı aksiyon logları.',
        'Hata çözümü ve denetim izi.'
      ]
    },
    '/settings': {
      title: 'Ayarlar',
      items: [
        'Veri indirme (Excel) ve silme (sadece yönetici).',
        'Hesap silme, bildirimler ve sorun bildir.'
      ]
    },
    '/ai-assistant': {
      title: 'Yapay Zeka Asistanı',
      items: [
        'Serbest soru-cevap: sipariş, stok, müşteri özetleri.',
        'Stok analizi ve günlük özet raporları.'
      ]
    }
  };

  const currentHelp =
    Object.entries(helpContent).find(([path]) => location.pathname.startsWith(path))?.[1] || null;

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

      {/* Yardım Butonu */}
      {currentHelp && (
        <>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              position: 'fixed',
              right: '24px',
              bottom: '24px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid #000',
              background: '#fff',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              zIndex: 1000
            }}
            aria-label="Yardım"
          >
            <HelpCircle size={22} />
          </button>

          {showHelp && (
            <div
              onClick={() => setShowHelp(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.35)',
                zIndex: 1001,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px'
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#fff',
                  border: '2px solid #000',
                  maxWidth: '520px',
                  width: '100%',
                  padding: '20px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  color: '#000'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HelpCircle size={20} />
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{currentHelp.title}</h3>
                  </div>
                  <button
                    onClick={() => setShowHelp(false)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    aria-label="Kapat"
                  >
                    <CloseIcon size={18} />
                  </button>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.5 }}>
                  {currentHelp.items.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      <AIBotWidget
        context={{
          route: location.pathname,
          title: currentHelp?.title,
          helpItems: currentHelp?.items || []
        }}
      />
    </div>
  );
}

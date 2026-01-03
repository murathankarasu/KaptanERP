import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { addStockEntry, getStockEntries, StockEntry as StockEntryType, updateStockStatusOnEntry, checkBarcodeExists, getAllBarcodesByCompany } from '../services/stockService';
import { generateBarcode } from '../utils/barcodeGenerator';
import { getWarehouses } from '../services/warehouseService';
import { getProducts, Product } from '../services/productService';
import { addErrorLog } from '../services/userService';
import { addActivityLog } from '../services/activityLogService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCurrentUser } from '../utils/getCurrentUser';
import { exportStockEntriesToExcel } from '../utils/excelExport';
import { importStockEntriesFromExcel } from '../utils/excelImport';
import AIFormatFixModal from '../components/AIFormatFixModal';
import { Download, Plus, X, Upload, QrCode, Printer } from 'lucide-react';
import { printBarcodeLabel, printBarcodeViaBrowser } from '../services/barcodePrinterService';
import { getCompanyById } from '../services/companyService';
import { formatDate } from '../utils/formatDate';

export default function StockEntry() {
  const location = useLocation();
  const [entries, setEntries] = useState<StockEntryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [needsFormatFix, setNeedsFormatFix] = useState(false);
  const [aiFixedData, setAiFixedData] = useState<any[]>([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<StockEntryType | null>(null);
  const [printing, setPrinting] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printerSettings, setPrinterSettings] = useState({
    type: 'serial' as 'usb' | 'serial' | 'network',
    ipAddress: '',
    port: 9100,
    barcodeType: 'code128' as 'code128' | 'code39'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({
    materialName: '',
    category: '',
    supplier: '',
    startDate: '',
    endDate: ''
  });

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [autoGenerateBarcode, setAutoGenerateBarcode] = useState(true);
  const [formData, setFormData] = useState({
    arrivalDate: new Date().toISOString().split('T')[0],
    sku: '',
    barcode: '',
    materialName: '',
    category: '',
    variant: '',
    unit: '',
    baseUnit: '',
    conversionFactor: '',
    quantity: '',
    unitPrice: '',
    supplier: '',
    warehouse: '',
    binCode: '',
    serialLot: '',
    expiryDate: '',
    note: ''
  });

  useEffect(() => {
    loadEntries();
    loadWarehouses();
    loadProducts();
    
    // Yazıcı ayarlarını yükle
    const savedSettings = localStorage.getItem('barcodePrinterSettings');
    if (savedSettings) {
      try {
        setPrinterSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Yazıcı ayarları yüklenirken hata:', e);
      }
    }
  }, [filters]);

  // Stok kartından gelen ön-dolum (query parametreleri)
  useEffect(() => {
    if (!location.search || products.length === 0) return;
    const params = new URLSearchParams(location.search);
    const sku = params.get('sku');
    const materialName = params.get('materialName');
    
    if (sku || materialName) {
      // SKU veya ürün adına göre ürün bul
      const product = products.find(p => 
        (sku && p.sku === sku) || (materialName && p.name === materialName)
      );
      
      if (product) {
        handleProductSelect(product.id || '');
        setFormData((prev) => ({
          ...prev,
          unit: params.get('unit') || prev.unit || product.baseUnit,
          variant: params.get('variant') || prev.variant
        }));
        setShowForm(true);
        // Form açıldığında tarihi bugünün tarihi olarak ayarla
        setFormData(prev => ({
          ...prev,
          arrivalDate: new Date().toISOString().split('T')[0]
        }));
      }
    }
  }, [location.search, products]);

  const loadWarehouses = async () => {
    try {
      const currentCompany = getCurrentCompany();
      const data = await getWarehouses(currentCompany?.companyId);
      setWarehouses(data);
    } catch (error) {
      console.error('Depolar yüklenirken hata:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const currentCompany = getCurrentCompany();
      const data = await getProducts(currentCompany?.companyId);
      setProducts(data);
    } catch (error) {
      console.error('Ürün kartları yüklenirken hata:', error);
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      setSelectedProductId('');
      setFormData(prev => ({
        ...prev,
        sku: '',
        materialName: '',
        category: '',
        baseUnit: '',
        variant: '',
        unit: ''
      }));
      return;
    }

    setSelectedProductId(productId);
    const variantText = product.variant 
      ? [product.variant.color, product.variant.size].filter(Boolean).join(' ')
      : '';

    setFormData(prev => ({
      ...prev,
      sku: product.sku || '',
      materialName: product.name,
      category: product.category || '',
      baseUnit: product.baseUnit,
      unit: product.baseUnit, // Varsayılan olarak temel birim
      variant: variantText
    }));
  };

  const loadEntries = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const filterParams: any = {
        companyId: currentCompany?.companyId
      };
      
      if (filters.materialName) filterParams.materialName = filters.materialName;
      if (filters.category) filterParams.category = filters.category;
      if (filters.supplier) filterParams.supplier = filters.supplier;
      if (filters.startDate) filterParams.startDate = new Date(filters.startDate);
      if (filters.endDate) filterParams.endDate = new Date(filters.endDate);

      const data = await getStockEntries(filterParams);
      setEntries(data);
    } catch (error: any) {
      console.error('Stok girişleri yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Stok girişleri yüklenirken hata: ${error.message || error}`,
        'StockEntry',
        userInfo?.id,
        userInfo?.username
      );
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Çift submit'i engelle
    if (submitting) return;

    // Date input (YYYY-MM-DD) için local Date üret (timezone kayması olmasın)
    const parseLocalDate = (s: string) => {
      const parts = String(s || '').split('-').map((x) => parseInt(x, 10));
      if (parts.length === 3 && !parts.some((n) => Number.isNaN(n))) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
      const d = new Date(s);
      return d;
    };
    
    // Sayısal alan validasyonu
    const quantity = parseFloat(formData.quantity);
    const unitPrice = formData.unitPrice ? parseFloat(formData.unitPrice) : 0;
    
    if (isNaN(quantity) || quantity <= 0) {
      alert('Gelen Miktar geçerli bir sayı olmalı ve 0\'dan büyük olmalıdır');
      return;
    }
    
    if (formData.unitPrice && (isNaN(unitPrice) || unitPrice < 0)) {
      alert('Birim Fiyat geçerli bir sayı olmalıdır');
      return;
    }
    
    if (!selectedProductId || !formData.materialName) {
      alert('Lütfen ürün kartından bir ürün seçin');
      return;
    }
    
    if (!formData.warehouse) {
      alert('Depo seçimi zorunludur');
      return;
    }
    
    // Barkod işlemleri
    const currentCompany = getCurrentCompany();
    let finalBarcode = formData.barcode;
    
    // Otomatik barkod oluştur
    if (autoGenerateBarcode && !finalBarcode && currentCompany?.companyId) {
      try {
        const existingBarcodes = await getAllBarcodesByCompany(currentCompany.companyId);
        finalBarcode = generateBarcode(currentCompany.companyId, existingBarcodes);
      } catch (error) {
        console.error('Barkod oluşturulurken hata:', error);
      }
    }
    
    // Barkod kontrolü
    if (finalBarcode && currentCompany?.companyId) {
      const barcodeExists = await checkBarcodeExists(finalBarcode, currentCompany.companyId);
      if (barcodeExists) {
        alert('Bu barkod daha önce girilmiş. Aynı barkod tekrar kullanılamaz.');
        return;
      }
    }
    
    try {
      setSubmitting(true);
      const entry: StockEntryType = {
        arrivalDate: parseLocalDate(formData.arrivalDate),
        sku: formData.sku || undefined,
        barcode: finalBarcode || undefined,
        materialName: formData.materialName,
        category: formData.category,
        variant: formData.variant || undefined,
        unit: formData.unit,
        baseUnit: formData.baseUnit || undefined,
        conversionFactor: formData.conversionFactor ? parseFloat(formData.conversionFactor) : undefined,
        quantity: quantity,
        unitPrice: unitPrice > 0 ? unitPrice : undefined,
        supplier: formData.supplier || undefined,
        warehouse: formData.warehouse || undefined,
        binCode: formData.binCode || undefined,
        serialLot: formData.serialLot || undefined,
        expiryDate: formData.expiryDate ? parseLocalDate(formData.expiryDate) : undefined,
        note: formData.note,
        companyId: currentCompany?.companyId
      };

      const entryId = await addStockEntry(entry);
      
      // Ürün kartından kritik seviyeyi al
      const selectedProduct = products.find(p => p.id === selectedProductId);
      const criticalLevel = selectedProduct?.criticalLevel || 0;
      
      // Stok durumunu güncelle (depo bilgisi ile)
      await updateStockStatusOnEntry(
        formData.materialName,
        quantity,
        formData.unit,
        criticalLevel,
        currentCompany?.companyId,
        formData.warehouse || undefined,
        formData.sku || undefined,
        formData.variant || undefined,
        formData.binCode || undefined
      );

      // Aktivite logu kaydet
      const currentUser = getCurrentUser();
      await addActivityLog({
        userId: currentUser?.id,
        username: currentUser?.username,
        userEmail: currentUser?.email,
        personnelId: currentUser?.personnelId,
        personnelName: currentUser?.fullName,
        action: `Stok Giriş Eklendi: ${formData.materialName} (${quantity} ${formData.unit})`,
        module: 'stock_entry',
        details: JSON.stringify({
          entryId,
          materialName: formData.materialName,
          quantity,
          unit: formData.unit,
          unitPrice,
          supplier: formData.supplier,
          warehouse: formData.warehouse
        }),
        companyId: currentCompany?.companyId
      });

      alert('Stok girişi başarıyla eklendi!');
      setShowForm(false);
      setSelectedProductId('');
      setFormData({
        arrivalDate: new Date().toISOString().split('T')[0],
        sku: '',
        barcode: '',
        materialName: '',
        category: '',
        variant: '',
        unit: '',
        baseUnit: '',
        conversionFactor: '',
        quantity: '',
        unitPrice: '',
        supplier: '',
        warehouse: '',
        binCode: '',
        serialLot: '',
        expiryDate: '',
        note: ''
      });
      loadEntries();
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Stok girişi eklenirken hata: ${error.message || error}`,
        'StockEntry',
        userInfo?.id,
        userInfo?.username
      );
      alert('Hata: ' + (error.message || 'Stok girişi eklenirken bir hata oluştu'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    exportStockEntriesToExcel(entries, `stok_girisleri_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Dosya tipi kontrolü
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Lütfen geçerli bir Excel dosyası seçin (.xlsx veya .xls)');
      return;
    }

    try {
      setImporting(true);
      setImportProgress(0);

      const importResult = await importStockEntriesFromExcel(
        file,
        (progress) => setImportProgress(progress),
        false // İlk denemede AI kullanma
      );
      
      // Format düzeltme gerekiyorsa kullanıcıya sor
      if (importResult.needsFormatFix) {
        const useAI = confirm(
          'Excel dosyasının formatı beklenen formatta değil. ' +
          'AI ile otomatik düzeltme yapmak ister misiniz? (Ücretli servis)'
        );
        
        if (useAI) {
          const aiResult = await importStockEntriesFromExcel(
            file,
            (progress) => setImportProgress(progress),
            true // AI ile düzelt
          );
          
          if (aiResult.aiFixedData && aiResult.aiFixedData.length > 0) {
            setAiFixedData(aiResult.aiFixedData);
            setNeedsFormatFix(true);
            setImporting(false);
            setImportProgress(0);
            return;
          }
        } else {
          alert('Excel dosyası beklenen formatta değil. Lütfen doğru formatı kullanın.');
          setImporting(false);
          setImportProgress(0);
          return;
        }
      }
      
      const { entries: importedEntries } = importResult;

      // Her bir girişi kaydet
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const entry of importedEntries) {
        try {
          await addStockEntry(entry);
          
          // Ürün kartından kritik seviyeyi al
          const currentCompany = getCurrentCompany();
          let criticalLevel = 0;
          if (entry.sku) {
            const product = products.find(p => p.sku === entry.sku);
            criticalLevel = product?.criticalLevel || 0;
          } else if (entry.materialName) {
            const product = products.find(p => p.name === entry.materialName);
            criticalLevel = product?.criticalLevel || 0;
          }
          
          // Stok durumunu güncelle (depo bilgisi ile)
          await updateStockStatusOnEntry(
            entry.materialName,
            entry.quantity,
            entry.unit,
            criticalLevel,
            currentCompany?.companyId,
            entry.warehouse || undefined,
            entry.sku || undefined,
            entry.variant || undefined,
            entry.binCode || undefined
          );
          
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`${entry.materialName}: ${error.message}`);
        }
      }

      // Sonuçları göster
      let message = `İçe aktarma tamamlandı!\nBaşarılı: ${successCount}\nBaşarısız: ${errorCount}`;
      if (errors.length > 0 && errors.length <= 5) {
        message += `\n\nHatalar:\n${errors.join('\n')}`;
      } else if (errors.length > 5) {
        message += `\n\nİlk 5 hata:\n${errors.slice(0, 5).join('\n')}`;
      }
      
      alert(message);
      
      // Dosya input'unu temizle
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Listeyi yenile
      loadEntries();
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Excel dosyası içe aktarılırken hata: ${error.message || error}`,
        'StockEntry',
        userInfo?.id,
        userInfo?.username
      );
      alert('Excel dosyası içe aktarılırken hata: ' + error.message);
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  const clearFilters = () => {
    setFilters({
      materialName: '',
      category: '',
      supplier: '',
      startDate: '',
      endDate: ''
    });
  };

  const uniqueCategories = Array.from(new Set(entries.map(e => e.category))).filter(Boolean);
  const uniqueSuppliers = Array.from(new Set(entries.map(e => e.supplier))).filter(Boolean);
  const uniqueMaterials = Array.from(new Set(entries.map(e => e.materialName))).filter(Boolean);

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
            Stok Giriş Takip
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              disabled={importing}
            >
              <Upload size={18} />
              {importing ? `İçe Aktarılıyor... %${Math.round(importProgress)}` : 'Excel\'den İçe Aktar'}
            </button>
            <button onClick={handleExport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} />
              Excel'e Aktar
            </button>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} />
              Yeni Giriş
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="excel-form" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Yeni Stok Girişi</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#7f8c8d" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid-4">
                <div className="excel-form-group">
                  <label className="excel-form-label">Geliş Tarihi *</label>
                  <input
                    type="date"
                    className="excel-form-input"
                    value={formData.arrivalDate}
                    onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="excel-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="excel-form-label">Ürün Kartı *</label>
                  <select
                    className="excel-form-select"
                    value={selectedProductId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    required
                    style={{ fontSize: '14px' }}
                  >
                    <option value="">Ürün kartından seçiniz</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.sku ? `[${product.sku}] ` : ''}{product.name}
                        {product.category ? ` - ${product.category}` : ''}
                        {product.variant ? ` (${[product.variant.color, product.variant.size].filter(Boolean).join(' ')})` : ''}
                      </option>
                    ))}
                  </select>
                  {products.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>
                      Henüz ürün kartı yok. Önce <a href="/product-management" style={{ color: '#007bff', textDecoration: 'underline' }}>Ürün Kartları</a> sayfasından ürün ekleyin.
                    </div>
                  )}
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">SKU</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.sku}
                    readOnly
                    style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                    placeholder="Ürün kartından otomatik"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Barkod</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="excel-form-input"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      disabled={autoGenerateBarcode}
                      placeholder={autoGenerateBarcode ? 'Otomatik oluşturulacak' : 'Barkod girin (tekrar kontrolü yapılır)'}
                      style={{ flex: 1 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={autoGenerateBarcode}
                        onChange={(e) => {
                          setAutoGenerateBarcode(e.target.checked);
                          if (e.target.checked) {
                            setFormData({ ...formData, barcode: '' });
                          }
                        }}
                      />
                      Otomatik Oluştur
                    </label>
                  </div>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Malzeme Adı</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.materialName}
                    readOnly
                    style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                    placeholder="Ürün kartından otomatik"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Kategori</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.category}
                    readOnly
                    style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                    placeholder="Ürün kartından otomatik"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Varyant (Renk/Beden)</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.variant}
                    onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                    placeholder="Ürün kartından otomatik (değiştirilebilir)"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Birim *</label>
                  <select
                    className="excel-form-select"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  >
                    <option value="">Seçiniz</option>
                    {formData.baseUnit && (
                      <option value={formData.baseUnit}>{formData.baseUnit} (Temel Birim)</option>
                    )}
                    {selectedProductId && (() => {
                      const product = products.find(p => p.id === selectedProductId);
                      return product?.units?.map(conv => conv.toUnit).filter(u => u !== formData.baseUnit) || [];
                    })().map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                    <option value="Adet">Adet</option>
                    <option value="Kg">Kg</option>
                    <option value="Lt">Lt</option>
                    <option value="m²">m²</option>
                    <option value="m³">m³</option>
                    <option value="Paket">Paket</option>
                    <option value="Koli">Koli</option>
                    <option value="Kutu">Kutu</option>
                  </select>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Temel Birim</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.baseUnit}
                    readOnly
                    style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                    placeholder="Ürün kartından otomatik"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Dönüşüm Katsayısı</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="excel-form-input"
                    value={formData.conversionFactor}
                    onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                    placeholder="Örn: Koli→Adet"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Gelen Miktar *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="excel-form-input"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Birim Fiyat</label>
                  <input
                    type="number"
                    step="0.01"
                    className="excel-form-input"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="Birim fiyat (opsiyonel)"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Tedarikçi</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Tedarikçi (opsiyonel)"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Depo <span style={{ color: 'red' }}>*</span></label>
                  <select
                    className="excel-form-select"
                    value={formData.warehouse}
                    onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                    required
                  >
                    <option value="">Depo Seçiniz (Zorunlu)</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.name}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                  {warehouses.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Depo Yönetimi sayfasından depo ekleyebilirsiniz.
                    </div>
                  )}
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Raf/Göz (Bin)</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.binCode}
                    onChange={(e) => setFormData({ ...formData, binCode: e.target.value })}
                    placeholder="Örn: A-01-03"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Seri/Lot</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.serialLot}
                    onChange={(e) => setFormData({ ...formData, serialLot: e.target.value })}
                    placeholder="Lot veya seri no"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">SKT</label>
                  <input
                    type="date"
                    className="excel-form-input"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="excel-form-group">
                <label className="excel-form-label">Not</label>
                <textarea
                  className="excel-form-input"
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>İptal</button>
              </div>
            </form>
          </div>
        )}

        {/* Filtreler */}
        <div className="filter-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Filtrele</h3>
            <button onClick={clearFilters} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              Filtreleri Temizle
            </button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label className="excel-form-label">Malzeme Adı</label>
              <select
                className="excel-form-select"
                value={filters.materialName}
                onChange={(e) => setFilters({ ...filters, materialName: e.target.value })}
              >
                <option value="">Tümü</option>
                {uniqueMaterials.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="excel-form-label">Kategori</label>
              <select
                className="excel-form-select"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="">Tümü</option>
                {uniqueCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="excel-form-label">Tedarikçi</label>
              <select
                className="excel-form-select"
                value={filters.supplier}
                onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
              >
                <option value="">Tümü</option>
                {uniqueSuppliers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="excel-form-label">Başlangıç Tarihi</label>
              <input
                type="date"
                className="excel-form-input"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label className="excel-form-label">Bitiş Tarihi</label>
              <input
                type="date"
                className="excel-form-input"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Tablo */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Henüz stok girişi kaydı bulunmamaktadır.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Geliş Tarihi</th>
                  <th>SKU</th>
                  <th>Barkod</th>
                  <th>Malzeme Adı</th>
                  <th>Kategori</th>
                  <th>Varyant</th>
                  <th>Birim</th>
                  <th>Gelen Miktar</th>
                  <th>Birim Fiyat</th>
                  <th>Tedarikçi</th>
                  <th>Depo</th>
                  <th>Raf/Göz</th>
                  <th>Seri/Lot</th>
                  <th>SKT</th>
                  <th>Not</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      {formatDate(entry.arrivalDate)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      {entry.sku || '-'}
                    </td>
                    <td>
                      {entry.barcode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{entry.barcode}</span>
                          <button
                            onClick={() => {
                              setSelectedBarcode(entry.barcode!);
                              setSelectedEntry(entry);
                              setShowQRModal(true);
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid #000',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px'
                            }}
                            title="QR Kod Göster"
                          >
                            <QrCode size={14} />
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{entry.materialName}</td>
                    <td>{entry.category}</td>
                    <td>{entry.variant || '-'}</td>
                    <td>{entry.unit}</td>
                    <td>{entry.quantity}</td>
                    <td>{entry.unitPrice ? entry.unitPrice.toFixed(2) + ' ₺' : '-'}</td>
                    <td>{entry.supplier || '-'}</td>
                    <td>{entry.warehouse || '-'}</td>
                    <td>{entry.binCode || '-'}</td>
                    <td>{entry.serialLot || '-'}</td>
                    <td>{entry.expiryDate ? formatDate(entry.expiryDate) : '-'}</td>
                    <td>{entry.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* AI Format Düzeltme Modal */}
        <AIFormatFixModal
          isOpen={needsFormatFix && aiFixedData.length > 0}
          onClose={() => {
            setNeedsFormatFix(false);
            setAiFixedData([]);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          onAccept={async (acceptedData) => {
            try {
              setImporting(true);
              setImportProgress(0);
              
              const currentCompany = getCurrentCompany();
              let successCount = 0;
              let errorCount = 0;
              
              for (let i = 0; i < acceptedData.length; i++) {
                const row = acceptedData[i];
                setImportProgress((i / acceptedData.length) * 100);
                
                try {
                  const entry: StockEntryType = {
                    arrivalDate: row.arrivalDate ? new Date(row.arrivalDate) : new Date(),
                    materialName: String(row.materialName || row['Malzeme Adı'] || '').trim(),
                    category: String(row.category || row['Kategori'] || '').trim(),
                    unit: String(row.unit || row['Birim'] || '').trim(),
                    quantity: parseFloat(row.quantity || row['Gelen Miktar'] || '0'),
                    unitPrice: parseFloat(row.unitPrice || row['Birim Fiyat'] || '0'),
                    supplier: String(row.supplier || row['Tedarikçi'] || '').trim(),
                    note: String(row.note || row['Not'] || '').trim(),
                    companyId: currentCompany?.companyId
                  };
                  
                  if (entry.materialName && entry.category && entry.unit) {
                    await addStockEntry(entry);
                    
                    // Ürün kartından kritik seviyeyi al
                    let criticalLevel = 0;
                    if (entry.sku) {
                      const product = products.find(p => p.sku === entry.sku);
                      criticalLevel = product?.criticalLevel || 0;
                    } else if (entry.materialName) {
                      const product = products.find(p => p.name === entry.materialName);
                      criticalLevel = product?.criticalLevel || 0;
                    }
                    
                    await updateStockStatusOnEntry(
                      entry.materialName,
                      entry.quantity,
                      entry.unit,
                      criticalLevel,
                      currentCompany?.companyId,
                      entry.warehouse || undefined,
                      entry.sku || undefined,
                      entry.variant || undefined,
                      entry.binCode || undefined
                    );
                    successCount++;
                  } else {
                    errorCount++;
                  }
                } catch (error: any) {
                  errorCount++;
                }
              }
              
              alert(`İçe aktarma tamamlandı!\nBaşarılı: ${successCount}\nBaşarısız: ${errorCount}`);
              
              setNeedsFormatFix(false);
              setAiFixedData([]);
              loadEntries();
            } catch (error: any) {
              alert('Hata: ' + error.message);
            } finally {
              setImporting(false);
              setImportProgress(0);
            }
          }}
          aiFixedData={aiFixedData}
          originalErrors={[]}
        />

        {/* QR Kod Modal */}
        {showQRModal && selectedBarcode && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }} onClick={() => setShowQRModal(false)}>
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '90%',
              border: '2px solid #000',
              textAlign: 'center'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Barkod QR Kodu</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div style={{
                padding: '20px',
                background: '#fff',
                border: '2px solid #000',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/barcode-scanner?companyCode=${encodeURIComponent(getCurrentCompany()?.companyCode || '')}&barcode=${selectedBarcode}`)}`}
                  alt="QR Code"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Barkod Numarası</div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 600, 
                  fontFamily: 'monospace',
                  padding: '8px',
                  background: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  {selectedBarcode}
                </div>
              </div>
              
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
                Bu QR kodu telefonunuzla okutarak ürün bilgilerine erişebilirsiniz.
              </div>
              
              {/* Yazdırma Butonları - Modern UI */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                marginBottom: '15px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px'
                }}>
                  <button
                    onClick={async () => {
                      try {
                        setPrinting(true);
                        // Şirket bilgilerini al
                        const currentCompany = getCurrentCompany();
                        let companyInfo: any = {};
                        if (currentCompany?.companyId) {
                          const company = await getCompanyById(currentCompany.companyId);
                          if (company) {
                            companyInfo = {
                              name: company.name,
                              logoUrl: company.logoUrl,
                              companyCode: currentCompany?.companyCode || '',
                              website: company.description?.match(/www\.[^\s]+/)?.[0] || '',
                              email: company.description?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || ''
                            };
                          }
                        }
                        
                        await printBarcodeLabel(
                          selectedBarcode,
                          selectedEntry?.materialName,
                          selectedEntry?.sku,
                          selectedEntry?.variant,
                          selectedEntry?.arrivalDate ? new Date(selectedEntry.arrivalDate) : undefined,
                          companyInfo,
                          {
                            printerType: printerSettings.type,
                            ipAddress: printerSettings.type === 'network' ? printerSettings.ipAddress : undefined,
                            port: printerSettings.type === 'network' ? printerSettings.port : undefined,
                            barcodeType: printerSettings.barcodeType,
                            showText: true
                          }
                        );
                        alert('Barkod yazıcıya gönderildi!');
                      } catch (error: any) {
                        console.error('Yazdırma hatası:', error);
                        // Fallback: Tarayıcı yazdırma
                        if (confirm('Yazıcıya bağlanılamadı. Tarayıcı yazdırma ile devam etmek ister misiniz?')) {
                          const currentCompany = getCurrentCompany();
                          let companyInfo: any = {};
                          if (currentCompany?.companyId) {
                            const company = await getCompanyById(currentCompany.companyId);
                            if (company) {
                              companyInfo = {
                                name: company.name,
                                logoUrl: company.logoUrl,
                                companyCode: currentCompany?.companyCode || '',
                                website: company.description?.match(/www\.[^\s]+/)?.[0] || '',
                                email: company.description?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || ''
                              };
                            }
                          }
                          await printBarcodeViaBrowser(
                            selectedBarcode,
                            selectedEntry?.materialName,
                            selectedEntry?.sku,
                            selectedEntry?.variant,
                            selectedEntry?.arrivalDate ? new Date(selectedEntry.arrivalDate) : undefined,
                            companyInfo
                          );
                        }
                      } finally {
                        setPrinting(false);
                      }
                    }}
                    disabled={printing}
                    style={{
                      padding: '14px 20px',
                      background: printing ? '#ccc' : '#000',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: printing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.2s',
                      boxShadow: printing ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      if (!printing) {
                        e.currentTarget.style.background = '#333';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!printing) {
                        e.currentTarget.style.background = '#000';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }
                    }}
                  >
                    <Printer size={18} />
                    {printing ? 'Yazdırılıyor...' : 'Yazıcıya Yazdır'}
                  </button>
                  
                  <button
                    onClick={async () => {
                      // Şirket bilgilerini al
                      const currentCompany = getCurrentCompany();
                      let companyInfo: any = {};
                      if (currentCompany?.companyId) {
                        const company = await getCompanyById(currentCompany.companyId);
                        if (company) {
                          companyInfo = {
                            name: company.name,
                            logoUrl: company.logoUrl,
                            companyCode: currentCompany?.companyCode || '',
                            website: company.description?.match(/www\.[^\s]+/)?.[0] || '',
                            email: company.description?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || ''
                          };
                        }
                      }
                      await printBarcodeViaBrowser(
                        selectedBarcode,
                        selectedEntry?.materialName,
                        selectedEntry?.sku,
                        selectedEntry?.variant,
                        selectedEntry?.arrivalDate ? new Date(selectedEntry.arrivalDate) : undefined,
                        companyInfo
                      );
                    }}
                    style={{
                      padding: '14px 20px',
                      background: '#fff',
                      color: '#000',
                      border: '2px solid #000',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f5f5';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                  >
                    <Printer size={18} />
                    Tarayıcı ile Yazdır
                  </button>
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => setShowPrinterSettings(true)}
                    style={{
                      padding: '10px 16px',
                      background: '#fff',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9f9f9';
                      e.currentTarget.style.borderColor = '#000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    ⚙️ Ayarlar
                  </button>
                  
                  <button
                    onClick={() => {
                      const companyCode = getCurrentCompany()?.companyCode || '';
                      const url = `${window.location.origin}/barcode-scanner?companyCode=${encodeURIComponent(companyCode)}&barcode=${selectedBarcode}`;
                      navigator.clipboard.writeText(url);
                      alert('Link kopyalandı!');
                    }}
                    style={{
                      padding: '10px 16px',
                      background: '#fff',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9f9f9';
                      e.currentTarget.style.borderColor = '#000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    📋 Linki Kopyala
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowQRModal(false);
                      setSelectedEntry(null);
                    }}
                    style={{
                      padding: '10px 16px',
                      background: '#fff',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f9f9f9';
                      e.currentTarget.style.borderColor = '#000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Yazıcı Ayarları Modal */}
        {showPrinterSettings && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }} onClick={() => setShowPrinterSettings(false)}>
            <div style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              border: '2px solid #000'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Yazıcı Ayarları</h3>
                <button
                  onClick={() => setShowPrinterSettings(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                    Yazıcı Tipi
                  </label>
                  <select
                    value={printerSettings.type}
                    onChange={(e) => setPrinterSettings({ ...printerSettings, type: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontSize: '14px'
                    }}
                  >
                    <option value="serial">USB/Seri Port</option>
                    <option value="network">Ağ Yazıcısı (Network)</option>
                  </select>
                </div>

                {printerSettings.type === 'network' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                        IP Adresi
                      </label>
                      <input
                        type="text"
                        value={printerSettings.ipAddress}
                        onChange={(e) => setPrinterSettings({ ...printerSettings, ipAddress: e.target.value })}
                        placeholder="Örn: 192.168.1.100"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #000',
                          borderRadius: '0',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                        Port
                      </label>
                      <input
                        type="number"
                        value={printerSettings.port}
                        onChange={(e) => setPrinterSettings({ ...printerSettings, port: parseInt(e.target.value) || 9100 })}
                        placeholder="9100"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #000',
                          borderRadius: '0',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                    Barkod Tipi
                  </label>
                  <select
                    value={printerSettings.barcodeType}
                    onChange={(e) => setPrinterSettings({ ...printerSettings, barcodeType: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontSize: '14px'
                    }}
                  >
                    <option value="code128">Code128 (Önerilen)</option>
                    <option value="code39">Code39</option>
                  </select>
                </div>

                <div style={{
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <strong>Notlar:</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.6' }}>
                    <li>USB/Seri Port: Chrome veya Edge tarayıcısı gerekir</li>
                    <li>Ağ Yazıcısı: IP adresi ve port numarası gerekir (genellikle 9100)</li>
                    <li>Ayarlar tarayıcıda saklanır</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      // Ayarları localStorage'a kaydet
                      localStorage.setItem('barcodePrinterSettings', JSON.stringify(printerSettings));
                      setShowPrinterSettings(false);
                      alert('Ayarlar kaydedildi!');
                    }}
                  >
                    Kaydet
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowPrinterSettings(false)}
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

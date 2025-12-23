import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { addStockEntry, getStockEntries, StockEntry as StockEntryType, updateStockStatusOnEntry } from '../services/stockService';
import { getWarehouses } from '../services/warehouseService';
import { addErrorLog } from '../services/userService';
import { addActivityLog } from '../services/activityLogService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCurrentUser } from '../utils/getCurrentUser';
import { exportStockEntriesToExcel } from '../utils/excelExport';
import { importStockEntriesFromExcel } from '../utils/excelImport';
import AIFormatFixModal from '../components/AIFormatFixModal';
import { Download, Plus, X, Upload } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

export default function StockEntry() {
  const location = useLocation();
  const [entries, setEntries] = useState<StockEntryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [needsFormatFix, setNeedsFormatFix] = useState(false);
  const [aiFixedData, setAiFixedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({
    materialName: '',
    category: '',
    supplier: '',
    startDate: '',
    endDate: ''
  });

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    arrivalDate: new Date().toISOString().split('T')[0],
    sku: '',
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
    note: '',
    criticalLevel: ''
  });

  useEffect(() => {
    loadEntries();
    loadWarehouses();
  }, [filters]);

  // Stok kartından gelen ön-dolum (query parametreleri)
  useEffect(() => {
    if (!location.search) return;
    const params = new URLSearchParams(location.search);
    const hasPrefill = ['sku', 'materialName', 'category', 'unit', 'baseUnit', 'variant'].some(k => params.get(k));
    if (!hasPrefill) return;

    setFormData((prev) => ({
      ...prev,
      sku: params.get('sku') || prev.sku,
      materialName: params.get('materialName') || prev.materialName,
      category: params.get('category') || prev.category,
      unit: params.get('unit') || prev.unit,
      baseUnit: params.get('baseUnit') || prev.baseUnit,
      variant: params.get('variant') || prev.variant
    }));
    setShowForm(true);
  }, [location.search]);

  const loadWarehouses = async () => {
    try {
      const currentCompany = getCurrentCompany();
      const data = await getWarehouses(currentCompany?.companyId);
      setWarehouses(data);
    } catch (error) {
      console.error('Depolar yüklenirken hata:', error);
    }
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
    
    // Sayısal alan validasyonu
    const quantity = parseFloat(formData.quantity);
    const unitPrice = parseFloat(formData.unitPrice);
    const criticalLevel = formData.criticalLevel ? parseFloat(formData.criticalLevel) : 0;
    
    if (isNaN(quantity) || quantity <= 0) {
      alert('Gelen Miktar geçerli bir sayı olmalı ve 0\'dan büyük olmalıdır');
      return;
    }
    
    if (isNaN(unitPrice) || unitPrice < 0) {
      alert('Birim Fiyat geçerli bir sayı olmalıdır');
      return;
    }
    
    if (!formData.warehouse) {
      alert('Depo seçimi zorunludur');
      return;
    }
    
    if (formData.criticalLevel && (isNaN(criticalLevel) || criticalLevel < 0)) {
      alert('Kritik Seviye geçerli bir sayı olmalıdır');
      return;
    }
    
    try {
      const currentCompany = getCurrentCompany();
      const entry: StockEntryType = {
        arrivalDate: new Date(formData.arrivalDate),
        sku: formData.sku || undefined,
        materialName: formData.materialName,
        category: formData.category,
        variant: formData.variant || undefined,
        unit: formData.unit,
        baseUnit: formData.baseUnit || undefined,
        conversionFactor: formData.conversionFactor ? parseFloat(formData.conversionFactor) : undefined,
        quantity: quantity,
        unitPrice: unitPrice,
        supplier: formData.supplier,
        warehouse: formData.warehouse || undefined,
        binCode: formData.binCode || undefined,
        serialLot: formData.serialLot || undefined,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
        note: formData.note,
        companyId: currentCompany?.companyId
      };

      const entryId = await addStockEntry(entry);
      
      // Stok durumunu güncelle (depo bilgisi ile)
      await updateStockStatusOnEntry(
        formData.materialName,
        quantity,
        formData.unit,
        criticalLevel,
        currentCompany?.companyId,
        formData.warehouse || undefined
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
      setFormData({
        arrivalDate: new Date().toISOString().split('T')[0],
        sku: '',
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
        note: '',
        criticalLevel: ''
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
          
          // Stok durumunu güncelle (depo bilgisi ile)
          const currentCompany = getCurrentCompany();
          await updateStockStatusOnEntry(
            entry.materialName,
            entry.quantity,
            entry.unit,
            0, // Kritik seviye import'ta belirtilmemişse 0
            currentCompany?.companyId,
            entry.warehouse || undefined
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
                    required
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">SKU</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ürün kartı SKU (opsiyonel)"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Malzeme Adı *</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.materialName}
                    onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                    required
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Kategori *</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Varyant (Renk/Beden)</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.variant}
                    onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                    placeholder="Örn: Kırmızı-M"
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
                    <option value="Adet">Adet</option>
                    <option value="Kg">Kg</option>
                    <option value="Lt">Lt</option>
                    <option value="m²">m²</option>
                    <option value="m³">m³</option>
                    <option value="Paket">Paket</option>
                  </select>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Temel Birim</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.baseUnit}
                    onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                    placeholder="Ürün kartındaki temel birim"
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
                  <label className="excel-form-label">Birim Fiyat *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="excel-form-input"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Tedarikçi *</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    required
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
                <div className="excel-form-group">
                  <label className="excel-form-label">Kritik Seviye</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="excel-form-input"
                    value={formData.criticalLevel}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({ ...formData, criticalLevel: value });
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
                        e.target.setCustomValidity('Geçerli bir sayı giriniz');
                      } else {
                        e.target.setCustomValidity('');
                      }
                    }}
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
                <button type="submit" className="btn btn-primary">Kaydet</button>
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
                  <th>Malzeme Adı</th>
                  <th>Kategori</th>
                  <th>Birim</th>
                  <th>Gelen Miktar</th>
                  <th>Birim Fiyat</th>
                  <th>Tedarikçi</th>
                  <th>Depo</th>
                  <th>Not</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      {formatDate(entry.arrivalDate)}
                    </td>
                    <td>{entry.materialName}</td>
                    <td>{entry.category}</td>
                    <td>{entry.unit}</td>
                    <td>{entry.quantity}</td>
                    <td>{entry.unitPrice.toFixed(2)} ₺</td>
                    <td>{entry.supplier}</td>
                    <td>{entry.warehouse || '-'}</td>
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
                    await updateStockStatusOnEntry(entry.materialName, entry.quantity, entry.unit, 0, currentCompany?.companyId, entry.warehouse || undefined);
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
      </div>
    </Layout>
  );
}

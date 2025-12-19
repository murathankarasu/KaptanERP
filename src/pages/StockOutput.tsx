import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { addStockOutput, getStockOutputs, StockOutput as StockOutputType, getAllStockStatus } from '../services/stockService';
import { getPersonnel } from '../services/personnelService';
import { getWarehouses } from '../services/warehouseService';
import { addErrorLog } from '../services/userService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { exportStockOutputsToExcel } from '../utils/excelExport';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, X, FileSignature } from 'lucide-react';

export default function StockOutput() {
  const [outputs, setOutputs] = useState<StockOutputType[]>([]);
  const [stockStatus, setStockStatus] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    employee: '',
    department: '',
    materialName: '',
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState({
    issueDate: new Date().toISOString().split('T')[0],
    employee: '',
    department: '',
    sku: '',
    variant: '',
    materialName: '',
    quantity: '',
    issuedBy: '',
    warehouse: '',
    binCode: '',
    serialLot: '',
    expiryDate: '',
    description: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const filterParams: any = {
        companyId: currentCompany?.companyId
      };
      
      if (filters.employee) filterParams.employee = filters.employee;
      if (filters.department) filterParams.department = filters.department;
      if (filters.materialName) filterParams.materialName = filters.materialName;
      if (filters.startDate) filterParams.startDate = new Date(filters.startDate);
      if (filters.endDate) filterParams.endDate = new Date(filters.endDate);

      const [outputsData, statusData, personnelData, warehousesData] = await Promise.all([
        getStockOutputs(filterParams),
        getAllStockStatus(currentCompany?.companyId),
        getPersonnel({ companyId: currentCompany?.companyId }),
        getWarehouses(currentCompany?.companyId)
      ]);
      
      setOutputs(outputsData);
      setStockStatus(statusData);
      setPersonnel(personnelData);
      setWarehouses(warehousesData);
    } catch (error: any) {
      console.error('Veriler yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Personel çıkış verileri yüklenirken hata: ${error.message || error}`,
        'StockOutput',
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
    
    if (isNaN(quantity) || quantity <= 0) {
      alert('Verilen Miktar geçerli bir sayı olmalı ve 0\'dan büyük olmalıdır');
      return;
    }
    
    if (quantity > maxQuantity) {
      alert(`Verilen miktar mevcut stoktan fazla olamaz. Maksimum: ${maxQuantity} ${selectedMaterial?.unit}`);
      return;
    }
    
    // Personel kontrolü
    const selectedPerson = personnel.find(p => p.name === formData.employee);
    if (!selectedPerson) {
      alert('Lütfen kayıtlı bir personel seçin. Personel Yönetimi sayfasından personel ekleyebilirsiniz.');
      return;
    }
    
    try {
      const currentCompany = getCurrentCompany();
      const output: StockOutputType = {
        issueDate: new Date(formData.issueDate),
        employee: formData.employee,
        department: formData.department,
        sku: formData.sku || undefined,
        variant: formData.variant || undefined,
        personnelId: selectedPerson.id, // Personel ID'si
        materialName: formData.materialName,
        quantity: quantity,
        issuedBy: formData.issuedBy,
        warehouse: formData.warehouse || undefined,
        binCode: formData.binCode || undefined,
        serialLot: formData.serialLot || undefined,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
        description: formData.description,
        companyId: currentCompany?.companyId
      };

      const outputId = await addStockOutput(output);
      
      alert('Personel çıkışı başarıyla eklendi!');
      setShowForm(false);
      setFormData({
        issueDate: new Date().toISOString().split('T')[0],
        employee: '',
        department: '',
        sku: '',
        variant: '',
        materialName: '',
        quantity: '',
        issuedBy: '',
        warehouse: '',
        binCode: '',
        serialLot: '',
        expiryDate: '',
        description: ''
      });
      loadData();
      
      // Zimmet imza sayfasına yönlendir
      navigate(`/zimmet-signature/${outputId}`);
    } catch (error: any) {
      alert('Hata: ' + (error.message || 'Personel çıkışı eklenirken bir hata oluştu'));
    }
  };

  const handleExport = () => {
    exportStockOutputsToExcel(outputs, `personel_cikislari_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearFilters = () => {
    setFilters({
      employee: '',
      department: '',
      materialName: '',
      startDate: '',
      endDate: ''
    });
  };

  // Depo bazında stok kontrolü için - seçilen depoya göre malzemeleri filtrele
  const getAvailableMaterialsForWarehouse = (warehouse?: string) => {
    if (!warehouse) {
      // Depo seçilmemişse tüm stokları göster (depo belirtilmemiş olanlar)
      return stockStatus.filter(s => s.currentStock > 0 && !s.warehouse);
    }
    // Seçilen depodaki stokları göster
    return stockStatus.filter(s => s.currentStock > 0 && s.warehouse === warehouse);
  };

  const availableMaterials = getAvailableMaterialsForWarehouse(formData.warehouse);
  const uniqueEmployees = Array.from(new Set(personnel.map(p => p.name))).filter(Boolean);
  const uniqueDepartments = Array.from(new Set(personnel.map(p => p.department))).filter(Boolean);
  const uniqueMaterials = Array.from(new Set(outputs.map(o => o.materialName))).filter(Boolean);

  // Depo bazında stok kontrolü
  const selectedMaterial = stockStatus.find(s => 
    s.materialName === formData.materialName && 
    s.warehouse === (formData.warehouse || undefined)
  );
  const maxQuantity = selectedMaterial?.currentStock || 0;

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
            Personel Çıkış Takip
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleExport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} />
              Excel'e Aktar
            </button>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} />
              Yeni Çıkış
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="excel-form" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Yeni Personel Çıkışı</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#7f8c8d" />
              </button>
            </div>
            {availableMaterials.length === 0 && (
              <div style={{ 
                background: '#fff3cd', 
                color: '#856404', 
                padding: '12px', 
                borderRadius: '4px', 
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                ⚠️ Stokta hiç malzeme bulunmamaktadır. Önce stok girişi yapmalısınız.
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">Veriliş Tarihi *</label>
                  <input
                    type="date"
                    className="excel-form-input"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Personel *</label>
                  <select
                    className="excel-form-select"
                    value={formData.employee}
                    onChange={(e) => {
                      const selectedPerson = personnel.find(p => p.name === e.target.value);
                      setFormData({ 
                        ...formData, 
                        employee: e.target.value,
                        department: selectedPerson?.department || ''
                      });
                    }}
                    required
                    disabled={personnel.length === 0}
                  >
                    <option value="">Seçiniz</option>
                    {personnel.map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name} - {p.department}
                      </option>
                    ))}
                  </select>
                  {personnel.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>
                      Önce personel kaydı yapılmalıdır. Personel Yönetimi sayfasından ekleyin.
                    </div>
                  )}
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
                  <label className="excel-form-label">Varyant</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.variant}
                    onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                    placeholder="Örn: Kırmızı-M"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Departman *</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Depo *</label>
                  <select
                    className="excel-form-select"
                    value={formData.warehouse}
                    onChange={(e) => {
                      // Depo değiştiğinde malzeme seçimini temizle
                      setFormData({ 
                        ...formData, 
                        warehouse: e.target.value,
                        materialName: '', // Depo değiştiğinde malzeme seçimini sıfırla
                        quantity: '' // Miktarı da sıfırla
                      });
                    }}
                    required
                    disabled={warehouses.length === 0}
                  >
                    <option value="">Depo Seçiniz</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                  {warehouses.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>
                      Önce depo kaydı yapılmalıdır. Depo Yönetimi sayfasından ekleyin.
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
                  <label className="excel-form-label">Malzeme Adı *</label>
                  <select
                    className="excel-form-select"
                    value={formData.materialName}
                    onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                    required
                    disabled={availableMaterials.length === 0}
                  >
                    <option value="">Seçiniz</option>
                    {availableMaterials.map(m => (
                      <option key={`${m.materialName}-${m.warehouse || 'no-warehouse'}`} value={m.materialName}>
                        {m.materialName} {m.warehouse && `(${m.warehouse})`} (Mevcut: {m.currentStock} {m.unit})
                      </option>
                    ))}
                  </select>
                  {selectedMaterial && (
                    <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
                      Mevcut stok: {selectedMaterial.currentStock} {selectedMaterial.unit}
                      {selectedMaterial.warehouse && ` - Depo: ${selectedMaterial.warehouse}`}
                    </div>
                  )}
                  {formData.warehouse && availableMaterials.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>
                      Seçilen depoda stok bulunmamaktadır.
                    </div>
                  )}
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Verilen Miktar *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxQuantity}
                    className="excel-form-input"
                    value={formData.quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Sadece sayı ve ondalık nokta kabul et
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({ ...formData, quantity: value });
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (isNaN(value) || value <= 0) {
                        e.target.setCustomValidity('Geçerli bir sayı giriniz (0\'dan büyük)');
                      } else if (value > maxQuantity) {
                        e.target.setCustomValidity(`Maksimum: ${maxQuantity} ${selectedMaterial?.unit}`);
                      } else {
                        e.target.setCustomValidity('');
                      }
                    }}
                    required
                    disabled={!formData.materialName}
                  />
                  {formData.materialName && maxQuantity > 0 && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', fontWeight: '500' }}>
                      Maksimum: {maxQuantity} {selectedMaterial?.unit}
                    </div>
                  )}
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
                  <label className="excel-form-label">Teslim Eden *</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.issuedBy}
                    onChange={(e) => setFormData({ ...formData, issuedBy: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="excel-form-group">
                <label className="excel-form-label">Açıklama</label>
                <textarea
                  className="excel-form-input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={availableMaterials.length === 0}>
                  Kaydet ve İmza Sayfasına Git
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
              <label className="excel-form-label">Personel</label>
              <select
                className="excel-form-select"
                value={filters.employee}
                onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
              >
                <option value="">Tümü</option>
                {uniqueEmployees.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="excel-form-label">Departman</label>
              <select
                className="excel-form-select"
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              >
                <option value="">Tümü</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
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
          ) : outputs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Henüz personel çıkışı kaydı bulunmamaktadır.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Veriliş Tarihi</th>
                  <th>Personel</th>
                  <th>Departman</th>
                  <th>Malzeme Adı</th>
                  <th>Verilen Miktar</th>
                  <th>Teslim Eden</th>
                  <th>Depo</th>
                  <th>Açıklama</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {outputs.map((output) => (
                  <tr key={output.id}>
                    <td>{output.issueDate.toLocaleDateString('tr-TR')}</td>
                    <td>{output.employee}</td>
                    <td>{output.department}</td>
                    <td>{output.materialName}</td>
                    <td>{output.quantity}</td>
                    <td>{output.issuedBy}</td>
                    <td>{output.warehouse || '-'}</td>
                    <td>{output.description || '-'}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/zimmet-signature/${output.id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FileSignature size={14} />
                        İmza
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}


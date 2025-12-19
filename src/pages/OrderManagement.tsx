import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { addOrder, getOrders, updateOrder, Order, OrderItem } from '../services/orderService';
import { getCustomers, Customer } from '../services/customerService';
import { getPriceRules, PriceRule, selectPriceRule } from '../services/priceService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCurrentUser } from '../utils/getCurrentUser';
import { addErrorLog } from '../services/userService';
import { Plus, X, Edit, Save, ShoppingCart, CheckCircle, Clock, XCircle, Download } from 'lucide-react';

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    supplier: '',
    customerId: '',
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState({
    orderNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    supplier: '',
    customerId: '',
    customerName: '',
    status: 'pending' as Order['status'],
    items: [] as OrderItem[],
    notes: '',
    currency: 'TRY'
  });

  const [newItem, setNewItem] = useState({
    materialName: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    currency: 'TRY',
    exchangeRate: '1'
  });

  useEffect(() => {
    loadOrders();
    loadCustomers();
    loadPrices();
  }, [filters]);
  const loadPrices = async () => {
    try {
      const currentCompany = getCurrentCompany();
      const data = await getPriceRules(currentCompany?.companyId);
      setPriceRules(data);
    } catch (error) {
      console.error('Fiyat kuralları yüklenirken hata:', error);
    }
  };


  const loadCustomers = async () => {
    try {
      const currentCompany = getCurrentCompany();
      const data = await getCustomers(currentCompany?.companyId);
      setCustomers(data);
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const filterParams: any = {
        companyId: currentCompany?.companyId
      };
      if (filters.status) filterParams.status = filters.status;
      if (filters.supplier) filterParams.supplier = filters.supplier;
      if (filters.customerId) filterParams.customerId = filters.customerId;
      if (filters.startDate) filterParams.startDate = new Date(filters.startDate);
      if (filters.endDate) filterParams.endDate = new Date(filters.endDate);
      
      const data = await getOrders(filterParams);
      setOrders(data);
    } catch (error: any) {
      console.error('Sipariş listesi yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Sipariş listesi yüklenirken hata: ${error.message || error}`,
        'OrderManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SIP-${year}${month}${day}-${random}`;
  };

  const addItem = () => {
    if (!newItem.materialName || !newItem.quantity || !newItem.unit) {
      alert('Lütfen malzeme, miktar ve birim girin');
      return;
    }

    const quantity = parseFloat(newItem.quantity);
    let unitPrice = parseFloat(newItem.unitPrice);
    const lineCurrency = newItem.currency || formData.currency || 'TRY';
    const exchangeRate = newItem.exchangeRate ? parseFloat(newItem.exchangeRate) : 1;

    if (isNaN(quantity) || quantity <= 0) {
      alert('Geçerli sayısal değerler girin');
      return;
    }

    // Fiyat kuralı uygula (öncelik + tarih aralığı)
    if (isNaN(unitPrice) || unitPrice <= 0) {
      const customer = customers.find(c => c.id === formData.customerId);
      const rule = selectPriceRule(newItem.materialName, formData.customerId, customer?.group, priceRules, quantity, lineCurrency);
      if (rule) {
        const discounted = rule.discountPercent ? rule.price * (1 - rule.discountPercent / 100) : rule.price;
        unitPrice = discounted;
      } else {
        unitPrice = 0;
      }
    }

    const unitPriceBase = lineCurrency === formData.currency ? unitPrice : unitPrice * (exchangeRate || 1);

    const item: OrderItem = {
      materialName: newItem.materialName,
      quantity: quantity,
      unit: newItem.unit,
      unitPrice: unitPriceBase,
      totalPrice: quantity * unitPriceBase,
      currency: lineCurrency,
      exchangeRate: exchangeRate || 1
    };

    setFormData({
      ...formData,
      items: [...formData.items, item]
    });

    setNewItem({
      materialName: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      currency: formData.currency,
      exchangeRate: '1'
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.orderNumber) {
      setFormData({ ...formData, orderNumber: generateOrderNumber() });
    }

    if (formData.items.length === 0) {
      alert('En az bir ürün eklemelisiniz');
      return;
    }

    const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const currentBalance = selectedCustomer?.balance || 0;
    const creditLimit = selectedCustomer?.creditLimit;

    if (formData.customerId && creditLimit !== undefined && creditLimit > 0) {
      const projected = currentBalance + totalAmount;
      if (projected > creditLimit) {
        alert(`Kredi limiti aşılıyor. Limit: ${creditLimit.toFixed(2)} ₺, Mevcut Bakiye: ${currentBalance.toFixed(2)} ₺, Sipariş: ${totalAmount.toFixed(2)} ₺`);
        return;
      }
    }

    try {
      const order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        orderNumber: formData.orderNumber || generateOrderNumber(),
        orderDate: new Date(formData.orderDate),
        customerId: formData.customerId || undefined,
        customerName: formData.customerName || undefined,
        supplier: formData.supplier,
        status: formData.status,
        items: formData.items,
        totalAmount: totalAmount,
        notes: formData.notes,
        currency: formData.currency
      };

      if (editingId) {
        await updateOrder(editingId, order);
        alert('Sipariş başarıyla güncellendi!');
      } else {
        await addOrder(order);
        alert('Sipariş başarıyla eklendi!');
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
      loadOrders();
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Sipariş kaydedilirken hata: ${error.message || error}`,
        'OrderManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Hata: ' + (error.message || 'Sipariş kaydedilirken bir hata oluştu'));
    }
  };

  const resetForm = () => {
    setFormData({
      orderNumber: '',
      orderDate: new Date().toISOString().split('T')[0],
      supplier: '',
      customerId: '',
      customerName: '',
      status: 'pending',
      items: [],
      notes: '',
      currency: 'TRY'
    });
    setNewItem({
      materialName: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      currency: 'TRY',
      exchangeRate: '1'
    });
  };

  const handleEdit = (order: Order) => {
    setEditingId(order.id || null);
    setFormData({
      orderNumber: order.orderNumber,
      orderDate: order.orderDate.toISOString().split('T')[0],
      supplier: order.supplier || '',
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      status: order.status,
      items: order.items,
      notes: order.notes || '',
      currency: order.currency || 'TRY'
    });
    setShowForm(true);
  };

  const handleStatusChange = async (id: string, newStatus: Order['status']) => {
    try {
      await updateOrder(id, { status: newStatus });
      alert('Sipariş durumu güncellendi!');
      loadOrders();
    } catch (error: any) {
      alert('Hata: ' + (error.message || 'Durum güncellenirken bir hata oluştu'));
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color="#28a745" />;
      case 'in_progress':
        return <Clock size={16} color="#ffc107" />;
      case 'cancelled':
        return <XCircle size={16} color="#dc3545" />;
      default:
        return <Clock size={16} color="#666" />;
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'in_progress':
        return 'İşlemde';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal';
      default:
        return status;
    }
  };

  const uniqueSuppliers = Array.from(new Set(orders.map(o => o.supplier))).filter(Boolean);
  const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);

  const exportOrders = async () => {
    if (!orders.length) {
      alert('Dışa aktarılacak sipariş bulunamadı');
      return;
    }
    const XLSX = await import('xlsx');
    const data = orders.map(o => ({
      'Sipariş No': o.orderNumber,
      Müşteri: o.customerName || '',
      Tedarikçi: o.supplier || '',
      Tarih: o.orderDate.toLocaleDateString('tr-TR'),
      Durum: getStatusLabel(o.status),
      'Ürün Sayısı': o.items.length,
      'Toplam Tutar': o.totalAmount || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siparisler');
    XLSX.writeFile(wb, `siparisler_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingCart size={32} color="#000" />
            <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
              Sipariş Takip
            </h1>
          </div>
          <button onClick={() => { setShowForm(true); resetForm(); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            Yeni Sipariş
          </button>
          <button onClick={exportOrders} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} />
            Excel'e Aktar
          </button>
        </div>

        {/* Filtreler */}
        <div style={{
          background: 'white',
          border: '2px solid #000',
          padding: '20px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Durum
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Tümü</option>
              <option value="pending">Beklemede</option>
              <option value="in_progress">İşlemde</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Tedarikçi
            </label>
            <select
              value={filters.supplier}
              onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Tümü</option>
              {uniqueSuppliers.map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Müşteri
            </label>
            <select
              value={filters.customerId}
              onChange={(e) => setFilters({ ...filters, customerId: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Tümü</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{
            background: 'white',
            border: '2px solid #000',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#000' }}>
              {editingId ? 'Sipariş Düzenle' : 'Yeni Sipariş'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Sipariş No
                  </label>
                  <input
                    type="text"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    placeholder="Otomatik oluşturulacak"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Sipariş Tarihi <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Tedarikçi
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Müşteri
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => {
                      const c = customers.find(cu => cu.id === e.target.value);
                      setFormData({ ...formData, customerId: e.target.value, customerName: c?.name || '' });
                    }}
                    className="excel-form-select"
                  >
                    <option value="">Seçiniz (opsiyonel)</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {formData.customerId && (
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                      Bakiye: {(customers.find(c => c.id === formData.customerId)?.balance || 0).toFixed(2)} ₺
                      {customers.find(c => c.id === formData.customerId)?.creditLimit !== undefined && (
                        <span style={{ marginLeft: '8px' }}>
                          Limit: {customers.find(c => c.id === formData.customerId)?.creditLimit?.toFixed(2)} ₺
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Durum
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Order['status'] })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontSize: '14px',
                      background: 'white'
                    }}
                  >
                    <option value="pending">Beklemede</option>
                    <option value="in_progress">İşlemde</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                    Para Birimi (Belge)
                  </label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #000',
                      borderRadius: '0',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Ürün Ekleme */}
              <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #e0e0e0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px', color: '#000' }}>
                  Ürün Ekle
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Malzeme Adı"
                    value={newItem.materialName}
                    onChange={(e) => setNewItem({ ...newItem, materialName: e.target.value })}
                    style={{ padding: '10px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Miktar"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    style={{ padding: '10px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Birim"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    style={{ padding: '10px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Birim Fiyat"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                    style={{ padding: '10px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Kalem PB (vars: belge PB)"
                    value={newItem.currency}
                    onChange={(e) => setNewItem({ ...newItem, currency: e.target.value })}
                    style={{ padding: '10px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder={`Kur -> ${formData.currency}`}
                    value={newItem.exchangeRate}
                    onChange={(e) => setNewItem({ ...newItem, exchangeRate: e.target.value })}
                    style={{ padding: '10px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
                  />
                  <button type="button" onClick={addItem} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={16} />
                    Ekle
                  </button>
                </div>
              </div>

              {/* Ürün Listesi */}
              {formData.items.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <table className="excel-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Malzeme</th>
                        <th>Miktar</th>
                        <th>Birim</th>
                        <th>Birim Fiyat</th>
                        <th>Kalem PB</th>
                        <th>Toplam</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.materialName}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>{item.unitPrice.toFixed(2)} {formData.currency}</td>
                          <td>{item.currency || formData.currency} {item.currency && item.currency !== formData.currency ? `(kur ${item.exchangeRate || 1})` : ''}</td>
                          <td>{item.totalPrice.toFixed(2)} {formData.currency}</td>
                          <td>
                            <button type="button" onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}>
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '15px', textAlign: 'right', fontSize: '18px', fontWeight: '700' }}>
                    Toplam: {totalAmount.toFixed(2)} {formData.currency}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                  Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #000',
                    borderRadius: '0',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={18} />
                  {editingId ? 'Güncelle' : 'Kaydet'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="btn btn-secondary">
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tablo */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Henüz sipariş kaydı bulunmamaktadır.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Sipariş No</th>
                  <th>Müşteri</th>
                  <th>Tarih</th>
                  <th>Tedarikçi</th>
                  <th>Ürün Sayısı</th>
                  <th>Toplam Tutar</th>
                  <th>PB</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: '500' }}>{order.orderNumber}</td>
                    <td>{order.customerName || '-'}</td>
                    <td>{order.orderDate.toLocaleDateString('tr-TR')}</td>
                    <td>{order.supplier || '-'}</td>
                    <td>{order.items.length}</td>
                    <td style={{ fontWeight: '600' }}>{order.totalAmount?.toFixed(2) || '0.00'} {order.currency || 'TRY'}</td>
                    <td>{order.currency || 'TRY'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getStatusIcon(order.status)}
                        <span>{getStatusLabel(order.status)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleEdit(order)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit size={14} />
                          Düzenle
                        </button>
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => order.id && handleStatusChange(order.id, 'in_progress')}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              İşleme Al
                            </button>
                            <button
                              onClick={() => order.id && handleStatusChange(order.id, 'completed')}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Tamamla
                            </button>
                          </>
                        )}
                      </div>
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


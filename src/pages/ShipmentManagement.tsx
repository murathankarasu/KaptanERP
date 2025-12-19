import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { addShipment, getShipments, updateShipmentStatus, generateShipmentNumber, Shipment, ShipmentItem } from '../services/shipmentService';
import { getCustomers, Customer } from '../services/customerService';
import { getAllStockStatus } from '../services/stockService';
import { getWarehouses } from '../services/warehouseService';
import { addActivityLog } from '../services/activityLogService';
import { addErrorLog } from '../services/userService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCurrentUser } from '../utils/getCurrentUser';
import { generateShipmentPDF } from '../utils/pdfExport';
import { applyCustomerCharge } from '../services/financeService';
import { getPriceRules, PriceRule, selectPriceRule } from '../services/priceService';
import { getOrders, Order, updateOrder } from '../services/orderService';
import { getQuotes, Quote, updateQuote } from '../services/quoteService';
import { generateInvoicePDF } from '../utils/pdfEdocs';
import { buildInvoiceUBL } from '../utils/ublLocal';
import { addInvoice } from '../services/invoiceService';
import { Plus, X, Edit, Save, Truck, FileText, CheckCircle, Clock, XCircle, Package } from 'lucide-react';

export default function ShipmentManagement() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockStatus, setStockStatus] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    customerId: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  const [formData, setFormData] = useState({
    shipmentNumber: '',
    shipmentDate: new Date().toISOString().split('T')[0],
    customerId: '',
    customerName: '',
    warehouse: '',
    orderId: '',
    orderNumber: '',
    quoteId: '',
    quoteNumber: '',
    items: [] as ShipmentItem[],
    notes: '',
    status: 'pending' as Shipment['status']
  });
  const [invoiceOptions, setInvoiceOptions] = useState({
    scenario: 'E_ARSIV' as 'E_ARSIV' | 'E_FATURA',
    currency: 'TRY'
  });

  const [newItem, setNewItem] = useState({
    sku: '',
    variant: '',
    materialName: '',
    quantity: '',
    unit: '',
    unitPrice: '',
    warehouse: '',
    binCode: '',
    serialLot: '',
    expiryDate: '',
    vatRate: '',
    currency: '',
    exchangeRate: '1'
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      
      const [shipmentsData, customersData, stockData, warehousesData, prices, ordersData, quotesData] = await Promise.all([
        getShipments({
          companyId: currentCompany?.companyId,
          customerId: filters.customerId || undefined,
          status: filters.status || undefined,
          startDate: filters.startDate ? new Date(filters.startDate) : undefined,
          endDate: filters.endDate ? new Date(filters.endDate) : undefined
        }),
        getCustomers(currentCompany?.companyId),
        getAllStockStatus(currentCompany?.companyId),
        getWarehouses(currentCompany?.companyId),
        getPriceRules(currentCompany?.companyId),
        getOrders({ companyId: currentCompany?.companyId }),
        getQuotes(currentCompany?.companyId)
      ]);
      
      setShipments(shipmentsData);
      setCustomers(customersData);
      setStockStatus(stockData);
      setWarehouses(warehousesData);
      setPriceRules(prices);
      setOrders(ordersData);
      setQuotes(quotesData);
    } catch (error: any) {
      console.error('Veriler yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Sevkiyat verileri yüklenirken hata: ${error.message || error}`,
        'ShipmentManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!newItem.materialName || !newItem.quantity || !newItem.unit) {
      alert('Lütfen malzeme, miktar ve birim girin');
      return;
    }

    const quantity = parseFloat(newItem.quantity);
    let unitPrice = parseFloat(newItem.unitPrice);
    const exchangeRate = newItem.exchangeRate ? parseFloat(newItem.exchangeRate) : 1;
    const lineCurrency = newItem.currency || invoiceOptions.currency;

    let appliedDiscount: number | undefined;
    let listPrice: number | undefined;
    let ruleNote: string | undefined;

    if (isNaN(quantity) || quantity <= 0) {
      alert('Geçerli sayısal değerler girin');
      return;
    }
    // Fiyat kuralı uygula (müşteri + grup + malzeme, tarih aralığı ve öncelik)
    if (isNaN(unitPrice) || unitPrice < 0) {
      const customer = customers.find(c => c.id === formData.customerId);
      const rule = selectPriceRule(newItem.materialName, formData.customerId, customer?.group, priceRules, quantity, lineCurrency);
      if (rule) {
        listPrice = rule.price;
        appliedDiscount = rule.discountPercent;
        const discounted = rule.discountPercent ? rule.price * (1 - rule.discountPercent / 100) : rule.price;
        unitPrice = discounted;
        ruleNote = rule.customerId ? 'Müşteri kuralı' : rule.customerGroup ? `Grup: ${rule.customerGroup}` : 'Genel kural';
      } else {
        unitPrice = 0;
      }
    }

    // Stok kontrolü
    const selectedStock = stockStatus.find(s => 
      s.materialName === newItem.materialName && 
      s.warehouse === (newItem.warehouse || undefined)
    );

    if (!selectedStock || selectedStock.currentStock < quantity) {
      alert(`Yetersiz stok! Mevcut stok: ${selectedStock?.currentStock || 0} ${selectedStock?.unit || ''}`);
      return;
    }

    // Belge para birimine çevir (invoiceOptions.currency)
    const unitPriceBase = lineCurrency === invoiceOptions.currency ? unitPrice : unitPrice * (exchangeRate || 1);

    const item: ShipmentItem = {
      materialName: newItem.materialName,
      sku: newItem.sku || undefined,
      variant: newItem.variant || undefined,
      quantity: quantity,
      unit: newItem.unit,
      unitPrice: unitPriceBase,
      totalPrice: quantity * unitPriceBase,
      discountPercent: appliedDiscount,
      listPrice,
      priceRuleNote: ruleNote,
      vatRate: newItem.vatRate ? parseFloat(newItem.vatRate) : undefined,
      currency: lineCurrency,
      exchangeRate: exchangeRate || 1,
      warehouse: newItem.warehouse || undefined,
      binCode: newItem.binCode || undefined,
      serialLot: newItem.serialLot || undefined,
      expiryDate: newItem.expiryDate ? new Date(newItem.expiryDate) : undefined
    };

    setFormData({
      ...formData,
      items: [...formData.items, item]
    });

    setNewItem({
      sku: '',
      variant: '',
      materialName: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      warehouse: formData.warehouse,
      binCode: '',
      serialLot: '',
      expiryDate: '',
      vatRate: '',
      currency: invoiceOptions.currency,
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
    
    if (!formData.customerId) {
      alert('Lütfen müşteri seçin');
      return;
    }

    if (formData.items.length === 0) {
      alert('En az bir ürün eklemelisiniz');
      return;
    }

    const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const currentUser = getCurrentUser();
    const currentCompany = getCurrentCompany();
    const customer = customers.find(c => c.id === formData.customerId);
    const currentBalance = customer?.balance || 0;
    const creditLimit = customer?.creditLimit;

    if (creditLimit !== undefined && creditLimit > 0) {
      const projectedBalance = currentBalance + totalAmount;
      if (projectedBalance > creditLimit) {
        alert(`Kredi limiti aşılıyor. Limit: ${creditLimit.toFixed(2)} ₺, Mevcut Bakiye: ${currentBalance.toFixed(2)} ₺, Yeni Sevkiyat: ${totalAmount.toFixed(2)} ₺`);
        return;
      }
    }

    try {
      const shipment: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'> = {
        shipmentNumber: formData.shipmentNumber || generateShipmentNumber(),
        shipmentDate: new Date(formData.shipmentDate),
        customerId: formData.customerId,
        customerName: formData.customerName,
        items: formData.items,
        totalAmount: totalAmount,
        status: formData.status,
        notes: formData.notes,
        warehouse: formData.warehouse || undefined,
        orderId: formData.orderId || undefined,
        orderNumber: formData.orderNumber || undefined,
        quoteId: formData.quoteId || undefined,
        quoteNumber: formData.quoteNumber || undefined,
        currency: invoiceOptions.currency || 'TRY',
        companyId: currentCompany?.companyId,
        createdBy: currentUser?.id
      };

      await addShipment(shipment);

      // Cari bakiye güncelle
      if (customer?.id) {
        await applyCustomerCharge({
          customerId: customer.id,
          amount: totalAmount,
          currency: 'TRY',
          companyId: currentCompany?.companyId,
          description: `Sevkiyat ${shipment.shipmentNumber}`,
          referenceType: 'shipment',
          referenceId: shipment.shipmentNumber
        });
      }

      // Aktivite logu kaydet
      await addActivityLog({
        userId: currentUser?.id,
        username: currentUser?.username,
        userEmail: currentUser?.email,
        personnelId: currentUser?.personnelId,
        personnelName: currentUser?.fullName,
        action: `Sevkiyat Oluşturuldu: ${shipment.shipmentNumber} - ${formData.customerName}`,
        module: 'shipment',
        details: JSON.stringify({
          shipmentNumber: shipment.shipmentNumber,
          customerName: formData.customerName,
          itemCount: formData.items.length,
          totalAmount
        }),
        companyId: currentCompany?.companyId
      });

      alert('Sevkiyat başarıyla oluşturuldu!');
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Sevkiyat oluşturulurken hata: ${error.message || error}`,
        'ShipmentManagement',
        userInfo?.id,
        userInfo?.username
      );
      alert('Hata: ' + (error.message || 'Sevkiyat oluşturulurken bir hata oluştu'));
    }
  };

  const resetForm = () => {
    setFormData({
      shipmentNumber: '',
      shipmentDate: new Date().toISOString().split('T')[0],
      customerId: '',
      customerName: '',
      warehouse: '',
      orderId: '',
      orderNumber: '',
      quoteId: '',
      quoteNumber: '',
      items: [],
      notes: '',
      status: 'pending'
    });
    setNewItem({
      materialName: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      warehouse: ''
    });
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setFormData({
      ...formData,
      customerId: customerId,
      customerName: customer?.name || '',
      orderId: '',
      orderNumber: '',
      quoteId: '',
      quoteNumber: ''
    });
  };

  const handleStatusChange = async (shipmentId: string, newStatus: Shipment['status']) => {
    try {
      await updateShipmentStatus(shipmentId, newStatus);
      const updatedShipment = shipments.find(s => s.id === shipmentId);
      if (updatedShipment) {
        // Sipariş / Teklif statü eşlemesi (basit)
        if (updatedShipment.orderId) {
          const mapped =
            newStatus === 'delivered' ? 'completed' :
            newStatus === 'shipped' ? 'in_progress' :
            newStatus === 'cancelled' ? 'cancelled' :
            undefined;
          if (mapped) {
            await updateOrder(updatedShipment.orderId, { status: mapped as any });
          }
        }
        if (updatedShipment.quoteId) {
          const mapped =
            newStatus === 'delivered' ? 'accepted' :
            newStatus === 'cancelled' ? 'rejected' :
            undefined;
          if (mapped) {
            await updateQuote(updatedShipment.quoteId, { status: mapped as any });
          }
        }
      }
      alert('Sevkiyat durumu güncellendi!');
      loadData();
    } catch (error: any) {
      alert('Hata: ' + (error.message || 'Durum güncellenirken bir hata oluştu'));
    }
  };

  const handlePrintPDF = async (shipment: Shipment) => {
    try {
      const customer = customers.find(c => c.id === shipment.customerId);
      await generateShipmentPDF(shipment, customer);
    } catch (error: any) {
      alert('PDF oluşturulurken hata: ' + error.message);
    }
  };

  const handleInvoiceFromShipment = async (shipment: Shipment) => {
    try {
      const customer = customers.find(c => c.id === shipment.customerId);
      const invoiceNumber = `FAT-${shipment.shipmentNumber}`;
      const issueDate = shipment.shipmentDate.toISOString().split('T')[0];
      const currency = invoiceOptions.currency || 'TRY';
      const customerVknTckn = customer?.taxNumber || '1111111111';

      const lines = shipment.items.map(it => ({
        name: it.materialName,
        qty: it.quantity,
        unitPrice: it.unitPrice,
        vatRate: it.vatRate !== undefined ? it.vatRate : 18,
        discountPercent: it.discountPercent,
        lineCurrency: it.currency,
        exchangeRate: it.exchangeRate
      }));

      // PDF
      await generateInvoicePDF({
        invoiceNumber,
        issueDate,
        customerName: shipment.customerName,
        customerVknTckn,
        currency,
        lines
      });

      // UBL XML
      const ubl = buildInvoiceUBL({
        invoiceNumber,
        issueDate,
        scenario: invoiceOptions.scenario,
        currency,
        customerName: shipment.customerName,
        customerVknTckn,
        lines: lines.map(l => ({
          name: l.name,
          quantity: l.qty,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate,
          discountPercent: l.discountPercent
        }))
      });
      downloadText(ubl, `${invoiceNumber}.xml`);

      // Fatura kaydet
      await addInvoice({
        invoiceNumber,
        date: new Date(issueDate),
        customerId: shipment.customerId,
        customerName: shipment.customerName,
        currency,
        totalAmount: shipment.totalAmount,
        status: 'issued',
        items: shipment.items.map(it => ({
          materialName: it.materialName,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          vatRate: it.vatRate,
          discountPercent: it.discountPercent
        })),
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        orderId: shipment.orderId,
        orderNumber: shipment.orderNumber,
        companyId: getCurrentCompany()?.companyId
      });

      if (shipment.orderId) {
        await updateOrder(shipment.orderId, { status: 'completed' });
      }

      alert('Fatura oluşturuldu, PDF/UBL indirildi ve kayıt eklendi.');
    } catch (error: any) {
      alert('Fatura oluşturulurken hata: ' + (error.message || error));
    }
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle size={16} color="#28a745" />;
      case 'shipped':
        return <Truck size={16} color="#007bff" />;
      case 'preparing':
        return <Package size={16} color="#ffc107" />;
      case 'cancelled':
        return <XCircle size={16} color="#dc3545" />;
      default:
        return <Clock size={16} color="#6c757d" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Beklemede',
      preparing: 'Hazırlanıyor',
      shipped: 'Sevk Edildi',
      delivered: 'Teslim Edildi',
      cancelled: 'İptal Edildi'
    };
    return statusMap[status] || status;
  };

  const availableMaterials = formData.warehouse
    ? stockStatus.filter(s => s.currentStock > 0 && s.warehouse === formData.warehouse)
    : stockStatus.filter(s => s.currentStock > 0 && !s.warehouse);

  const selectedMaterial = stockStatus.find(s => 
    s.materialName === newItem.materialName && 
    s.warehouse === (newItem.warehouse || undefined)
  );

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Truck size={32} color="#000" />
            <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
              Sevkiyat Yönetimi
            </h1>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            Yeni Sevkiyat
          </button>
        </div>

        <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #ddd', background: '#fff' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>Fatura Ayarları:</strong>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span>Senaryo</span>
              <select
                className="excel-form-select"
                value={invoiceOptions.scenario}
                onChange={(e) => setInvoiceOptions({ ...invoiceOptions, scenario: e.target.value as 'E_ARSIV' | 'E_FATURA' })}
              >
                <option value="E_ARSIV">e-Arşiv</option>
                <option value="E_FATURA">e-Fatura</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span>Para Birimi</span>
              <input
                className="excel-form-input"
                style={{ width: '100px' }}
                value={invoiceOptions.currency}
                onChange={(e) => setInvoiceOptions({ ...invoiceOptions, currency: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="filter-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Filtrele</h3>
            <button onClick={() => setFilters({ customerId: '', status: '', startDate: '', endDate: '' })} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              Filtreleri Temizle
            </button>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label className="excel-form-label">Müşteri</label>
              <select
                className="excel-form-select"
                value={filters.customerId}
                onChange={(e) => setFilters({ ...filters, customerId: e.target.value })}
              >
                <option value="">Tümü</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="excel-form-label">Durum</label>
              <select
                className="excel-form-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Tümü</option>
                <option value="pending">Beklemede</option>
                <option value="preparing">Hazırlanıyor</option>
                <option value="shipped">Sevk Edildi</option>
                <option value="delivered">Teslim Edildi</option>
                <option value="cancelled">İptal Edildi</option>
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

        {/* Form */}
        {showForm && (
          <div className="excel-form" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Yeni Sevkiyat</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#7f8c8d" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">Sevkiyat No</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={formData.shipmentNumber || generateShipmentNumber()}
                    onChange={(e) => setFormData({ ...formData, shipmentNumber: e.target.value })}
                    placeholder="Otomatik oluşturulur"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Sevkiyat Tarihi *</label>
                  <input
                    type="date"
                    className="excel-form-input"
                    value={formData.shipmentDate}
                    onChange={(e) => setFormData({ ...formData, shipmentDate: e.target.value })}
                    required
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Müşteri *</label>
                  <select
                    className="excel-form-select"
                    value={formData.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                    disabled={customers.length === 0}
                  >
                    <option value="">Seçiniz</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.companyName && `(${c.companyName})`}</option>
                    ))}
                  </select>
                  {customers.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>
                      Önce müşteri kaydı yapılmalıdır. Müşteri Yönetimi sayfasından ekleyin.
                    </div>
                  )}
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Depo</label>
                  <select
                    className="excel-form-select"
                    value={formData.warehouse}
                    onChange={(e) => {
                      setFormData({ ...formData, warehouse: e.target.value });
                      setNewItem({ ...newItem, warehouse: e.target.value });
                    }}
                  >
                    <option value="">Depo Seçiniz (Opsiyonel)</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Sipariş Bağı</label>
                  <select
                    className="excel-form-select"
                    value={formData.orderId}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selected = orders.find(o => o.id === val);
                      setFormData({
                        ...formData,
                        orderId: val,
                        orderNumber: selected?.orderNumber || '',
                        quoteId: '',
                        quoteNumber: ''
                      });
                    }}
                  >
                    <option value="">Seçiniz (opsiyonel)</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>{o.orderNumber} - {o.customerName || '-'}</option>
                    ))}
                  </select>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Teklif Bağı</label>
                  <select
                    className="excel-form-select"
                    value={formData.quoteId}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selected = quotes.find(q => q.id === val);
                      setFormData({
                        ...formData,
                        quoteId: val,
                        quoteNumber: selected?.quoteNumber || '',
                        orderId: '',
                        orderNumber: ''
                      });
                    }}
                  >
                    <option value="">Seçiniz (opsiyonel)</option>
                    {quotes.map(q => (
                      <option key={q.id} value={q.id}>{q.quoteNumber} - {q.customerName || '-'}</option>
                    ))}
                  </select>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Durum</label>
                  <select
                    className="excel-form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Shipment['status'] })}
                  >
                    <option value="pending">Beklemede</option>
                    <option value="preparing">Hazırlanıyor</option>
                    <option value="shipped">Sevk Edildi</option>
                    <option value="delivered">Teslim Edildi</option>
                  </select>
                </div>
              </div>

              {/* Ürün Ekleme */}
              <div style={{ marginTop: '20px', padding: '20px', border: '2px solid #000', background: 'white' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px' }}>Ürün Ekle</h3>
                <div className="grid-4">
                <div className="excel-form-group">
                  <label className="excel-form-label">SKU</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    placeholder="Ürün SKU (opsiyonel)"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Varyant</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={newItem.variant}
                    onChange={(e) => setNewItem({ ...newItem, variant: e.target.value })}
                    placeholder="Örn: Kırmızı-M"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Malzeme *</label>
                  <select
                    className="excel-form-select"
                    value={newItem.materialName}
                    onChange={(e) => {
                      const material = stockStatus.find(s => s.materialName === e.target.value);
                      setNewItem({
                        ...newItem,
                        materialName: e.target.value,
                        unit: material?.unit || '',
                        unitPrice: '0'
                      });
                    }}
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
                </div>
                  <div className="excel-form-group">
                    <label className="excel-form-label">Miktar *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="excel-form-input"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      required
                      max={selectedMaterial?.currentStock || 0}
                    />
                    {selectedMaterial && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Maksimum: {selectedMaterial.currentStock} {selectedMaterial.unit}
                      </div>
                    )}
                  </div>
                  <div className="excel-form-group">
                    <label className="excel-form-label">Birim</label>
                    <input
                      type="text"
                      className="excel-form-input"
                      value={newItem.unit}
                      readOnly
                      style={{ background: '#f5f5f5' }}
                    />
                  </div>
                  <div className="excel-form-group">
                    <label className="excel-form-label">Birim Fiyat (₺) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="excel-form-input"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                      required
                    />
                  </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Kalem Para Birimi</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={newItem.currency}
                    onChange={(e) => setNewItem({ ...newItem, currency: e.target.value })}
                    placeholder={invoiceOptions.currency}
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">{`Kur (-> ${invoiceOptions.currency})`}</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="excel-form-input"
                    value={newItem.exchangeRate}
                    onChange={(e) => setNewItem({ ...newItem, exchangeRate: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">KDV (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="excel-form-input"
                    value={newItem.vatRate}
                    onChange={(e) => setNewItem({ ...newItem, vatRate: e.target.value })}
                    placeholder="Örn: 18"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Raf/Göz (Bin)</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={newItem.binCode}
                    onChange={(e) => setNewItem({ ...newItem, binCode: e.target.value })}
                    placeholder="Örn: A-01-03"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Seri/Lot</label>
                  <input
                    type="text"
                    className="excel-form-input"
                    value={newItem.serialLot}
                    onChange={(e) => setNewItem({ ...newItem, serialLot: e.target.value })}
                    placeholder="Lot veya seri no"
                  />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">SKT</label>
                  <input
                    type="date"
                    className="excel-form-input"
                    value={newItem.expiryDate}
                    onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
                  />
                </div>
                </div>
                <button type="button" onClick={addItem} className="btn btn-secondary" style={{ marginTop: '10px' }}>
                  Ürün Ekle
                </button>
              </div>

              {/* Ürün Listesi */}
              {formData.items.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '15px' }}>Ürün Listesi</h3>
                  <table className="excel-table">
                    <thead>
                      <tr>
                      <th>SKU</th>
                      <th>Malzeme</th>
                      <th>Varyant</th>
                        <th>Miktar</th>
                        <th>Birim</th>
                        <th>Birim Fiyat</th>
                      <th>Raf/Göz</th>
                      <th>Seri/Lot</th>
                      <th>SKT</th>
                      <th>Toplam</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                        <td>{item.sku || '-'}</td>
                        <td>{item.materialName}</td>
                        <td>{item.variant || '-'}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                        <td>{item.binCode || '-'}</td>
                        <td>{item.serialLot || '-'}</td>
                        <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('tr-TR') : '-'}</td>
                          <td>{item.unitPrice.toFixed(2)} ₺</td>
                          <td>{item.totalPrice.toFixed(2)} ₺</td>
                          <td>
                            <button type="button" onClick={() => removeItem(index)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: '700' }}>TOPLAM:</td>
                        <td style={{ fontWeight: '700' }}>
                          {formData.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)} ₺
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="excel-form-group" style={{ marginTop: '20px' }}>
                <label className="excel-form-label">Notlar</label>
                <textarea
                  className="excel-form-input"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" disabled={formData.items.length === 0 || !formData.customerId}>
                  Kaydet
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
          ) : shipments.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Henüz sevkiyat kaydı bulunmamaktadır.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Sevkiyat No</th>
                  <th>Tarih</th>
                  <th>Müşteri</th>
                  <th>Bağ</th>
                  <th>Ürün Sayısı</th>
                  <th>Toplam Tutar</th>
                  <th>Durum</th>
                  <th>Depo</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td style={{ fontWeight: '500' }}>{shipment.shipmentNumber}</td>
                    <td>{shipment.shipmentDate.toLocaleDateString('tr-TR')}</td>
                    <td>{shipment.customerName}</td>
                    <td>{shipment.orderNumber ? `Sipariş: ${shipment.orderNumber}` : shipment.quoteNumber ? `Teklif: ${shipment.quoteNumber}` : '-'}</td>
                    <td>{shipment.items.length}</td>
                    <td>{shipment.totalAmount.toFixed(2)} ₺</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getStatusIcon(shipment.status)}
                        <span>{getStatusText(shipment.status)}</span>
                      </div>
                    </td>
                    <td>{shipment.warehouse || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => shipment.id && handlePrintPDF(shipment)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <FileText size={14} />
                          PDF
                        </button>
                        <button
                          onClick={() => handleInvoiceFromShipment(shipment)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <FileText size={14} />
                          Fatura
                        </button>
                        <select
                          value={shipment.status}
                          onChange={(e) => shipment.id && handleStatusChange(shipment.id, e.target.value as Shipment['status'])}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '2px solid #000',
                            borderRadius: '0',
                            background: 'white'
                          }}
                        >
                          <option value="pending">Beklemede</option>
                          <option value="preparing">Hazırlanıyor</option>
                          <option value="shipped">Sevk Edildi</option>
                          <option value="delivered">Teslim Edildi</option>
                          <option value="cancelled">İptal Edildi</option>
                        </select>
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


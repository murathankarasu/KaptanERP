import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Quote, QuoteItem, addQuote, getQuotes, updateQuote, deleteQuote } from '../services/quoteService';
import { formatDate } from '../utils/formatDate';
import { addOrder, Order } from '../services/orderService';
import { getCustomers, Customer } from '../services/customerService';
import { getPriceRules, PriceRule, selectPriceRule } from '../services/priceService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { Plus, Save, X, Edit, Send, ClipboardList, CheckSquare, Trash2, ShoppingCart } from 'lucide-react';

const emptyItem = { materialName: '', quantity: '', unit: '', unitPrice: '', currency: 'TRY', exchangeRate: '1' };

export default function QuoteManagement() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    quoteNumber: '',
    quoteDate: new Date().toISOString().split('T')[0],
    customerId: '',
    customerName: '',
    status: 'draft' as Quote['status'],
    items: [] as QuoteItem[],
    notes: '',
    currency: 'TRY'
  });
  const [newItem, setNewItem] = useState({ ...emptyItem, currency: 'TRY', exchangeRate: '1' });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const company = getCurrentCompany();
      const [qs, cs, ps] = await Promise.all([
        getQuotes(company?.companyId),
        getCustomers(company?.companyId),
        getPriceRules(company?.companyId)
      ]);
      setQuotes(qs);
      setCustomers(cs);
      setPriceRules(ps);
    } catch (error: any) {
      const userInfo = JSON.parse(localStorage.getItem('currentUser') || 'null');
      await addErrorLog(`Teklifler yüklenirken hata: ${error.message || error}`, 'QuoteManagement', userInfo?.id, userInfo?.username);
    }
  };

  const resetForm = () => {
    setForm({
      quoteNumber: '',
      quoteDate: new Date().toISOString().split('T')[0],
      customerId: '',
      customerName: '',
      status: 'draft',
      items: [],
      notes: '',
      currency: 'TRY'
    });
    setNewItem({ ...emptyItem, currency: 'TRY', exchangeRate: '1' });
    setEditingId(null);
  };

  const addItem = () => {
    if (!newItem.materialName || !newItem.quantity || !newItem.unit) {
      alert('Malzeme, miktar, birim zorunlu');
      return;
    }
    const qty = parseFloat(newItem.quantity);
    let price = parseFloat(newItem.unitPrice);
    const lineCurrency = newItem.currency || form.currency || 'TRY';
    const exchangeRate = newItem.exchangeRate ? parseFloat(newItem.exchangeRate) : 1;
    if (isNaN(qty) || qty <= 0) {
      alert('Geçerli miktar girin');
      return;
    }
    if (isNaN(price) || price <= 0) {
      const customer = customers.find(c => c.id === form.customerId);
      const rule = selectPriceRule(newItem.materialName, form.customerId, customer?.group, priceRules, qty, lineCurrency);
      price = rule ? (rule.discountPercent ? rule.price * (1 - rule.discountPercent / 100) : rule.price) : 0;
    }
    const priceBase = lineCurrency === form.currency ? price : price * (exchangeRate || 1);
    const item: QuoteItem = {
      materialName: newItem.materialName,
      quantity: qty,
      unit: newItem.unit,
      unitPrice: priceBase,
      totalPrice: qty * priceBase,
      currency: lineCurrency,
      exchangeRate: exchangeRate || 1
    };
    setForm({ ...form, items: [...form.items, item] });
    setNewItem({ ...emptyItem, currency: form.currency, exchangeRate: '1' });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) {
      alert('Müşteri seçin');
      return;
    }
    if (form.items.length === 0) {
      alert('En az bir kalem ekleyin');
      return;
    }
    const total = form.items.reduce((s, i) => s + i.totalPrice, 0);
    const company = getCurrentCompany();
    const payload: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'> = {
      quoteNumber: form.quoteNumber || generateNumber(),
      quoteDate: new Date(form.quoteDate),
      customerId: form.customerId,
      customerName: form.customerName,
      status: form.status,
      items: form.items,
      totalAmount: total,
      notes: form.notes,
      companyId: company?.companyId
    };
    if (editingId) {
      await updateQuote(editingId, payload);
      alert('Teklif güncellendi');
    } else {
      await addQuote(payload);
      alert('Teklif eklendi');
    }
    setShowForm(false);
    resetForm();
    loadAll();
  };

  const handleEdit = (q: Quote) => {
    setEditingId(q.id || null);
    setForm({
      quoteNumber: q.quoteNumber,
      quoteDate: q.quoteDate.toISOString().split('T')[0],
      customerId: q.customerId || '',
      customerName: q.customerName || '',
      status: q.status,
      items: q.items,
      notes: q.notes || '',
      currency: q.currency || 'TRY'
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await deleteQuote(id);
    loadAll();
  };

  const convertToOrder = async (q: Quote) => {
    const company = getCurrentCompany();
    const order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
      orderNumber: `SIP-${q.quoteNumber}`,
      orderDate: new Date(),
      customerId: q.customerId,
      customerName: q.customerName,
      supplier: '',
      status: 'pending',
      items: q.items.map(i => ({
        materialName: i.materialName,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        currency: i.currency,
        exchangeRate: i.exchangeRate
      })),
      totalAmount: q.totalAmount,
      notes: `Tekliften oluşturuldu: ${q.quoteNumber}`,
      companyId: company?.companyId
    };
    await addOrder(order);
    alert('Sipariş oluşturuldu');
  };

  const onCustomerChange = (id: string) => {
    const cust = customers.find(c => c.id === id);
    setForm({ ...form, customerId: id, customerName: cust?.name || '' });
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <ClipboardList size={26} />
            <h1 style={{ fontSize: '26px', fontWeight: 700 }}>Teklif Yönetimi</h1>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Yeni Teklif
          </button>
        </div>

        {showForm && (
          <div className="excel-form" style={{ marginBottom: '16px' }}>
            <form onSubmit={handleSubmit}>
              <div className="grid-3">
                <div className="excel-form-group">
                  <label className="excel-form-label">Teklif No</label>
                  <input className="excel-form-input" value={form.quoteNumber} onChange={(e) => setForm({ ...form, quoteNumber: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Tarih</label>
                  <input type="date" className="excel-form-input" value={form.quoteDate} onChange={(e) => setForm({ ...form, quoteDate: e.target.value })} />
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Durum</label>
                  <select className="excel-form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Quote['status'] })}>
                    <option value="draft">Taslak</option>
                    <option value="sent">Gönderildi</option>
                    <option value="accepted">Kabul</option>
                    <option value="rejected">Red</option>
                  </select>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Müşteri</label>
                  <select className="excel-form-select" value={form.customerId} onChange={(e) => onCustomerChange(e.target.value)} required>
                    <option value="">Seçiniz</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.companyName && `(${c.companyName})`}</option>
                    ))}
                  </select>
                </div>
                <div className="excel-form-group">
                  <label className="excel-form-label">Para Birimi (Belge)</label>
                  <input className="excel-form-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: '14px', padding: '12px', border: '1px dashed #999' }}>
                <h4 style={{ marginBottom: '10px' }}>Kalem Ekle</h4>
                <div className="grid-4" style={{ gap: '8px' }}>
                  <input className="excel-form-input" placeholder="Malzeme" value={newItem.materialName} onChange={(e) => setNewItem({ ...newItem, materialName: e.target.value })} />
                  <input className="excel-form-input" placeholder="Miktar" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
                  <input className="excel-form-input" placeholder="Birim" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                  <input className="excel-form-input" placeholder="Birim Fiyat (boş: kural)" value={newItem.unitPrice} onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })} />
                  <input className="excel-form-input" placeholder="Kalem PB (vars: belge PB)" value={newItem.currency} onChange={(e) => setNewItem({ ...newItem, currency: e.target.value })} />
                  <input className="excel-form-input" placeholder={`Kur -> ${form.currency}`} value={newItem.exchangeRate} onChange={(e) => setNewItem({ ...newItem, exchangeRate: e.target.value })} />
                </div>
                <button type="button" className="btn btn-secondary" style={{ marginTop: '10px' }} onClick={addItem}><Plus size={12} /> Ekle</button>
                {form.items.length > 0 && (
                  <table className="excel-table" style={{ marginTop: '10px' }}>
                    <thead>
                      <tr>
                        <th>Malzeme</th>
                        <th>Miktar</th>
                        <th>Birim</th>
                        <th>Birim Fiyat</th>
                        <th>Kalem PB</th>
                        <th>Toplam</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.materialName}</td>
                          <td>{it.quantity}</td>
                          <td>{it.unit}</td>
                          <td>{it.unitPrice.toFixed(2)} {form.currency}</td>
                          <td>{it.currency || form.currency} {it.currency && it.currency !== form.currency ? `(kur ${it.exchangeRate || 1})` : ''}</td>
                          <td>{it.totalPrice.toFixed(2)} {form.currency}</td>
                          <td><button type="button" className="btn btn-secondary" onClick={() => removeItem(idx)}><X size={12} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <label className="excel-form-label">Not</label>
                <textarea className="excel-form-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary"><Save size={14} /> Kaydet</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}><X size={14} /> İptal</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          <table className="excel-table">
            <thead>
              <tr>
                <th>Teklif No</th>
                <th>Tarih</th>
                <th>Müşteri</th>
                <th>Durum</th>
                <th>Tutar</th>
                <th>PB</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id}>
                  <td>{q.quoteNumber}</td>
                    <td>{formatDate(q.quoteDate)}</td>
                  <td>{q.customerName}</td>
                  <td>{statusText(q.status)}</td>
                <td>{q.totalAmount.toFixed(2)} {q.currency || 'TRY'}</td>
                <td>{q.currency || 'TRY'}</td>
                  <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => handleEdit(q)}><Edit size={12} /> Düzenle</button>
                    <button className="btn btn-secondary" onClick={() => q.id && handleDelete(q.id)} style={{ color: '#dc3545' }}><Trash2 size={12} /> Sil</button>
                    <button className="btn btn-secondary" onClick={() => convertToOrder(q)}><ShoppingCart size={12} /> Sipariş</button>
                    <button className="btn btn-secondary" onClick={() => updateQuoteStatus(q, 'sent')}><Send size={12} /> Gönder</button>
                    <button className="btn btn-secondary" onClick={() => updateQuoteStatus(q, 'accepted')}><CheckSquare size={12} /> Kabul</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

const generateNumber = () => {
  const d = new Date();
  return `TEK-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`;
};

const statusText = (s: Quote['status']) => {
  switch (s) {
    case 'draft': return 'Taslak';
    case 'sent': return 'Gönderildi';
    case 'accepted': return 'Kabul';
    case 'rejected': return 'Red';
    default: return s;
  }
};

async function updateQuoteStatus(q: Quote, status: Quote['status']) {
  if (!q.id) return;
  await updateQuote(q.id, { status });
  alert('Durum güncellendi');
}


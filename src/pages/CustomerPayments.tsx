import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getCustomers, Customer } from '../services/customerService';
import { applyCustomerPayment, getCustomerTransactions, getCustomerAging } from '../services/financeService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { CreditCard, RefreshCw, Download } from 'lucide-react';

interface AgingBuckets {
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90plus: number;
  total: number;
}

export default function CustomerPayments() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [aging, setAging] = useState<AgingBuckets | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerData(selectedCustomerId);
    } else {
      setTransactions([]);
      setAging(null);
    }
  }, [selectedCustomerId]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const data = await getCustomers(currentCompany?.companyId);
      setCustomers(data);
    } catch (error: any) {
      console.error('Müşteri listesi yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Müşteri listesi yüklenirken hata: ${error.message || error}`,
        'CustomerPayments',
        userInfo?.id,
        userInfo?.username
      );
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerData = async (customerId: string) => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const tx = await getCustomerTransactions({ customerId, companyId: currentCompany?.companyId });
      const ag = await getCustomerAging({ customerId, companyId: currentCompany?.companyId });
      setTransactions(tx);
      setAging(ag);
    } catch (error: any) {
      console.error('Müşteri hareketleri yüklenirken hata:', error);
      alert('Müşteri hareketleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Lütfen müşteri seçin');
      return;
    }
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('Geçerli bir tahsilat tutarı girin');
      return;
    }
    try {
      setSubmitting(true);
      const currentCompany = getCurrentCompany();
      await applyCustomerPayment({
        customerId: selectedCustomerId,
        amount: paymentAmount,
        currency: 'TRY',
        companyId: currentCompany?.companyId,
        description: description || 'Tahsilat'
      });
      alert('Tahsilat kaydedildi');
      setAmount('');
      setDescription('');
      loadCustomerData(selectedCustomerId);
    } catch (error: any) {
      console.error('Tahsilat kaydedilirken hata:', error);
      alert('Tahsilat kaydedilirken hata: ' + (error.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const exportTransactions = async () => {
    if (!transactions.length) {
      alert('Dışa aktarılacak hareket yok');
      return;
    }
    const XLSX = await import('xlsx');
    const data = transactions.map((tx) => ({
      Tarih: new Date(tx.date).toLocaleDateString('tr-TR'),
      Tür: tx.type === 'charge' ? 'Borç' : 'Tahsilat',
      Tutar: tx.amount,
      Açıklama: tx.description || '',
      Referans: tx.referenceId || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hareketler');
    XLSX.writeFile(wb, `musteri_hareketleri_${selectedCustomer?.name || 'secili'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportAging = async () => {
    if (!aging) {
      alert('Yaşlandırma verisi yok');
      return;
    }
    const XLSX = await import('xlsx');
    const data = [
      { Periyot: '0-30 Gün', Tutar: aging.bucket0_30 },
      { Periyot: '31-60 Gün', Tutar: aging.bucket31_60 },
      { Periyot: '61-90 Gün', Tutar: aging.bucket61_90 },
      { Periyot: '90+ Gün', Tutar: aging.bucket90plus },
      { Periyot: 'Toplam', Tutar: aging.total }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yaslandirma');
    XLSX.writeFile(wb, `musteri_yaslandirma_${selectedCustomer?.name || 'secili'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CreditCard size={32} color="#000" />
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#000', letterSpacing: '-0.5px' }}>
              Tahsilat ve Yaşlandırma
            </h1>
          </div>
          <button
            onClick={loadCustomers}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Yenile
          </button>
        </div>

        {/* Müşteri seçimi */}
        <div style={{ background: 'white', border: '2px solid #000', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                Müşteri
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
              >
                <option value="">Seçiniz</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName && `(${c.companyName})`}
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#333', display: 'grid', gap: '4px' }}>
                  <span><strong>Telefon:</strong> {selectedCustomer.phone || '-'}</span>
                  <span><strong>E-posta:</strong> {selectedCustomer.email || '-'}</span>
                  <span><strong>Şehir:</strong> {selectedCustomer.city || '-'}</span>
                  <span>
                    <strong>Bakiye:</strong> {(selectedCustomer.balance || 0).toFixed(2)} ₺
                    {selectedCustomer.creditLimit !== undefined && (
                      <span style={{ marginLeft: '8px' }}>
                        <strong>Limit:</strong> {selectedCustomer.creditLimit.toFixed(2)} ₺
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                Tahsilat Tutarı (₺)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: '100%', padding: '12px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
                Açıklama
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', padding: '12px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '15px' }}>
            <button
              onClick={handlePayment}
              className="btn btn-primary"
              disabled={submitting || !selectedCustomerId}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Tahsilatı Kaydet
            </button>
            {selectedCustomerId && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  onClick={exportTransactions}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={16} />
                  Hareketleri Excel'e Aktar
                </button>
                <button
                  onClick={exportAging}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={16} />
                  Yaşlandırma Excel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Yaşlandırma */}
        {selectedCustomerId && (
          <div style={{ marginBottom: '20px', background: 'white', border: '2px solid #000', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Yaşlandırma</h3>
            {aging ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <InfoBox label="0-30 Gün" value={aging.bucket0_30} />
                <InfoBox label="31-60 Gün" value={aging.bucket31_60} />
                <InfoBox label="61-90 Gün" value={aging.bucket61_90} />
                <InfoBox label="90+ Gün" value={aging.bucket90plus} />
                <InfoBox label="Toplam" value={aging.total} bold />
              </div>
            ) : (
              <div>Yükleniyor...</div>
            )}
          </div>
        )}

        {/* Hareketler */}
        {selectedCustomerId && (
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
            ) : transactions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                Henüz hareket bulunmuyor.
              </div>
            ) : (
              <table className="excel-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Tür</th>
                    <th>Tutar</th>
                    <th>Açıklama</th>
                    <th>Referans</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.date).toLocaleDateString('tr-TR')}</td>
                      <td>{tx.type === 'charge' ? 'Borç' : 'Tahsilat'}</td>
                      <td style={{ color: tx.amount > 0 ? '#c0392b' : '#27ae60', fontWeight: 600 }}>
                        {tx.amount.toFixed(2)} ₺
                      </td>
                      <td>{tx.description || '-'}</td>
                      <td>{tx.referenceId || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function InfoBox({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div style={{ border: '1px solid #000', padding: '12px', background: '#fff' }}>
      <div style={{ fontSize: '12px', color: '#555', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: bold ? 700 : 600, color: '#000' }}>
        {value.toFixed(2)} ₺
      </div>
    </div>
  );
}


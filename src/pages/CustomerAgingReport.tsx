import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getCustomers, Customer } from '../services/customerService';
import { getCustomerAging } from '../services/financeService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { CalendarRange, Users, RefreshCw, Download } from 'lucide-react';

interface AgingRow {
  customer: Customer;
  aging: {
    bucket0_30: number;
    bucket31_60: number;
    bucket61_90: number;
    bucket90plus: number;
    total: number;
  };
}

export default function CustomerAgingReport() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [asOf, setAsOf] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [asOf]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const customerList = await getCustomers(currentCompany?.companyId);
      setCustomers(customerList);
      const asOfDate = new Date(asOf);
      const agingData = await Promise.all(
        customerList.map(async (c) => {
          const aging = await getCustomerAging({ customerId: c.id!, companyId: currentCompany?.companyId, asOf: asOfDate });
          return { customer: c, aging };
        })
      );
      setRows(agingData);
    } catch (error: any) {
      console.error('Yaşlandırma raporu yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Yaşlandırma raporu yüklenirken hata: ${error.message || error}`,
        'CustomerAgingReport',
        userInfo?.id,
        userInfo?.username
      );
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!rows.length) {
      alert('Dışa aktarılacak veri yok');
      return;
    }
    const XLSX = await import('xlsx');
    const data = rows.map((r) => ({
      Müşteri: r.customer.name,
      Şirket: r.customer.companyName || '',
      Telefon: r.customer.phone || '',
      Email: r.customer.email || '',
      '0-30 Gün': r.aging.bucket0_30,
      '31-60 Gün': r.aging.bucket31_60,
      '61-90 Gün': r.aging.bucket61_90,
      '90+ Gün': r.aging.bucket90plus,
      Toplam: r.aging.total
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yaslandirma');
    XLSX.writeFile(wb, `musteri_yaslandirma_genel_${asOf}.xlsx`);
  };

  const totals = rows.reduce(
    (acc, r) => {
      acc.bucket0_30 += r.aging.bucket0_30;
      acc.bucket31_60 += r.aging.bucket31_60;
      acc.bucket61_90 += r.aging.bucket61_90;
      acc.bucket90plus += r.aging.bucket90plus;
      acc.total += r.aging.total;
      return acc;
    },
    { bucket0_30: 0, bucket31_60: 0, bucket61_90: 0, bucket90plus: 0, total: 0 }
  );

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CalendarRange size={32} color="#000" />
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#000', letterSpacing: '-0.5px' }}>
              Cari Yaşlandırma Raporu
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadReport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading}>
              <RefreshCw size={16} />
              Yenile
            </button>
            <button onClick={exportExcel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading || !rows.length}>
              <Download size={16} />
              Excel
            </button>
          </div>
        </div>

        <div style={{ background: 'white', border: '2px solid #000', padding: '20px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Rapor Tarihi (As of)
            </label>
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              style={{ padding: '10px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
            />
          </div>
          <div style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} />
            {rows.length} müşteri
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Kayıt bulunamadı.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>Şirket</th>
                  <th>0-30 Gün</th>
                  <th>31-60 Gün</th>
                  <th>61-90 Gün</th>
                  <th>90+ Gün</th>
                  <th>Toplam</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.customer.id}>
                    <td style={{ fontWeight: 600 }}>{row.customer.name}</td>
                    <td>{row.customer.companyName || '-'}</td>
                    <td>{row.aging.bucket0_30.toFixed(2)} ₺</td>
                    <td>{row.aging.bucket31_60.toFixed(2)} ₺</td>
                    <td>{row.aging.bucket61_90.toFixed(2)} ₺</td>
                    <td>{row.aging.bucket90plus.toFixed(2)} ₺</td>
                    <td style={{ fontWeight: 700 }}>{row.aging.total.toFixed(2)} ₺</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>Genel Toplam</td>
                  <td>{totals.bucket0_30.toFixed(2)} ₺</td>
                  <td>{totals.bucket31_60.toFixed(2)} ₺</td>
                  <td>{totals.bucket61_90.toFixed(2)} ₺</td>
                  <td>{totals.bucket90plus.toFixed(2)} ₺</td>
                  <td style={{ fontWeight: 700 }}>{totals.total.toFixed(2)} ₺</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}


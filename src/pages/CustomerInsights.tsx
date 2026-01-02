import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getCustomers, Customer } from '../services/customerService';
import { getShipments, Shipment } from '../services/shipmentService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { UserCircle2, TrendingUp, CreditCard, Package } from 'lucide-react';

export default function CustomerInsights() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const company = getCurrentCompany();
      const [c, s] = await Promise.all([
        getCustomers(company?.companyId),
        getShipments({ companyId: company?.companyId })
      ]);
      setCustomers(c);
      setShipments(s);
    } catch (error: any) {
      const userInfo = JSON.parse(localStorage.getItem('currentUser') || 'null');
      await addErrorLog(`CustomerInsights yüklenirken hata: ${error.message || error}`, 'CustomerInsights', userInfo?.id, userInfo?.username);
    } finally {
      setLoading(false);
    }
  };

  const customer = customers.find(c => c.id === selectedCustomer);
  const customerShipments = shipments.filter(s => s.customerId === selectedCustomer);

  const totalValue = customerShipments.reduce((sum, sh) => sum + (sh.totalAmount || 0), 0);
  const openBalance = customer?.balance || 0;
  const creditLimit = customer?.creditLimit;
  const topItems = getTopItems(customerShipments, 5);

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCircle2 size={26} />
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Müşteri Görünümü</h1>
          </div>
        </div>

        <div style={{ background: '#fff', border: '2px solid #000', padding: '20px', marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Müşteri Seç</label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '2px solid #000', borderRadius: '0', fontSize: '14px' }}
          >
            <option value="">Seçiniz</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.companyName && `(${c.companyName})`}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
        ) : !customer ? (
          <div style={{ padding: '20px', color: '#666' }}>Müşteri seçin.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
            <InfoBox icon={<CreditCard size={16} />} label="Açık Bakiye" value={`${openBalance.toFixed(2)} ₺`} />
            <InfoBox icon={<CreditCard size={16} />} label="Kredi Limiti" value={creditLimit !== undefined ? `${creditLimit.toFixed(2)} ₺` : '-'} />
            <InfoBox icon={<TrendingUp size={16} />} label="Toplam Sevkiyat Tutarı" value={`${totalValue.toFixed(2)} ₺`} />
            <InfoBox icon={<Package size={16} />} label="Sevkiyat Sayısı" value={`${customerShipments.length}`} />
          </div>
        )}

        {customer && (
          <div style={{ marginTop: '20px', background: '#fff', border: '2px solid #000', padding: '20px' }}>
            <h3 style={{ marginBottom: '12px', fontWeight: 700 }}>En Çok Alınan Ürünler</h3>
            {topItems.length === 0 ? (
              <div style={{ color: '#666' }}>Kayıt bulunamadı.</div>
            ) : (
              <table className="excel-table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((t, idx) => (
                    <tr key={idx}>
                      <td>{t.name}</td>
                      <td>{t.qty}</td>
                      <td>{t.amount.toFixed(2)} ₺</td>
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

function InfoBox({ icon, label, value }: { icon: JSX.Element; label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #000', padding: '12px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#555' }}>
        {icon} <span>{label}</span>
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function getTopItems(shipments: Shipment[], limit: number) {
  const agg: Record<string, { qty: number; amount: number }> = {};
  shipments.forEach((s) => {
    (s.items || []).forEach((it: any) => {
      if (!agg[it.materialName]) agg[it.materialName] = { qty: 0, amount: 0 };
      agg[it.materialName].qty += it.quantity || 0;
      agg[it.materialName].amount += (it.quantity || 0) * (it.unitPrice || 0);
    });
  });
  return Object.entries(agg)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}


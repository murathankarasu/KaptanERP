import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getCurrentUser } from '../utils/getCurrentUser';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCustomers } from '../services/customerService';
import { getOrders } from '../services/orderService';
import { getShipments } from '../services/shipmentService';
import { getAllStockStatus } from '../services/stockService';
import { getRequisitions, getRFQs, getPurchaseOrders, getGoodsReceipts } from '../services/procurementService';
import { getBOMs, getProductionOrders } from '../services/productionService';
import { getLeaveRequests } from '../services/hrmService';
import { collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FileDown, Trash2, Shield } from 'lucide-react';

const SettingsPage = () => {
  const user = getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const company = getCurrentCompany();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      alert('Bu sayfa sadece yönetici içindir.');
      window.location.href = '/dashboard';
    }
  }, [isAdmin]);

  const downloadCsv = (name: string, rows: any[], fields: string[]) => {
    const header = fields.join(',');
    const lines = rows.map(r => fields.map(f => (r[f] ?? '')).join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAll = async () => {
    try {
      setBusy(true);
      const companyId = company?.companyId;
      const [customers, orders, shipments, stock, reqs, rfqs, pos, grns, boms, prod, leaves] = await Promise.all([
        getCustomers(companyId),
        getOrders({ companyId }),
        getShipments({ companyId }),
        getAllStockStatus(companyId),
        getRequisitions(companyId),
        getRFQs(companyId),
        getPurchaseOrders(companyId),
        getGoodsReceipts(companyId),
        getBOMs(companyId),
        getProductionOrders(companyId),
        getLeaveRequests(companyId)
      ]);
      downloadCsv('customers', customers, ['name','companyName','phone','email','city','balance','creditLimit']);
      downloadCsv('orders', orders, ['orderNumber','orderDate','customerName','status','totalAmount']);
      downloadCsv('shipments', shipments, ['shipmentNumber','shipmentDate','customerName','status','totalAmount']);
      downloadCsv('stock', stock, ['materialName','warehouse','currentStock','unit','sku','variant']);
      downloadCsv('requisitions', reqs, ['reqNumber','requestDate','status']);
      downloadCsv('rfqs', rfqs, ['rfqNumber','dueDate','status']);
      downloadCsv('purchase_orders', pos, ['poNumber','supplier','orderDate','status','totalAmount']);
      downloadCsv('goods_receipts', grns, ['grnNumber','receiptDate','status','warehouse']);
      downloadCsv('boms', boms, ['productName','sku','version']);
      downloadCsv('production_orders', prod, ['orderNumber','productName','quantity','status','workstation']);
      downloadCsv('leaves', leaves, ['personnelName','startDate','endDate','days','type','status']);
      alert('Tüm veriler indirildi (CSV).');
    } catch (err: any) {
      alert('İndirme hatası: ' + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const deleteAll = async () => {
    if (!isAdmin) return;
    if (!company?.companyId) {
      alert('Şirket bilgisi bulunamadı.');
      return;
    }
    const sure = confirm('Bu işlem geri alınamaz. Bu şirketin verilerini SİLMEK istediğine emin misin?');
    if (!sure) return;
    try {
      setBusy(true);
      const companyId = company.companyId;
      const colNames = [
        'customers','orders','shipments','stockStatus','requisitions','rfqs','purchaseOrders','goodsReceipts','boms','productionOrders','leaveRequests','activityLogs','priceRules','products','bins','transactions','journalEntries'
      ];
      for (const colName of colNames) {
        const qRef = query(collection(db, colName), where('companyId','==',companyId));
        const snap = await getDocs(qRef);
        const deletes = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletes);
      }
      alert('Tüm veriler silindi.');
    } catch (err: any) {
      alert('Silme hatası: ' + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '30px', maxWidth: '700px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Shield size={22} />
          <h1 style={{ fontSize: '26px', fontWeight: 700 }}>Ayarlar (Yönetici)</h1>
        </div>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
          Bu işlemler geri alınamaz. Sadece yönetici hesabı erişebilir.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="btn btn-primary" onClick={exportAll} disabled={busy}>
            <FileDown size={14} /> Tüm Verileri CSV İndir
          </button>
          <button className="btn btn-secondary" style={{ background: '#dc3545', borderColor: '#dc3545' }} onClick={deleteAll} disabled={busy}>
            <Trash2 size={14} /> Tüm Verileri Sil (Geri Alınamaz)
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;


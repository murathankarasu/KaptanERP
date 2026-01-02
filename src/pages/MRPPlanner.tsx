import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { getOrders, Order } from '../services/orderService';
import { getAllStockStatus } from '../services/stockService';
import { getBOMs, BOM } from '../services/productionService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { addRequisition, addRFQ, addPurchaseOrder } from '../services/procurementService';
import { BarChart3, RefreshCw, Download, ClipboardList, FilePlus } from 'lucide-react';

interface ShortageRow {
  materialName: string;
  needed: number;
  unit: string;
  available: number;
  shortage: number;
  product: string;
}

export default function MRPPlanner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [creatingReq, setCreatingReq] = useState(false);
  const [creatingRfq, setCreatingRfq] = useState(false);
  const [creatingPo, setCreatingPo] = useState(false);
  const [defaultSupplier, setDefaultSupplier] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [supplierMap, setSupplierMap] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const company = getCurrentCompany();
      const [o, b, s] = await Promise.all([
        getOrders({ companyId: company?.companyId }),
        getBOMs(company?.companyId),
        getAllStockStatus(company?.companyId)
      ]);
      setOrders(o);
      setBoms(b);
      setStock(s);
    } catch (error: any) {
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(`MRP yüklenirken hata: ${error.message || error}`, 'MRPPlanner', userInfo?.id, userInfo?.username);
      alert('Veriler yüklenirken hata');
    } finally {
      setLoading(false);
    }
  };

  const shortages = useMemo<ShortageRow[]>(() => {
    const rows: ShortageRow[] = [];
    const stockMap = new Map<string, { qty: number; unit: string }>();
    stock.forEach(s => stockMap.set(`${s.materialName}|${s.unit}`, { qty: s.currentStock, unit: s.unit }));

    orders.filter(o => o.status !== 'cancelled').forEach(order => {
      order.items.forEach(item => {
        const bom = boms.find(b => b.productName === item.materialName || b.sku === item.materialName);
        if (!bom) return;
        bom.items.forEach(bi => {
          const need = bi.quantity * item.quantity;
          const key = `${bi.materialName}|${bi.unit}`;
          const available = stockMap.get(key)?.qty || 0;
          const shortage = Math.max(0, need - available);
          rows.push({
            materialName: bi.materialName,
            needed: need,
            unit: bi.unit,
            available,
            shortage,
            product: bom.productName
          });
        });
      });
    });
    return rows.filter(r => r.shortage > 0).sort((a, b) => b.shortage - a.shortage);
  }, [orders, boms, stock]);

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={24} />
            <h1 style={{ fontSize: '26px', fontWeight: 700 }}>MRP (Eksik Malzeme Listesi)</h1>
          </div>
          <button className="btn btn-secondary" onClick={() => { loadData(); setShowResults(true); }}>
            <RefreshCw size={14} /> MRP Çalıştır
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Varsayılan Tedarikçi</label>
            <input
              className="excel-form-input"
              value={defaultSupplier}
              onChange={(e) => setDefaultSupplier(e.target.value)}
              placeholder="Örn: ABC Tedarik"
              style={{ width: '220px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Lead Time (gün)</label>
            <input
              type="number"
              className="excel-form-input"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(parseInt(e.target.value || '0', 10))}
              style={{ width: '120px' }}
            />
          </div>
        </div>

        {loading && <div style={{ padding: '20px' }}>Yükleniyor...</div>}

        {showResults && shortages.length === 0 && !loading && (
          <div style={{ padding: '20px', color: '#555' }}>Eksik malzeme yok.</div>
        )}

        {showResults && shortages.length > 0 && (
          <div className="table-container">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button className="btn btn-secondary" onClick={() => downloadCsv(shortages)}>
                <Download size={14} /> CSV Dışa Aktar
              </button>
              <button className="btn btn-primary" style={{ marginLeft: '8px' }} disabled={creatingReq} onClick={() => createRequisition(shortages, setCreatingReq)}>
                <ClipboardList size={14} /> Satınalma Talebi
              </button>
              <button className="btn btn-primary" style={{ marginLeft: '8px' }} disabled={creatingRfq} onClick={() => createRfq(shortages, supplierMap, defaultSupplier, leadTimeDays, setCreatingRfq)}>
                <FilePlus size={14} /> RFQ Oluştur
              </button>
              <button className="btn btn-primary" style={{ marginLeft: '8px' }} disabled={creatingPo} onClick={() => createPo(shortages, supplierMap, defaultSupplier, leadTimeDays, setCreatingPo)}>
                <FilePlus size={14} /> PO Oluştur
              </button>
            </div>
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Malzeme</th>
                  <th>İhtiyaç</th>
                  <th>Mevcut</th>
                  <th>Açık</th>
                  <th>Tedarikçi</th>
                  <th>Ürün</th>
                </tr>
              </thead>
              <tbody>
                {shortages.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.materialName}</td>
                    <td>{r.needed.toFixed(2)} {r.unit}</td>
                    <td>{r.available.toFixed(2)} {r.unit}</td>
                    <td style={{ color: '#dc3545', fontWeight: 700 }}>{r.shortage.toFixed(2)} {r.unit}</td>
                    <td>
                      <input
                        className="excel-form-input"
                        value={supplierMap[r.materialName] || defaultSupplier}
                        onChange={(e) => setSupplierMap({ ...supplierMap, [r.materialName]: e.target.value })}
                        placeholder="Tedarikçi"
                        style={{ width: '140px' }}
                      />
                    </td>
                    <td>{r.product}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

const downloadCsv = (rows: ShortageRow[]) => {
  const header = ['Malzeme', 'İhtiyaç', 'Mevcut', 'Açık', 'Birim', 'Ürün'];
  const lines = rows.map(r => [
    r.materialName,
    r.needed,
    r.available,
    r.shortage,
    r.unit,
    r.product
  ].join(','));
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mrp_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const createRequisition = async (rows: ShortageRow[], setCreating: (b: boolean) => void) => {
  try {
    setCreating(true);
    const company = getCurrentCompany();
    const items = rows.map(r => ({
      materialName: r.materialName,
      quantity: r.shortage,
      unit: r.unit,
      notes: `MRP ürün: ${r.product}`
    }));
    const reqNumber = `MRP-${new Date().getTime()}`;
    await addRequisition({
      reqNumber,
      requestDate: new Date(),
      requestedBy: 'MRP',
      status: 'draft',
      items,
      companyId: company?.companyId
    });
    alert('Satınalma talebi oluşturuldu');
  } catch (error: any) {
    alert('Talep oluşturulurken hata: ' + (error.message || error));
  } finally {
    setCreating(false);
  }
};

const createRfq = async (
  rows: ShortageRow[],
  supplierMap: Record<string, string>,
  defaultSupplier: string,
  leadTime: number,
  setCreating: (b: boolean) => void
) => {
  try {
    setCreating(true);
    const company = getCurrentCompany();
    const items = rows.map(r => ({
      materialName: r.materialName,
      quantity: r.shortage,
      unit: r.unit,
      notes: `MRP ürün: ${r.product}`
    }));
    const suppliers = Array.from(new Set(items.map(it => supplierMap[it.materialName] || defaultSupplier).filter(Boolean)));
    if (suppliers.length === 0) {
      alert('RFQ için en az bir tedarikçi girin');
      return;
    }
    const rfqNumber = `RFQ-${new Date().getTime()}`;
    await addRFQ({
      rfqNumber,
      suppliers,
      dueDate: new Date(Date.now() + leadTime * 24 * 60 * 60 * 1000),
      items,
      status: 'open',
      companyId: company?.companyId
    });
    alert('RFQ oluşturuldu');
  } catch (error: any) {
    alert('RFQ oluşturulurken hata: ' + (error.message || error));
  } finally {
    setCreating(false);
  }
};

const createPo = async (
  rows: ShortageRow[],
  supplierMap: Record<string, string>,
  defaultSupplier: string,
  _leadTime: number,
  setCreating: (b: boolean) => void
) => {
  try {
    setCreating(true);
    const company = getCurrentCompany();
    const supplierGroups: Record<string, typeof rows> = {};
    rows.forEach(r => {
      const sup = supplierMap[r.materialName] || defaultSupplier;
      if (!sup) return;
      if (!supplierGroups[sup]) supplierGroups[sup] = [];
      supplierGroups[sup].push(r);
    });
    const suppliers = Object.keys(supplierGroups);
    if (suppliers.length === 0) {
      alert('PO için tedarikçi girin');
      return;
    }
    const orderDate = new Date();
    for (const sup of suppliers) {
      const items = supplierGroups[sup].map(r => ({
        materialName: r.materialName,
        quantity: r.shortage,
        unit: r.unit,
        notes: `MRP ürün: ${r.product}`
      }));
      const poNumber = `PO-${sup}-${new Date().getTime()}`;
      await addPurchaseOrder({
        poNumber,
        supplier: sup,
        orderDate,
        items,
        status: 'pending',
        totalAmount: 0,
        companyId: company?.companyId
      });
    }
    alert(`PO oluşturuldu (${suppliers.length} tedarikçi)`);
  } catch (error: any) {
    alert('PO oluşturulurken hata: ' + (error.message || error));
  } finally {
    setCreating(false);
  }
};


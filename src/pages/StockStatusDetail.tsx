import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStockEntries, StockEntry } from '../services/stockService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { formatDate } from '../utils/formatDate';

export default function StockStatusDetail() {
  const [searchParams] = useSearchParams();
  const sku = (searchParams.get('sku') || '').trim();
  const materialName = (searchParams.get('materialName') || '').trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [entries, setEntries] = useState<StockEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const currentCompany = getCurrentCompany();
        const all = await getStockEntries({ companyId: currentCompany?.companyId });

        const filtered = sku
          ? all.filter((e) => (e.sku || '') === sku)
          : materialName
            ? all.filter((e) => e.materialName === materialName)
            : [];

        const sorted = [...filtered].sort((a, b) => {
          const at = (a.arrivalDate as any)?.getTime?.() ? (a.arrivalDate as any).getTime() : new Date(a.arrivalDate as any).getTime();
          const bt = (b.arrivalDate as any)?.getTime?.() ? (b.arrivalDate as any).getTime() : new Date(b.arrivalDate as any).getTime();
          return bt - at;
        });

        setEntries(sorted);
        if (sorted.length === 0) {
          setError(sku ? `SKU (${sku}) için stok girişi bulunamadı.` : 'Stok girişi bulunamadı.');
        }
      } catch (e: any) {
        setError(e?.message || 'Detay yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sku, materialName]);

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div style={{
        padding: '16px 24px',
        borderBottom: '2px solid #000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>Ürün Detayı</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {sku ? `SKU: ${sku}` : materialName ? `Ürün: ${materialName}` : '—'}
            {entries.length ? ` • Kayıt: ${entries.length}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => window.print()}
            style={{ padding: '10px 14px', fontSize: '13px' }}
          >
            Yazdır
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => window.close()}
            style={{ padding: '10px 14px', fontSize: '13px' }}
          >
            Kapat
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <div style={{ color: '#666' }}>Yükleniyor...</div>
        ) : error ? (
          <div style={{ padding: '12px', background: '#fee', border: '1px solid #f00', color: '#a00' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Geliş Tarihi</th>
                  <th>Barkod</th>
                  <th>SKU</th>
                  <th>Malzeme</th>
                  <th>Kategori</th>
                  <th>Varyant</th>
                  <th>Depo</th>
                  <th>Raf/Göz</th>
                  <th>Seri/Lot</th>
                  <th>SKT</th>
                  <th>Miktar</th>
                  <th>Birim Fiyat</th>
                  <th>Tedarikçi</th>
                  <th>Not</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id || `${e.barcode || ''}-${String(e.arrivalDate)}`}>
                    <td>{formatDate(e.arrivalDate) || '-'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{e.barcode || '-'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{e.sku || '-'}</td>
                    <td>{e.materialName}</td>
                    <td>{e.category || '-'}</td>
                    <td>{e.variant || '-'}</td>
                    <td>{e.warehouse || '-'}</td>
                    <td>{e.binCode || '-'}</td>
                    <td>{e.serialLot || '-'}</td>
                    <td>{e.expiryDate ? formatDate(e.expiryDate) : '-'}</td>
                    <td>{e.quantity} {e.unit}</td>
                    <td>{e.unitPrice ? `${e.unitPrice.toFixed(2)} ₺` : '-'}</td>
                    <td>{e.supplier || '-'}</td>
                    <td>{e.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



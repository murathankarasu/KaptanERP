import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getAllStockStatus, StockStatus } from '../services/stockService';
import { exportStockStatusToExcel } from '../utils/excelExport';
import { Download, AlertCircle } from 'lucide-react';

export default function StockStatusPage() {
  const [stockStatus, setStockStatus] = useState<StockStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'green' | 'orange' | 'red'>('all');

  useEffect(() => {
    loadStockStatus();
  }, []);

  const loadStockStatus = async () => {
    try {
      setLoading(true);
      const data = await getAllStockStatus();
      setStockStatus(data);
    } catch (error) {
      console.error('Stok durumu yüklenirken hata:', error);
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const filtered = filterStatus === 'all' 
      ? stockStatus 
      : stockStatus.filter(s => s.status === filterStatus);
    exportStockStatusToExcel(filtered, `stok_durumu_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'green':
        return <span className="status-green">Yeşil</span>;
      case 'orange':
        return <span className="status-orange">Turuncu</span>;
      case 'red':
        return <span className="status-red">Kırmızı</span>;
      default:
        return <span>-</span>;
    }
  };

  const filteredStatus = filterStatus === 'all' 
    ? stockStatus 
    : stockStatus.filter(s => s.status === filterStatus);

  const statusCounts = {
    all: stockStatus.length,
    green: stockStatus.filter(s => s.status === 'green').length,
    orange: stockStatus.filter(s => s.status === 'orange').length,
    red: stockStatus.filter(s => s.status === 'red').length
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
            Stok Durumu
          </h1>
          <button onClick={handleExport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} />
            Excel'e Aktar
          </button>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '20px', 
          borderRadius: '0', 
          marginBottom: '20px',
          border: '2px solid #000'
        }}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', color: '#000' }}>Durum Filtresi:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className="btn"
              style={{
                background: filterStatus === 'all' ? '#000' : '#fff',
                color: filterStatus === 'all' ? 'white' : '#000',
                border: '2px solid #000',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              Tümü ({statusCounts.all})
            </button>
            <button
              onClick={() => setFilterStatus('green')}
              className="btn"
              style={{
                background: filterStatus === 'green' ? '#28a745' : '#fff',
                color: filterStatus === 'green' ? 'white' : '#000',
                border: filterStatus === 'green' ? '2px solid #28a745' : '2px solid #000',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              Yeşil ({statusCounts.green})
            </button>
            <button
              onClick={() => setFilterStatus('orange')}
              className="btn"
              style={{
                background: filterStatus === 'orange' ? '#ffc107' : '#fff',
                color: filterStatus === 'orange' ? '#000' : '#000',
                border: filterStatus === 'orange' ? '2px solid #ffc107' : '2px solid #000',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              Turuncu ({statusCounts.orange})
            </button>
            <button
              onClick={() => setFilterStatus('red')}
              className="btn"
              style={{
                background: filterStatus === 'red' ? '#dc3545' : '#fff',
                color: filterStatus === 'red' ? 'white' : '#000',
                border: filterStatus === 'red' ? '2px solid #dc3545' : '2px solid #000',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              Kırmızı ({statusCounts.red})
            </button>
          </div>
        </div>

        {/* Bilgi Notu */}
        <div style={{
          background: '#fff',
          border: '2px solid #000',
          borderRadius: '0',
          padding: '20px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#000'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <AlertCircle size={20} color="#000" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Durum Açıklamaları:</strong>
              <ul style={{ marginTop: '12px', paddingLeft: '20px', lineHeight: '1.8' }}>
                <li><strong>Yeşil:</strong> Mevcut stok kritik seviyenin üstünde</li>
                <li><strong>Turuncu:</strong> Mevcut stok kritik seviyeye yaklaşıyor (kritik seviyenin 1.5 katına kadar)</li>
                <li><strong>Kırmızı:</strong> Mevcut stok kritik seviyenin altında veya sıfır</li>
              </ul>
              <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '12px', color: '#666' }}>
                Bu sayfa otomatik olarak hesaplanır. Stok giriş ve çıkışlarına göre güncellenir.
              </p>
            </div>
          </div>
        </div>

        {/* Tablo */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : filteredStatus.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              {filterStatus === 'all' 
                ? 'Henüz stok durumu kaydı bulunmamaktadır.'
                : `Bu durumda stok bulunmamaktadır.`
              }
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Malzeme Adı</th>
                  <th>Toplam Giriş</th>
                  <th>Toplam Çıkış</th>
                  <th>Mevcut Stok</th>
                  <th>Kritik Seviye</th>
                  <th>Durum</th>
                  <th>Birim</th>
                </tr>
              </thead>
              <tbody>
                {filteredStatus.map((status) => (
                  <tr key={status.id}>
                    <td style={{ fontWeight: '500' }}>{status.materialName}</td>
                    <td>{status.totalEntry}</td>
                    <td>{status.totalOutput}</td>
                    <td style={{ 
                      fontWeight: '700',
                      color: status.status === 'red' ? '#dc3545' : status.status === 'orange' ? '#ffc107' : '#28a745'
                    }}>
                      {status.currentStock}
                    </td>
                    <td>{status.criticalLevel}</td>
                    <td>{getStatusBadge(status.status)}</td>
                    <td>{status.unit}</td>
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


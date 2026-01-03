import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { getCurrentCompany } from '../../utils/getCurrentCompany';
import { getCurrentUser } from '../../utils/getCurrentUser';
import { getAllStockStatus, getStockEntries, getStockOutputs } from '../../services/stockService';
import { getOrders } from '../../services/orderService';
import { addErrorLog } from '../../services/userService';
import { Zap, ArrowLeft, TrendingUp, AlertTriangle, Calendar, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Predictions() {
  const navigate = useNavigate();
  const company = getCurrentCompany();
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<any>(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const companyId = company?.companyId;
      if (!companyId) {
        throw new Error('Şirket bilgisi bulunamadı');
      }

      // Son 90 günün verilerini al
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const [stockStatus, entries, outputs, orders] = await Promise.all([
        getAllStockStatus(companyId),
        getStockEntries({ companyId }),
        getStockOutputs({ companyId }),
        getOrders({ companyId })
      ]);

      // Son 90 günün verilerini filtrele
      const recentEntries = entries.filter(e => {
        const date = e.arrivalDate instanceof Date ? e.arrivalDate : new Date(e.arrivalDate);
        return date >= startDate && date <= endDate;
      });

      const recentOutputs = outputs.filter(o => {
        const date = o.issueDate instanceof Date ? o.issueDate : new Date(o.issueDate);
        return date >= startDate && date <= endDate;
      });

      const recentOrders = orders.filter(o => {
        const date = o.orderDate instanceof Date ? o.orderDate : new Date(o.orderDate);
        return date >= startDate && date <= endDate;
      });

      // Basit tahminler hesapla
      const avgDailyEntry = recentEntries.length / 90;
      const avgDailyOutput = recentOutputs.length / 90;
      const avgDailyOrder = recentOrders.length / 90;

      const criticalStock = stockStatus.filter(s => s.status === 'red').length;
      const warningStock = stockStatus.filter(s => s.status === 'orange').length;

      // 30 günlük tahminler
      const predictedEntries = Math.round(avgDailyEntry * 30);
      const predictedOutputs = Math.round(avgDailyOutput * 30);
      const predictedOrders = Math.round(avgDailyOrder * 30);

      const predictionsData = {
        period: 'Sonraki 30 Gün',
        current: {
          criticalStock,
          warningStock,
          totalStock: stockStatus.length
        },
        trends: {
          avgDailyEntry: avgDailyEntry.toFixed(1),
          avgDailyOutput: avgDailyOutput.toFixed(1),
          avgDailyOrder: avgDailyOrder.toFixed(1)
        },
        predictions: {
          entries: predictedEntries,
          outputs: predictedOutputs,
          orders: predictedOrders
        },
        recommendations: [
          criticalStock > 0 ? `${criticalStock} kritik stok seviyesinde malzeme var. Acil sipariş verilmesi önerilir.` : null,
          warningStock > 0 ? `${warningStock} malzeme uyarı seviyesinde. Stok takibi yapılmalı.` : null,
          avgDailyOutput > avgDailyEntry ? 'Çıkış oranı giriş oranından yüksek. Stok seviyeleri düşebilir.' : 'Giriş ve çıkış dengesi normal görünüyor.',
          predictedOrders > 50 ? 'Yüksek sipariş hacmi bekleniyor. Stok hazırlığı yapılmalı.' : 'Sipariş hacmi normal seviyede.'
        ].filter(Boolean)
      };

      setPredictions(predictionsData);
    } catch (error: any) {
      console.error('Tahmin hatası:', error);
      const currentUser = getCurrentUser();
      await addErrorLog(
        `Tahmin hatası: ${error.message || error}`,
        'Predictions',
        currentUser?.id,
        currentUser?.username
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ 
        maxWidth: '900px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '2px solid #000'
        }}>
          <button
            onClick={() => navigate('/ai-assistant')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: '2px solid #000',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            <ArrowLeft size={20} color="#000" />
          </button>
          
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Zap size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              color: '#000',
              letterSpacing: '-1px'
            }}>
              Tahminler
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#666',
              margin: 0
            }}>
              Gelecek trendleri ve tahminleri görün
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            <Zap size={48} style={{ animation: 'pulse 1s ease-in-out infinite' }} />
            <p style={{ marginTop: '16px', fontSize: '14px' }}>Tahminler hesaplanıyor...</p>
          </div>
        ) : predictions ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Period */}
            <div style={{
              background: 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000',
              textAlign: 'center'
            }}>
              <Calendar size={24} color="#fff" style={{ marginBottom: '8px' }} />
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                margin: 0,
                color: '#fff'
              }}>
                {predictions.period}
              </h2>
            </div>

            {/* Current Status */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
                marginBottom: '16px',
                color: '#000'
              }}>
                Mevcut Durum
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Toplam Stok
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#000' }}>
                    {predictions.current.totalStock}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Kritik Durum
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#dc3545' }}>
                    {predictions.current.criticalStock}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Uyarı Durumu
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#ffc107' }}>
                    {predictions.current.warningStock}
                  </p>
                </div>
              </div>
            </div>

            {/* Trends */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
                marginBottom: '16px',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <TrendingUp size={20} color="#4a90e2" />
                Ortalama Günlük Trendler (Son 90 Gün)
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Günlük Giriş
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#000' }}>
                    {predictions.trends.avgDailyEntry}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Günlük Çıkış
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#000' }}>
                    {predictions.trends.avgDailyOutput}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Günlük Sipariş
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#000' }}>
                    {predictions.trends.avgDailyOrder}
                  </p>
                </div>
              </div>
            </div>

            {/* Predictions */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
                marginBottom: '16px',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <BarChart3 size={20} color="#6f42c1" />
                Tahminler
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div style={{
                  padding: '16px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Beklenen Giriş
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#28a745' }}>
                    {predictions.predictions.entries}
                  </p>
                </div>
                <div style={{
                  padding: '16px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Beklenen Çıkış
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#dc3545' }}>
                    {predictions.predictions.outputs}
                  </p>
                </div>
                <div style={{
                  padding: '16px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Beklenen Sipariş
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#4a90e2' }}>
                    {predictions.predictions.orders}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {predictions.recommendations && predictions.recommendations.length > 0 && (
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '2px solid #ffc107'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: '16px',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={20} color="#ffc107" />
                  Öneriler
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '2'
                }}>
                  {predictions.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#000' }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666',
            background: 'white',
            borderRadius: '12px',
            border: '2px solid #000'
          }}>
            <p style={{ fontSize: '14px', margin: 0 }}>
              Tahminler yüklenemedi.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Layout>
  );
}


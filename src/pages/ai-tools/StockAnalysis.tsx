import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { getCurrentCompany } from '../../utils/getCurrentCompany';
import { getCurrentUser } from '../../utils/getCurrentUser';
import { getAllStockStatus, getStockEntries, getStockOutputs } from '../../services/stockService';
import { generateAIStatusReport, AIStatusReport } from '../../services/aiService';
import { addErrorLog } from '../../services/userService';
import { BarChart3, ArrowLeft, RefreshCw, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StockAnalysis() {
  const navigate = useNavigate();
  const company = getCurrentCompany();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIStatusReport | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadReport = async () => {
    try {
      setLoading(true);
      const companyId = company?.companyId;
      if (!companyId) {
        throw new Error('Şirket bilgisi bulunamadı');
      }

      const [statuses, entries, outputs] = await Promise.all([
        getAllStockStatus(companyId),
        getStockEntries({ companyId }),
        getStockOutputs({ companyId })
      ]);

      const analysis = await generateAIStatusReport(statuses, entries, outputs);
      setReport(analysis);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Stok analizi hatası:', error);
      const currentUser = getCurrentUser();
      await addErrorLog(
        `Stok analizi hatası: ${error.message || error}`,
        'StockAnalysis',
        currentUser?.id,
        currentUser?.username
      );
      alert('Stok analizi yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

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
            background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <BarChart3 size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              color: '#000',
              letterSpacing: '-1px'
            }}>
              Stok Analizi
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#666',
              margin: 0
            }}>
              Stok durumunuzu detaylı analiz edin
            </p>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '2px solid #000',
              background: loading ? '#ccc' : '#000',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            <RefreshCw size={16} />
            {loading ? 'Analiz ediliyor...' : 'Yenile'}
          </button>
        </div>

        {lastUpdate && (
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            background: '#f5f5f5',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            fontSize: '12px',
            color: '#666'
          }}>
            Son güncelleme: {lastUpdate.toLocaleString('tr-TR')}
          </div>
        )}

        {/* Report Content */}
        {loading && !report ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '16px', fontSize: '14px' }}>Stok analizi yapılıyor...</p>
          </div>
        ) : report ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Summary */}
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
                <CheckCircle size={20} color="#28a745" />
                Genel Özet
              </h3>
              <p style={{
                fontSize: '14px',
                lineHeight: '1.8',
                color: '#000',
                margin: 0
              }}>
                {report.summary}
              </p>
            </div>

            {/* Critical Issues */}
            {report.criticalIssues && report.criticalIssues.length > 0 && (
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '2px solid #dc3545'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: '16px',
                  color: '#dc3545',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={20} color="#dc3545" />
                  Kritik Sorunlar
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '2'
                }}>
                  {report.criticalIssues.map((issue, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#000' }}>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
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
                  <TrendingUp size={20} color="#28a745" />
                  Öneriler
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '2'
                }}>
                  {report.recommendations.map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#000' }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trends */}
            {report.trends && report.trends.length > 0 && (
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
                  Trendler
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '2'
                }}>
                  {report.trends.map((trend, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#000' }}>
                      {trend}
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
            color: '#666'
          }}>
            <p style={{ fontSize: '14px' }}>Rapor yüklenemedi. Lütfen tekrar deneyin.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}


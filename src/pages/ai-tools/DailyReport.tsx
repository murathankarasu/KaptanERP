import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { getCurrentCompany } from '../../utils/getCurrentCompany';
import { getCurrentUser } from '../../utils/getCurrentUser';
import { getAllStockStatus, getStockEntries, getStockOutputs } from '../../services/stockService';
import { generateDailyAIReport, AIDailyReport } from '../../services/aiService';
import { getCachedDailyReport, getRecentCachedReports } from '../../services/aiReportCacheService';
import { addErrorLog } from '../../services/userService';
import { ListChecks, ArrowLeft, Calendar, RefreshCw, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DailyReport() {
  const navigate = useNavigate();
  const company = getCurrentCompany();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIDailyReport | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableDates();
    loadReportForDate(selectedDate);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadReportForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadAvailableDates = async () => {
    try {
      const companyId = company?.companyId;
      const recentReports = await getRecentCachedReports(30, companyId);
      const dates = recentReports.map(r => {
        if (r.date.includes('.')) {
          const [day, month, year] = r.date.split('.');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return r.date;
      });
      const today = new Date().toISOString().split('T')[0];
      if (!dates.includes(today)) {
        dates.unshift(today);
      }
      setAvailableDates([...new Set(dates)].sort().reverse());
    } catch (error) {
      console.error('Mevcut tarihler yüklenirken hata:', error);
    }
  };

  const loadReportForDate = async (dateStr: string) => {
    try {
      setLoading(true);
      const companyId = company?.companyId;
      const targetDate = new Date(dateStr);
      
      // Önce cache'den kontrol et
      const cached = await getCachedDailyReport(targetDate, companyId);
      if (cached) {
        setReport(cached);
        setLoading(false);
        return;
      }

      // Cache'de yoksa yeni rapor oluştur
      const [statuses, entries, outputs] = await Promise.all([
        getAllStockStatus(companyId),
        getStockEntries(companyId ? { companyId } : undefined),
        getStockOutputs(companyId ? { companyId } : undefined)
      ]);

      const dailyReport = await generateDailyAIReport(statuses, entries, outputs, companyId, targetDate);
      setReport(dailyReport);
      await loadAvailableDates();
    } catch (error: any) {
      console.error('Günlük rapor hatası:', error);
      const currentUser = getCurrentUser();
      await addErrorLog(
        `Günlük rapor hatası: ${error.message || error}`,
        'DailyReport',
        currentUser?.id,
        currentUser?.username
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setLoading(true);
      const companyId = company?.companyId;
      const targetDate = new Date(selectedDate);
      
      const [statuses, entries, outputs] = await Promise.all([
        getAllStockStatus(companyId),
        getStockEntries(companyId ? { companyId } : undefined),
        getStockOutputs(companyId ? { companyId } : undefined)
      ]);

      const dailyReport = await generateDailyAIReport(statuses, entries, outputs, companyId, targetDate, true);
      setReport(dailyReport);
      await loadAvailableDates();
    } catch (error: any) {
      console.error('Rapor yenileme hatası:', error);
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
          borderBottom: '2px solid #000',
          flexWrap: 'wrap'
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
            background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <ListChecks size={24} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              color: '#000',
              letterSpacing: '-1px'
            }}>
              Günlük Rapor
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#666',
              margin: 0
            }}>
              Günlük özet raporlarınızı görüntüleyin
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="#000" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #000',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: 'white'
                }}
              />
            </div>
            <button
              onClick={handleRegenerate}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '2px solid #000',
                background: loading ? '#ccc' : '#000',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <RefreshCw size={16} />
              Yenile
            </button>
          </div>
        </div>

        {/* Report Content */}
        {loading && !report ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '16px', fontSize: '14px' }}>Rapor yükleniyor...</p>
          </div>
        ) : report ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Date Header */}
            <div style={{
              background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid #000',
              textAlign: 'center'
            }}>
              <Calendar size={24} color="#000" style={{ marginBottom: '8px' }} />
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                margin: 0,
                color: '#000'
              }}>
                {report.date}
              </h2>
            </div>

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
                <Sparkles size={20} color="#ffc107" />
                Günün Özeti
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

            {/* Highlights */}
            {report.highlights && report.highlights.length > 0 && (
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
                  Öne Çıkanlar
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '2'
                }}>
                  {report.highlights.map((highlight, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#000' }}>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {report.warnings && report.warnings.length > 0 && (
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
                  Uyarılar
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '2'
                }}>
                  {report.warnings.map((warning, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#000' }}>
                      {warning}
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
                  <TrendingUp size={20} color="#4a90e2" />
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
          </div>
        ) : (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            <p style={{ fontSize: '14px' }}>
              Seçilen tarih için rapor bulunamadı. "Yenile" butonuna tıklayarak yeni rapor oluşturabilirsiniz.
            </p>
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


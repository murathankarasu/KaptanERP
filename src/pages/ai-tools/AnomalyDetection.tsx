import { useState } from 'react';
import Layout from '../../components/Layout';
import { getCurrentCompany } from '../../utils/getCurrentCompany';
import { getCurrentUser } from '../../utils/getCurrentUser';
import { getActivityLogs } from '../../services/activityLogService';
import { getAIAnomalyAlerts, AIAnomalyAlert } from '../../services/aiAnomalyService';
import { analyzeActivityAnomalies, AIAnomalyFinding } from '../../services/aiService';
import { addErrorLog } from '../../services/userService';
import { AlertTriangle, ArrowLeft, RefreshCw, Shield, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AnomalyDetection() {
  const navigate = useNavigate();
  const company = getCurrentCompany();
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<AIAnomalyAlert[]>([]);
  const [findings, setFindings] = useState<AIAnomalyFinding[]>([]);

  const loadAnomalies = async () => {
    try {
      setLoading(true);
      const companyId = company?.companyId;
      if (!companyId) {
        throw new Error('Şirket bilgisi bulunamadı');
      }

      // Mevcut uyarıları yükle
      const existingAlerts = await getAIAnomalyAlerts({ companyId, status: 'open', limit: 50 });
      setAlerts(existingAlerts);

      // Son 7 günün aktivite loglarını al
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const logs = await getActivityLogs({ companyId });
      const recentLogs = logs
        .filter(log => {
          const logDate = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
          return logDate >= startDate && logDate <= endDate;
        })
        .map(log => ({
          timestamp: log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp),
          user: log.username || log.userEmail || 'unknown',
          action: log.action,
          module: log.module,
          details: log.details
        }));

      // AI ile anomali analizi yap
      if (recentLogs.length > 0) {
        const analysis = await analyzeActivityAnomalies(recentLogs);
        setFindings(analysis);
      }
    } catch (error: any) {
      console.error('Anomali tespiti hatası:', error);
      const currentUser = getCurrentUser();
      await addErrorLog(
        `Anomali tespiti hatası: ${error.message || error}`,
        'AnomalyDetection',
        currentUser?.id,
        currentUser?.username
      );
      alert('Anomali tespiti yapılırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#17a2b8';
      default:
        return '#666';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Yüksek';
      case 'medium':
        return 'Orta';
      case 'low':
        return 'Düşük';
      default:
        return severity;
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
            background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              color: '#000',
              letterSpacing: '-1px'
            }}>
              Anomali Tespiti
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#666',
              margin: 0
            }}>
              Sistemdeki anormal durumları tespit edin
            </p>
          </div>
          <button
            onClick={loadAnomalies}
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
            {loading ? 'Taranıyor...' : 'Tara'}
          </button>
        </div>

        {/* Content */}
        {loading && alerts.length === 0 && findings.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '16px', fontSize: '14px' }}>Anomali taraması yapılıyor...</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Existing Alerts */}
            {alerts.length > 0 && (
              <div>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: '16px',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Shield size={20} color="#dc3545" />
                  Mevcut Uyarılar ({alerts.length})
                </h2>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      background: 'white',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '2px solid #000',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        margin: 0,
                        color: '#000'
                      }}>
                        {alert.title}
                      </h3>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: getSeverityColor(alert.severity),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {getSeverityLabel(alert.severity)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#000',
                      margin: 0,
                      marginBottom: '12px'
                    }}>
                      {alert.summary}
                    </p>
                    {alert.evidence && alert.evidence.length > 0 && (
                      <div style={{
                        padding: '12px',
                        background: '#f5f5f5',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        <strong>Kanıtlar:</strong> {alert.evidence.join(', ')}
                      </div>
                    )}
                    {alert.createdAt && (
                      <div style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Clock size={12} />
                        {new Date(alert.createdAt).toLocaleString('tr-TR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New Findings */}
            {findings.length > 0 && (
              <div>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: '16px',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={20} color="#ffc107" />
                  Yeni Tespitler ({findings.length})
                </h2>
                {findings.map((finding, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'white',
                      padding: '20px',
                      borderRadius: '12px',
                      border: `2px solid ${getSeverityColor(finding.severity)}`,
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        margin: 0,
                        color: '#000'
                      }}>
                        {finding.title}
                      </h3>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: getSeverityColor(finding.severity),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {getSeverityLabel(finding.severity)}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#000',
                      margin: 0,
                      marginBottom: '12px'
                    }}>
                      {finding.summary}
                    </p>
                    {finding.evidence && finding.evidence.length > 0 && (
                      <div style={{
                        padding: '12px',
                        background: '#f5f5f5',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '8px'
                      }}>
                        <strong>Kanıtlar:</strong> {finding.evidence.join(', ')}
                      </div>
                    )}
                    {finding.relatedUsers && finding.relatedUsers.length > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#666',
                        marginTop: '8px'
                      }}>
                        <User size={12} />
                        <strong>İlgili Kullanıcılar:</strong> {finding.relatedUsers.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {alerts.length === 0 && findings.length === 0 && !loading && (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#666',
                background: 'white',
                borderRadius: '12px',
                border: '2px solid #000'
              }}>
                <Shield size={48} color="#28a745" style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px', margin: 0 }}>
                  Henüz anomali tespit edilmedi. "Tara" butonuna tıklayarak analiz başlatın.
                </p>
              </div>
            )}
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


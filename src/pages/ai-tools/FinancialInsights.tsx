import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { getCurrentCompany } from '../../utils/getCurrentCompany';
import { getCurrentUser } from '../../utils/getCurrentUser';
import { getJournalEntries } from '../../services/financeService';
import { getCustomerTransactions } from '../../services/financeService';
import { addErrorLog } from '../../services/userService';
import { TrendingUp, ArrowLeft, DollarSign, BarChart3, PieChart, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FinancialInsights() {
  const navigate = useNavigate();
  const company = getCurrentCompany();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const companyId = company?.companyId;
      if (!companyId) {
        throw new Error('Şirket bilgisi bulunamadı');
      }

      // Son 30 günün finansal verilerini al
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [journalEntries, customerTransactions] = await Promise.all([
        getJournalEntries(companyId),
        getCustomerTransactions(companyId)
      ]);

      // Filtrele
      const recentJournals = journalEntries.filter(entry => {
        const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });

      const recentTransactions = customerTransactions.filter(tx => {
        const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
        return txDate >= startDate && txDate <= endDate;
      });

      // Hesaplamalar
      const totalDebit = recentJournals.reduce((sum, entry) => {
        return sum + entry.lines.filter(l => l.side === 'debit').reduce((s, l) => s + l.amount, 0);
      }, 0);

      const totalCredit = recentJournals.reduce((sum, entry) => {
        return sum + entry.lines.filter(l => l.side === 'credit').reduce((s, l) => s + l.amount, 0);
      }, 0);

      const totalCharges = recentTransactions
        .filter(tx => tx.type === 'charge')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalPayments = recentTransactions
        .filter(tx => tx.type === 'payment')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      const insightsData = {
        period: 'Son 30 Gün',
        journalEntries: recentJournals.length,
        customerTransactions: recentTransactions.length,
        totalDebit,
        totalCredit,
        totalCharges,
        totalPayments,
        netRevenue: totalCharges - totalPayments,
        balance: totalDebit - totalCredit
      };

      setInsights(insightsData);
    } catch (error: any) {
      console.error('Finansal görünüm hatası:', error);
      const currentUser = getCurrentUser();
      await addErrorLog(
        `Finansal görünüm hatası: ${error.message || error}`,
        'FinancialInsights',
        currentUser?.id,
        currentUser?.username
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
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
            background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <TrendingUp size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              color: '#000',
              letterSpacing: '-1px'
            }}>
              Finansal Görünüm
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#666',
              margin: 0
            }}>
              Finansal verilerinizi analiz edin
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
            <TrendingUp size={48} style={{ animation: 'pulse 1s ease-in-out infinite' }} />
            <p style={{ marginTop: '16px', fontSize: '14px' }}>Finansal veriler analiz ediliyor...</p>
          </div>
        ) : insights ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {/* Period */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000',
              gridColumn: '1 / -1'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <Calendar size={20} color="#17a2b8" />
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  margin: 0,
                  color: '#000'
                }}>
                  Analiz Dönemi
                </h3>
              </div>
              <p style={{
                fontSize: '18px',
                fontWeight: 600,
                margin: 0,
                color: '#000'
              }}>
                {insights.period}
              </p>
            </div>

            {/* Total Debit */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <DollarSign size={20} color="#28a745" />
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  color: '#666',
                  textTransform: 'uppercase'
                }}>
                  Toplam Borç
                </h3>
              </div>
              <p style={{
                fontSize: '24px',
                fontWeight: 700,
                margin: 0,
                color: '#000'
              }}>
                {formatCurrency(insights.totalDebit)}
              </p>
            </div>

            {/* Total Credit */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <DollarSign size={20} color="#dc3545" />
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  color: '#666',
                  textTransform: 'uppercase'
                }}>
                  Toplam Alacak
                </h3>
              </div>
              <p style={{
                fontSize: '24px',
                fontWeight: 700,
                margin: 0,
                color: '#000'
              }}>
                {formatCurrency(insights.totalCredit)}
              </p>
            </div>

            {/* Balance */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <BarChart3 size={20} color="#4a90e2" />
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  color: '#666',
                  textTransform: 'uppercase'
                }}>
                  Bakiye
                </h3>
              </div>
              <p style={{
                fontSize: '24px',
                fontWeight: 700,
                margin: 0,
                color: insights.balance >= 0 ? '#28a745' : '#dc3545'
              }}>
                {formatCurrency(insights.balance)}
              </p>
            </div>

            {/* Total Charges */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <TrendingUp size={20} color="#28a745" />
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  color: '#666',
                  textTransform: 'uppercase'
                }}>
                  Toplam Tahsilat
                </h3>
              </div>
              <p style={{
                fontSize: '24px',
                fontWeight: 700,
                margin: 0,
                color: '#000'
              }}>
                {formatCurrency(insights.totalCharges)}
              </p>
            </div>

            {/* Total Payments */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <TrendingUp size={20} color="#dc3545" style={{ transform: 'rotate(180deg)' }} />
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  color: '#666',
                  textTransform: 'uppercase'
                }}>
                  Toplam Ödeme
                </h3>
              </div>
              <p style={{
                fontSize: '24px',
                fontWeight: 700,
                margin: 0,
                color: '#000'
              }}>
                {formatCurrency(insights.totalPayments)}
              </p>
            </div>

            {/* Net Revenue */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000',
              gridColumn: '1 / -1'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <PieChart size={20} color="#17a2b8" />
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  margin: 0,
                  color: '#000'
                }}>
                  Net Gelir
                </h3>
              </div>
              <p style={{
                fontSize: '32px',
                fontWeight: 700,
                margin: 0,
                color: insights.netRevenue >= 0 ? '#28a745' : '#dc3545'
              }}>
                {formatCurrency(insights.netRevenue)}
              </p>
            </div>

            {/* Statistics */}
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '2px solid #000',
              gridColumn: '1 / -1'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 700,
                margin: 0,
                marginBottom: '16px',
                color: '#000'
              }}>
                İşlem İstatistikleri
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Yevmiye Kayıtları
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#000' }}>
                    {insights.journalEntries}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#666', margin: 0, marginBottom: '4px' }}>
                    Müşteri İşlemleri
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#000' }}>
                    {insights.customerTransactions}
                  </p>
                </div>
              </div>
            </div>
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
              Finansal veriler yüklenemedi.
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


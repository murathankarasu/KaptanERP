import { useState } from 'react';
import Layout from '../components/Layout';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCurrentUser } from '../utils/getCurrentUser';
import { getAllStockStatus, getStockEntries, getStockOutputs } from '../services/stockService';
import { getOrders } from '../services/orderService';
import { getCustomers } from '../services/customerService';
import { getPersonnel } from '../services/personnelService';
import { generateAIStatusReport, generateDailyAIReport, askERPAI, AIStatusReport, AIDailyReport, AINaturalAnswer } from '../services/aiService';
import { addErrorLog } from '../services/userService';
import { Brain, MessageCircle, BarChart3, ListChecks } from 'lucide-react';

type Mode = 'qa' | 'stock' | 'daily';

const AIAssistantPage = () => {
  const company = getCurrentCompany();

  const [mode, setMode] = useState<Mode>('qa');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [qaAnswer, setQaAnswer] = useState<AINaturalAnswer | null>(null);
  const [stockReport, setStockReport] = useState<AIStatusReport | null>(null);
  const [dailyReport, setDailyReport] = useState<AIDailyReport | null>(null);

  const handleRun = async () => {
    try {
      setLoading(true);
      setQaAnswer(null);
      setStockReport(null);
      setDailyReport(null);

      const companyId = company?.companyId;
      if (!companyId) {
        alert('Şirket bilgisi bulunamadı. Lütfen yeniden giriş yapın.');
        return;
      }

      if (mode === 'stock' || mode === 'daily') {
        const [status, entries, outputs] = await Promise.all([
          getAllStockStatus(companyId),
          getStockEntries({ companyId }),
          getStockOutputs({ companyId })
        ]);

        if (mode === 'stock') {
          const report = await generateAIStatusReport(status, entries, outputs);
          setStockReport(report);
        } else {
          const report = await generateDailyAIReport(status, entries, outputs);
          setDailyReport(report);
        }
        return;
      }

      // Genel soru-cevap modu
      const [customers, orders, personnel, stock] = await Promise.all([
        getCustomers(companyId),
        getOrders({ companyId }),
        getPersonnel({ companyId }),
        getAllStockStatus(companyId)
      ]);

      const context = {
        companyId,
        customers: customers.slice(0, 100),
        orders: orders.slice(0, 100),
        personnel: personnel.slice(0, 100),
        stock: stock.slice(0, 100)
      };

      const answer = await askERPAI(question, context);
      setQaAnswer(answer);
    } catch (error: any) {
      console.error('AI asistan hatası:', error);
      const currentUser = getCurrentUser();
      await addErrorLog(
        `AI asistan hatası: ${error.message || error}`,
        'AIAssistant',
        currentUser?.id,
        currentUser?.username
      );
      alert('AI işlemi sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const renderOutput = () => {
    if (mode === 'stock' && stockReport) {
      return (
        <div style={{ marginTop: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Stok Özeti</h3>
          <p style={{ fontSize: '13px' }}>{stockReport.summary}</p>
          {stockReport.criticalIssues.length > 0 && (
            <>
              <h4 style={{ fontSize: '14px', marginTop: '10px' }}>Kritik Konular</h4>
              <ul>
                {stockReport.criticalIssues.map((c, i) => (
                  <li key={i} style={{ fontSize: '13px' }}>{c}</li>
                ))}
              </ul>
            </>
          )}
          {stockReport.recommendations.length > 0 && (
            <>
              <h4 style={{ fontSize: '14px', marginTop: '10px' }}>Öneriler</h4>
              <ul>
                {stockReport.recommendations.map((c, i) => (
                  <li key={i} style={{ fontSize: '13px' }}>{c}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      );
    }

    if (mode === 'daily' && dailyReport) {
      return (
        <div style={{ marginTop: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Günlük Özet - {dailyReport.date}</h3>
          <p style={{ fontSize: '13px' }}>{dailyReport.summary}</p>
          {dailyReport.highlights.length > 0 && (
            <>
              <h4 style={{ fontSize: '14px', marginTop: '10px' }}>Öne Çıkanlar</h4>
              <ul>
                {dailyReport.highlights.map((c, i) => (
                  <li key={i} style={{ fontSize: '13px' }}>{c}</li>
                ))}
              </ul>
            </>
          )}
          {dailyReport.warnings.length > 0 && (
            <>
              <h4 style={{ fontSize: '14px', marginTop: '10px' }}>Uyarılar</h4>
              <ul>
                {dailyReport.warnings.map((c, i) => (
                  <li key={i} style={{ fontSize: '13px' }}>{c}</li>
                ))}
              </ul>
            </>
          )}
          {dailyReport.recommendations.length > 0 && (
            <>
              <h4 style={{ fontSize: '14px', marginTop: '10px' }}>Öneriler</h4>
              <ul>
                {dailyReport.recommendations.map((c, i) => (
                  <li key={i} style={{ fontSize: '13px' }}>{c}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      );
    }

    if (mode === 'qa' && qaAnswer) {
      return (
        <div style={{ marginTop: '16px', whiteSpace: 'pre-wrap', fontSize: '13px' }}>
          {qaAnswer.answer}
        </div>
      );
    }

    return null;
  };

  const ModeIcon = mode === 'stock' ? BarChart3 : mode === 'daily' ? ListChecks : MessageCircle;

  return (
    <Layout>
      <div style={{ padding: '30px', maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Brain size={26} />
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0 }}>Yapay Zeka Asistanı</h1>
            <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>
              Stok analizi, günlük özet ve serbest sorular için GPT tabanlı asistan.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setMode('qa')}
            style={{ background: mode === 'qa' ? '#000' : '#f5f5f5', color: mode === 'qa' ? '#fff' : '#000' }}
          >
            <MessageCircle size={14} /> Serbest Soru
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setMode('stock')}
            style={{ background: mode === 'stock' ? '#000' : '#f5f5f5', color: mode === 'stock' ? '#fff' : '#000' }}
          >
            <BarChart3 size={14} /> Stok Analizi
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setMode('daily')}
            style={{ background: mode === 'daily' ? '#000' : '#f5f5f5', color: mode === 'daily' ? '#fff' : '#000' }}
          >
            <ListChecks size={14} /> Günlük Özet
          </button>
        </div>

        {mode === 'qa' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Sorunuz
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Örn: Bu ay en çok hangi müşteriye satış yaptık? veya Hangi ürünler kritik stokta?"
              style={{ width: '100%', minHeight: '80px', padding: '8px', fontSize: '13px', border: '1px solid #ccc' }}
            />
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleRun}
          disabled={loading || (mode === 'qa' && !question.trim())}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ModeIcon size={16} />
          {loading ? 'Analiz yapılıyor...' : 'Çalıştır'}
        </button>

        {renderOutput()}

        <div style={{ marginTop: '20px', fontSize: '11px', color: '#888' }}>
          Not: En uygun maliyet için `gpt-4o-mini` modeli kullanılmaktadır. Veriler sadece tarayıcınızdan OpenAI API&apos;sine özet olarak gönderilir.
        </div>
      </div>
    </Layout>
  );
};

export default AIAssistantPage;



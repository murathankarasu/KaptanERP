import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Brain, MessageCircle, BarChart3, ListChecks, TrendingUp, AlertTriangle, Zap } from 'lucide-react';

type ToolId = 'chat' | 'stock-analysis' | 'daily-report' | 'anomaly-detection' | 'financial-insights' | 'predictions';

interface AITool {
  id: ToolId;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const aiTools: AITool[] = [
  {
    id: 'chat',
    title: 'AI Sohbet',
    description: 'Doğal dilde sorular sorun, anında yanıt alın',
    icon: <MessageCircle size={32} />,
    color: '#4a90e2',
    gradient: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)'
  },
  {
    id: 'stock-analysis',
    title: 'Stok Analizi',
    description: 'Stok durumunuzu detaylı analiz edin',
    icon: <BarChart3 size={32} />,
    color: '#28a745',
    gradient: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)'
  },
  {
    id: 'daily-report',
    title: 'Günlük Rapor',
    description: 'Günlük özet raporlarınızı görüntüleyin',
    icon: <ListChecks size={32} />,
    color: '#ffc107',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)'
  },
  {
    id: 'anomaly-detection',
    title: 'Anomali Tespiti',
    description: 'Sistemdeki anormal durumları tespit edin',
    icon: <AlertTriangle size={32} />,
    color: '#dc3545',
    gradient: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
  },
  {
    id: 'financial-insights',
    title: 'Finansal Görünüm',
    description: 'Finansal verilerinizi analiz edin',
    icon: <TrendingUp size={32} />,
    color: '#17a2b8',
    gradient: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'
  },
  {
    id: 'predictions',
    title: 'Tahminler',
    description: 'Gelecek trendleri ve tahminleri görün',
    icon: <Zap size={32} />,
    color: '#6f42c1',
    gradient: 'linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%)'
  }
];

const AIAssistantPage = () => {
  const navigate = useNavigate();

  const handleToolClick = (toolId: ToolId) => {
    const routes: Record<ToolId, string> = {
      'chat': '/ai-tools/chat',
      'stock-analysis': '/ai-tools/stock-analysis',
      'daily-report': '/ai-tools/daily-report',
      'anomaly-detection': '/ai-tools/anomaly-detection',
      'financial-insights': '/ai-tools/financial-insights',
      'predictions': '/ai-tools/predictions'
    };
    navigate(routes[toolId] ?? '/ai-assistant');
  };

  // Ana menü görünümü
  return (
      <Layout>
        <div style={{ 
          padding: '20px', 
          maxWidth: '1200px', 
          margin: '0 auto',
          minHeight: 'calc(100vh - 100px)'
        }}>
          {/* Başlık */}
          <div style={{ 
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              marginBottom: '16px',
              boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)'
            }}>
              <Brain size={40} color="#fff" />
            </div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 700, 
              margin: 0,
              marginBottom: '8px',
              color: '#000',
              letterSpacing: '-1px'
            }}>
              Yapay Zeka Araçları
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: '#666', 
              margin: 0,
              maxWidth: '500px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              İş süreçlerinizi optimize etmek için güçlü AI araçları
            </p>
          </div>

          {/* Araç Kartları Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}>
            {aiTools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => handleToolClick(tool.id)}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '2px solid #000',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                {/* Gradient Background */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: tool.gradient
                }} />
                
                {/* Icon */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  background: tool.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  color: 'white',
                  boxShadow: `0 4px 12px ${tool.color}40`
                }}>
                  {tool.icon}
                </div>

                {/* Content */}
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: '8px',
                  color: '#000',
                  letterSpacing: '-0.5px'
                }}>
                  {tool.title}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: '#666',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  {tool.description}
                </p>

                {/* Arrow Indicator */}
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e0e0e0'
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
};

export default AIAssistantPage;

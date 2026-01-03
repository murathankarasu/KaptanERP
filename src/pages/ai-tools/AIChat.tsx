import { useState, useRef, useEffect } from 'react';
import Layout from '../../components/Layout';
import { getCurrentCompany } from '../../utils/getCurrentCompany';
import { getCurrentUser } from '../../utils/getCurrentUser';
import { getCustomers } from '../../services/customerService';
import { getOrders } from '../../services/orderService';
import { getPersonnel } from '../../services/personnelService';
import { getAllStockStatus } from '../../services/stockService';
import { askYonetimAI } from '../../services/aiService';
import { addErrorLog } from '../../services/userService';
import { MessageCircle, Send, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat() {
  const navigate = useNavigate();
  const company = getCurrentCompany();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const companyId = company?.companyId;
      if (!companyId) {
        throw new Error('Şirket bilgisi bulunamadı');
      }

      // Verileri topla
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

      const answer = await askYonetimAI(question, context);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: answer.answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI sohbet hatası:', error);
      const currentUser = getCurrentUser();
      await addErrorLog(
        `AI sohbet hatası: ${error.message || error}`,
        'AIChat',
        currentUser?.id,
        currentUser?.username
      );

      const errorMessage: Message = {
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 100px)',
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
            background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <MessageCircle size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              color: '#000',
              letterSpacing: '-1px'
            }}>
              AI Sohbet
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#666',
              margin: 0
            }}>
              Doğal dilde sorular sorun, anında yanıt alın
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          background: '#f9f9f9',
          borderRadius: '12px',
          border: '2px solid #000',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#666'
            }}>
              <Sparkles size={48} color="#4a90e2" style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', margin: 0 }}>
                Merhaba! Size nasıl yardımcı olabilirim?<br />
                Örn: "Bu ay en çok hangi müşteriye satış yaptık?" veya "Hangi ürünler kritik stokta?"
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '8px'
              }}
            >
              <div style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)'
                  : 'white',
                color: msg.role === 'user' ? 'white' : '#000',
                border: msg.role === 'assistant' ? '2px solid #000' : 'none',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start'
            }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'white',
                border: '2px solid #000',
                fontSize: '14px',
                color: '#666'
              }}>
                Düşünüyorum...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Sorunuzu yazın..."
            style={{
              flex: 1,
              minHeight: '60px',
              maxHeight: '120px',
              padding: '12px 16px',
              border: '2px solid #000',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              background: 'white'
            }}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              border: '2px solid #000',
              background: loading || !input.trim() ? '#ccc' : 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading && input.trim()) {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </Layout>
  );
}


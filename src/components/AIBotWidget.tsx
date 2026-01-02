import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { askAIBot, AIBotContext, AIBotMessage } from '../services/aiService';
import { getCurrentUser } from '../utils/getCurrentUser';

type AIBotWidgetProps = {
  context: AIBotContext;
};

const AIBotWidget = ({ context }: AIBotWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIBotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const currentUser = getCurrentUser();
  const userInitial = currentUser?.username?.charAt(0).toUpperCase() || currentUser?.fullName?.charAt(0).toUpperCase() || 'K';

  useEffect(() => {
    if (!open) return;
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages, loading]);

  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [context.route]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    const history = messages.slice(-6);
    const nextMessages: AIBotMessage[] = [...messages, { role: 'user' as const, content: question }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await askAIBot(question, context, history);
      setMessages([...nextMessages, { role: 'assistant' as const, content: reply.answer }]);
    } catch (error: any) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant' as const,
          content: 'Yanıt alınırken hata oluştu. Lütfen tekrar deneyin.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const title = context.title || 'Yapay Zeka Botu';

  // Basit markdown formatlama
  const formatMessage = (text: string) => {
    // Başlıklar (# ## ###)
    text = text.replace(/^### (.*$)/gim, '<h3 style="font-size: 14px; font-weight: 700; margin: 8px 0 4px 0; color: #000;">$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2 style="font-size: 15px; font-weight: 700; margin: 10px 0 6px 0; color: #000;">$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1 style="font-size: 16px; font-weight: 700; margin: 12px 0 8px 0; color: #000;">$1</h1>');
    
    // Kalın metin (**text**)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700;">$1</strong>');
    
    // İtalik metin (*text*)
    text = text.replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>');
    
    // Kod blokları (`code`)
    text = text.replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 11px; border: 1px solid #ddd;">$1</code>');
    
    // Liste öğeleri (- item veya 1. item)
    text = text.replace(/^[-*] (.+)$/gim, '<li style="margin: 4px 0; padding-left: 4px;">$1</li>');
    text = text.replace(/^\d+\. (.+)$/gim, '<li style="margin: 4px 0; padding-left: 4px;">$1</li>');
    
    // Liste sarmalama
    const lines = text.split('\n');
    let inList = false;
    let result: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isListItem = line.trim().startsWith('<li');
      
      if (isListItem && !inList) {
        result.push('<ul style="margin: 6px 0; padding-left: 20px; list-style-type: disc;">');
        inList = true;
      } else if (!isListItem && inList) {
        result.push('</ul>');
        inList = false;
      }
      
      result.push(line);
    }
    
    if (inList) {
      result.push('</ul>');
    }
    
    text = result.join('\n');
    
    // Paragraflar
    text = text.split('\n\n').map(para => {
      if (para.trim().startsWith('<') || para.trim() === '') return para;
      return `<p style="margin: 6px 0; line-height: 1.6;">${para.trim()}</p>`;
    }).join('\n');
    
    // Satır sonları
    text = text.replace(/\n/g, '<br />');
    
    return text;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '84px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '2px solid #000',
          background: '#fff',
          color: '#000',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          zIndex: 1000
        }}
        aria-label="Yapay zeka botunu aç"
      >
        <Bot size={22} />
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '84px',
            width: '340px',
            height: '420px',
            background: '#fff',
            border: '2px solid #000',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 1002,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderBottom: '1px solid #ddd'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>{title}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>

          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              background: '#fafafa'
            }}
          >
            {messages.length === 0 && (
              <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.4 }}>
                Bu sayfa için hızlı yardım isteyin. Örn: "Bu ekranda nasıl yeni kayıt açarım?"
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Bot size={14} color="#fff" />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '75%',
                    padding: msg.role === 'user' ? '10px 14px' : '12px 14px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    background: msg.role === 'user' 
                      ? 'linear-gradient(135deg, #000 0%, #333 100%)' 
                      : '#f8f9fa',
                    color: msg.role === 'user' ? '#fff' : '#000',
                    border: msg.role === 'user' ? 'none' : '1px solid #e0e0e0',
                    boxShadow: msg.role === 'user' 
                      ? '0 2px 4px rgba(0,0,0,0.1)' 
                      : '0 1px 2px rgba(0,0,0,0.05)',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: msg.role === 'assistant' ? formatMessage(msg.content) : msg.content.replace(/\n/g, '<br />')
                  }}
                />
                {msg.role === 'user' && (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    fontWeight: 600,
                    fontSize: '11px',
                    color: '#000'
                  }}>
                    {userInitial}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '12px', 
                color: '#666',
                padding: '8px 0'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bot size={14} color="#fff" />
                </div>
                <div style={{ 
                  padding: '10px 14px',
                  background: '#f8f9fa',
                  borderRadius: '18px 18px 18px 4px',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#666',
                    animation: 'pulse 1.4s ease-in-out infinite'
                  }} />
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#666',
                    animation: 'pulse 1.4s ease-in-out 0.2s infinite'
                  }} />
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#666',
                    animation: 'pulse 1.4s ease-in-out 0.4s infinite'
                  }} />
                </div>
              </div>
            )}
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.4; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.2); }
              }
            `}</style>
          </div>

          <div style={{ padding: '10px', borderTop: '1px solid #ddd' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={currentUser?.username ? `${currentUser.username}, sorunu yaz...` : 'Sorunu yaz...'}
                style={{
                  flex: 1,
                  fontSize: '12px',
                  padding: '8px',
                  border: '1px solid #ccc'
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  padding: '8px 10px',
                  border: '1px solid #000',
                  background: '#000',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px'
                }}
              >
                <Send size={14} />
                Gönder
              </button>
            </div>
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#888' }} />
          </div>
        </div>
      )}
    </>
  );
};

export default AIBotWidget;

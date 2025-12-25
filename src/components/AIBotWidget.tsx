import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { askAIBot, AIBotContext, AIBotMessage } from '../services/aiService';

type AIBotWidgetProps = {
  context: AIBotContext;
};

const AIBotWidget = ({ context }: AIBotWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIBotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

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
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    lineHeight: 1.4,
                    background: msg.role === 'user' ? '#000' : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#000',
                    border: msg.role === 'user' ? '1px solid #000' : '1px solid #ddd'
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ fontSize: '12px', color: '#666' }}>Yanıt hazırlanıyor...</div>
            )}
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
                placeholder="Sorunu yaz..."
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

import { addInvoice, InvoiceItem } from './invoiceService';

/**
 * Basit fatura görsel/PDF parse hizmeti.
 * Not: VITE_OPENAI_API_KEY istemci tarafında çağrılırsa görünür olabilir.
 * Üretimde backend proxy kullanın.
 */

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MODEL = 'gpt-4o-mini';

type ParsedInvoice = {
  invoiceNumber?: string;
  issueDate?: string;
  supplierName?: string;
  taxNumber?: string;
  iban?: string;
  currency?: string;
  total?: number;
  vatTotal?: number;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
  }>;
};

export const parseInvoiceWithAI = async (file: File): Promise<ParsedInvoice> => {
  if (!OPENAI_KEY) throw new Error('OPENAI key eksik');
  if (!file.type.startsWith('image/')) {
    throw new Error('Bu işlem için lütfen görsel (jpg/png) yükleyin. PDF desteklenmiyor.');
  }
  const base64 = await fileToBase64(file);
  const body = {
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Bir fatura görseli/PDF içeriğini oku ve JSON döndür: {invoiceNumber, issueDate, supplierName, taxNumber, iban, currency, total, vatTotal, items:[{name, quantity, unitPrice, vatRate}]} Tarih ISO (YYYY-MM-DD), sayı alanları numerik olsun.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Bu faturayı işle ve JSON ver.' },
          { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } }
        ]
      }
    ],
    max_tokens: 800
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI hata: ${t}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content) as ParsedInvoice;
    return parsed;
  } catch (e) {
    throw new Error('LLM çıktı parse edilemedi');
  }
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const saveParsedInvoice = async (parsed: ParsedInvoice, companyId?: string, customerId?: string) => {
  const items: InvoiceItem[] =
    parsed.items?.map((it) => ({
      materialName: it.name,
      quantity: it.quantity,
      unit: 'adet',
      unitPrice: it.unitPrice,
      vatRate: it.vatRate,
      discountPercent: 0
    })) || [];
  const totalAmount = parsed.total ?? items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const id = await addInvoice({
    invoiceNumber: parsed.invoiceNumber || `AI-${Date.now()}`,
    date: parsed.issueDate ? new Date(parsed.issueDate) : new Date(),
    customerId,
    customerName: parsed.supplierName,
    currency: parsed.currency || 'TRY',
    totalAmount,
    status: 'draft',
    items,
    companyId
  });
  return id;
};


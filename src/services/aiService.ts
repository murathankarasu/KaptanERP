import OpenAI from 'openai';

// OpenAI client - ucuz model kullanımı için gpt-4o-mini
// VITE_OPENAI_API_KEY veya VITE_GPT_API_KEY kullanılabilir
const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GPT_API_KEY;

const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Sadece development için, production'da backend kullanın
});

export interface AIFormatFixResult {
  success: boolean;
  fixedData?: any[];
  suggestions?: string[];
  error?: string;
}

export interface AIStatusReport {
  summary: string;
  criticalIssues: string[];
  recommendations: string[];
  trends: string[];
}

export interface AIDailyReport {
  date: string;
  summary: string;
  highlights: string[];
  warnings: string[];
  recommendations: string[];
}

export interface AINaturalAnswer {
  answer: string;
}

export interface AIBotContext {
  route: string;
  title?: string;
  helpItems?: string[];
}

export interface AIBotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIBotAnswer {
  answer: string;
}

export interface AIAnomalyFinding {
  title: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  evidence?: string[];
  relatedUsers?: string[];
  relatedModules?: string[];
}

export interface AIAnomalyRules {
  offHours?: { startHour: number; endHour: number };
  spikeMultiplier?: number;
  minEventsForSpike?: number;
}

export interface AIAmountEvent {
  module: string;
  date: Date;
  amount: number;
  currency?: string;
  ref?: string;
}

export interface AIAmountStats {
  module: string;
  count: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  min: number;
  max: number;
}

export interface AIAmountRules {
  lowMultiplier?: number;
  highMultiplier?: number;
  iqrMultiplier?: number;
}

const resolveDate = (value: any): Date | null => {
  if (!value) return null;
  const dateValue = value?.toDate?.() ?? new Date(value);
  if (isNaN(dateValue.getTime())) return null;
  return dateValue;
};

const parseAIJson = (raw: string): any | null => {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/{[\s\S]*}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
};

// Excel formatını AI ile düzeltme
export const fixExcelFormatWithAI = async (
  rawData: any[],
  expectedFormat: {
    requiredFields: string[];
    fieldTypes: { [key: string]: 'string' | 'number' | 'date' };
  }
): Promise<AIFormatFixResult> => {
  try {
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return {
        success: false,
        error: 'OpenAI API anahtarı bulunamadı. Lütfen .env dosyasına VITE_OPENAI_API_KEY veya VITE_GPT_API_KEY ekleyin.'
      };
    }

    const prompt = `Aşağıdaki Excel verilerini analiz et ve düzelt. Beklenen format:
Gerekli alanlar: ${expectedFormat.requiredFields.join(', ')}
Alan tipleri: ${JSON.stringify(expectedFormat.fieldTypes)}

Ham veri:
${JSON.stringify(rawData.slice(0, 5), null, 2)}

Lütfen:
1. Eksik alanları tespit et
2. Yanlış formatlı verileri düzelt
3. Tarih formatlarını standartlaştır (YYYY-MM-DD)
4. Sayısal değerleri temizle
5. Düzeltilmiş veriyi JSON formatında döndür

Sadece JSON döndür, açıklama yapma.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sen bir veri düzenleme uzmanısın. Excel verilerini analiz edip düzeltiyorsun.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content || '';
    const fixedData = parseAIJson(response);
    try {
      if (!fixedData) throw new Error('parse_failed');
      return {
        success: true,
        fixedData: Array.isArray(fixedData) ? fixedData : [fixedData],
        suggestions: ['Veriler AI tarafından düzeltildi']
      };
    } catch (parseError) {
      return {
        success: false,
        error: 'AI yanıtı parse edilemedi',
        suggestions: [response]
      };
    }
  } catch (error: any) {
    console.error('AI format düzeltme hatası:', error);
    return {
      success: false,
      error: error.message || 'AI servisi hatası'
    };
  }
};

// Genel Yönetim asistanı - doğal dilde soru-cevap
export const askYonetimAI = async (question: string, context: any): Promise<AINaturalAnswer> => {
  try {
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return {
        answer: 'AI yanıtı üretilemedi: API anahtarı bulunamadı.'
      };
    }

    const trimmed = question.trim();
    if (!trimmed) {
      return { answer: 'Lütfen bir soru yazın.' };
    }

    const prompt = `Aşağıda bir KOBİ için Yönetim sisteminden özet veriler var. Kullanıcı Türkçe bir soru soruyor.
Sen de bu verileri kullanarak kısa, net, maddelemeli bir cevap ver.

Veri Özeti (JSON):
${JSON.stringify(context).slice(0, 5000)}

Soru: "${trimmed}"

Cevabını sade Türkçe ile ver, teknik detay boğma.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sen KOBİ odaklı bir Yönetim asistanısın. Stok, sipariş, müşteri ve personel verilerini yorumlayıp kısa Türkçe cevaplar verirsin.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 800
    });

    const response = completion.choices[0]?.message?.content || '';
    return { answer: response.trim() };
  } catch (error: any) {
    console.error('AI doğal soru-cevap hatası:', error);
    return {
      answer: 'Cevap oluşturulurken bir hata oluştu: ' + (error.message || error)
    };
  }
};

// Sayfa içi yardım/akış asistanı
export const askAIBot = async (
  question: string,
  context: AIBotContext,
  history: AIBotMessage[] = []
): Promise<AIBotAnswer> => {
  try {
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return {
        answer: 'AI yanıtı üretilemedi: API anahtarı bulunamadı.'
      };
    }

    const trimmed = question.trim();
    if (!trimmed) {
      return { answer: 'Lütfen bir soru yazın.' };
    }

    const contextPayload = {
      route: context.route,
      page: context.title || context.route,
      help: context.helpItems || []
    };

    const systemContent = `Sen Kaptan Yönetim uygulamasında ekran yardım asistanısın.
Kullanıcıya kısa, net ve uygulanabilir adımlar ver.
Bağlam dışına çıkma; veri yoksa varsayım olduğunu belirt.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${systemContent}\n\nUygulama bağlamı (JSON):\n${JSON.stringify(contextPayload)}`
        },
        ...history.map((msg) => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: trimmed }
      ],
      temperature: 0.2,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content || '';
    return { answer: response.trim() };
  } catch (error: any) {
    console.error('AI bot hatası:', error);
    return {
      answer: 'Cevap oluşturulurken bir hata oluştu: ' + (error.message || error)
    };
  }
};

// Aktivite loglarında anomali tespiti
export const analyzeActivityAnomalies = async (
  logs: Array<{
    timestamp: Date;
    user?: string;
    action: string;
    module: string;
    details?: string;
  }>,
  rules: AIAnomalyRules = {}
): Promise<AIAnomalyFinding[]> => {
  try {
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return [];
    }

    const offHours = rules.offHours || { startHour: 0, endHour: 6 };
    const spikeMultiplier = rules.spikeMultiplier ?? 2.5;
    const minEventsForSpike = rules.minEventsForSpike ?? 8;

    const byUser: Record<string, number> = {};
    const byModule: Record<string, number> = {};
    const byHour: Record<string, number> = {};
    let offHoursCount = 0;

    for (const log of logs) {
      const user = log.user || 'unknown';
      const module = log.module || 'unknown';
      byUser[user] = (byUser[user] || 0) + 1;
      byModule[module] = (byModule[module] || 0) + 1;
      const hour = new Date(log.timestamp).getHours();
      const hourKey = String(hour).padStart(2, '0');
      byHour[hourKey] = (byHour[hourKey] || 0) + 1;
      if (hour >= offHours.startHour && hour < offHours.endHour) {
        offHoursCount += 1;
      }
    }

    const total = logs.length || 1;
    const averagePerUser = total / Math.max(Object.keys(byUser).length, 1);
    const spikeUsers = Object.entries(byUser)
      .filter(([, count]) => count >= minEventsForSpike && count >= averagePerUser * spikeMultiplier)
      .map(([user]) => user);

    const baseline = {
      total,
      uniqueUsers: Object.keys(byUser).length,
      uniqueModules: Object.keys(byModule).length,
      offHours: offHoursCount,
      offHoursRatio: Number((offHoursCount / total).toFixed(3)),
      spikeUsers
    };

    const payload = logs.slice(0, 200).map((log) => ({
      ts: log.timestamp?.toISOString?.() || String(log.timestamp),
      user: log.user || 'unknown',
      action: log.action,
      module: log.module,
      details: log.details ? String(log.details).slice(0, 300) : ''
    }));

    const prompt = `Aşağıdaki aktivite loglarını incele. Normal akıştan sapan anormallikleri tespit et.
Kurallar:
- Düz metin değil JSON döndür.
- Hiç anomali yoksa [] döndür.
- Her anomali için: title, severity(low|medium|high), summary, evidence[], relatedUsers[], relatedModules[] alanlarını doldur.
- Öncelik sıralaması: olağandışı saatler, kullanıcı bazlı işlem patlaması, kritik modül değişiklikleri.

Baz Özet (JSON):
${JSON.stringify(baseline, null, 2)}

Loglar (JSON):
${JSON.stringify(payload, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Sen Yönetim sistemlerinde güvenlik/operasyon analisti olarak anomali tespiti yaparsın. Kısa, net ve uygulanabilir uyarılar üretirsin.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 900
    });

    const response = completion.choices[0]?.message?.content || '';
    const parsed = parseAIJson(response);
    if (!parsed) return [];
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .filter((item) => item && item.title && item.summary)
      .map((item) => ({
        title: String(item.title),
        severity: item.severity === 'high' || item.severity === 'low' ? item.severity : 'medium',
        summary: String(item.summary),
        evidence: Array.isArray(item.evidence) ? item.evidence.map(String) : [],
        relatedUsers: Array.isArray(item.relatedUsers) ? item.relatedUsers.map(String) : [],
        relatedModules: Array.isArray(item.relatedModules) ? item.relatedModules.map(String) : []
      }));
  } catch (error) {
    console.error('AI anomali analizi hatası:', error);
    return [];
  }
};

// Tutar bazli anomaliler (son 15 gun)
export const analyzeMonetaryAnomalies = async (
  events: AIAmountEvent[],
  stats: AIAmountStats[],
  rules: AIAmountRules = {}
): Promise<AIAnomalyFinding[]> => {
  try {
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return [];
    }

    const rulePayload = {
      lowMultiplier: rules.lowMultiplier ?? 0.2,
      highMultiplier: rules.highMultiplier ?? 5,
      iqrMultiplier: rules.iqrMultiplier ?? 1.5
    };

    const eventPayload = events.slice(0, 200).map((ev) => ({
      module: ev.module,
      date: ev.date?.toISOString?.() || String(ev.date),
      amount: ev.amount,
      currency: ev.currency || 'TRY',
      ref: ev.ref || ''
    }));

    const prompt = `Son 15 gunluk finansal islemlerde tutar bazli anomalileri tespit et.
Kurallar:
- Duz metin degil JSON dondur.
- Hic anomali yoksa [] dondur.
- Her anomali icin: title, severity(low|medium|high), summary, evidence[], relatedUsers[], relatedModules[] alanlarini doldur.
- Odak: normalden cok dusuk/yuksek tutarlar, sifir veya negatif tutarlar, moduller arasi asiri sapmalar.

Kurallar JSON:
${JSON.stringify(rulePayload, null, 2)}

Modul istatistikleri (JSON):
${JSON.stringify(stats, null, 2)}

Islem listesi (JSON):
${JSON.stringify(eventPayload, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Sen Yönetim sistemlerinde finansal anomali analisti olarak calisiyorsun. Kisa, net ve uygulanabilir uyarilar verirsin.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 900
    });

    const response = completion.choices[0]?.message?.content || '';
    const parsed = parseAIJson(response);
    if (!parsed) return [];
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .filter((item) => item && item.title && item.summary)
      .map((item) => ({
        title: String(item.title),
        severity: item.severity === 'high' || item.severity === 'low' ? item.severity : 'medium',
        summary: String(item.summary),
        evidence: Array.isArray(item.evidence) ? item.evidence.map(String) : [],
        relatedUsers: Array.isArray(item.relatedUsers) ? item.relatedUsers.map(String) : [],
        relatedModules: Array.isArray(item.relatedModules) ? item.relatedModules.map(String) : []
      }));
  } catch (error) {
    console.error('AI tutar anomali analizi hatasi:', error);
    return [];
  }
};

// Stok durumu için AI raporu
export const generateAIStatusReport = async (
  stockStatus: any[],
  recentEntries: any[],
  recentOutputs: any[]
): Promise<AIStatusReport> => {
  try {
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return {
        summary: 'AI raporu oluşturulamadı: API anahtarı bulunamadı',
        criticalIssues: [],
        recommendations: [],
        trends: []
      };
    }

    const dataSummary = {
      totalMaterials: stockStatus.length,
      criticalMaterials: stockStatus.filter(s => s.status === 'red').length,
      warningMaterials: stockStatus.filter(s => s.status === 'orange').length,
      recentEntries: recentEntries.length,
      recentOutputs: recentOutputs.length,
      topCritical: stockStatus
        .filter(s => s.status === 'red')
        .slice(0, 5)
        .map(s => ({ name: s.materialName, stock: s.currentStock, critical: s.criticalLevel }))
    };

    const prompt = `Aşağıdaki stok durumu verilerini analiz et ve Türkçe bir rapor oluştur:

Toplam Malzeme: ${dataSummary.totalMaterials}
Kritik Durumda: ${dataSummary.criticalMaterials}
Uyarı Durumunda: ${dataSummary.warningMaterials}
Son Girişler: ${dataSummary.recentEntries}
Son Çıkışlar: ${dataSummary.recentOutputs}

En Kritik Malzemeler:
${JSON.stringify(dataSummary.topCritical, null, 2)}

Lütfen şu formatta JSON döndür:
{
  "summary": "Genel özet (2-3 cümle)",
  "criticalIssues": ["Kritik sorun 1", "Kritik sorun 2"],
  "recommendations": ["Öneri 1", "Öneri 2"],
  "trends": ["Trend 1", "Trend 2"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sen bir stok yönetimi uzmanısın. Stok verilerini analiz edip öneriler sunuyorsun.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content || '';
    const report = parseAIJson(response);
    try {
      if (!report) throw new Error('parse_failed');
      return {
        summary: report.summary || 'Rapor oluşturulamadı',
        criticalIssues: report.criticalIssues || [],
        recommendations: report.recommendations || [],
        trends: report.trends || []
      };
    } catch (parseError) {
      return {
        summary: response.substring(0, 200),
        criticalIssues: [],
        recommendations: [],
        trends: []
      };
    }
  } catch (error: any) {
    console.error('AI rapor hatası:', error);
    return {
      summary: 'Rapor oluşturulurken hata oluştu: ' + error.message,
      criticalIssues: [],
      recommendations: [],
      trends: []
    };
  }
};

// Günlük AI raporu
export const generateDailyAIReport = async (
  stockStatus: any[],
  entries: any[],
  outputs: any[]
): Promise<AIDailyReport> => {
  try {
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return {
        date: new Date().toLocaleDateString('tr-TR'),
        summary: 'AI raporu oluşturulamadı: API anahtarı bulunamadı',
        highlights: [],
        warnings: [],
        recommendations: []
      };
    }

    const today = new Date();
    const todayEntries = entries.filter(e => {
      const entryDate = resolveDate(e.arrivalDate);
      return entryDate ? entryDate.toDateString() === today.toDateString() : false;
    });
    
    const todayOutputs = outputs.filter(o => {
      const outputDate = resolveDate(o.issueDate);
      return outputDate ? outputDate.toDateString() === today.toDateString() : false;
    });

    const dataSummary = {
      date: today.toLocaleDateString('tr-TR'),
      totalMaterials: stockStatus.length,
      criticalCount: stockStatus.filter(s => s.status === 'red').length,
      warningCount: stockStatus.filter(s => s.status === 'orange').length,
      todayEntries: todayEntries.length,
      todayOutputs: todayOutputs.length,
      totalEntryValue: todayEntries.reduce((sum, e) => sum + (e.quantity * e.unitPrice), 0),
      criticalMaterials: stockStatus
        .filter(s => s.status === 'red')
        .slice(0, 3)
        .map(s => s.materialName)
    };

    const prompt = `Bugün (${dataSummary.date}) için stok yönetimi günlük raporu oluştur:

Toplam Malzeme: ${dataSummary.totalMaterials}
Kritik Durumda: ${dataSummary.criticalCount}
Uyarı Durumunda: ${dataSummary.warningCount}
Bugünkü Girişler: ${dataSummary.todayEntries}
Bugünkü Çıkışlar: ${dataSummary.todayOutputs}
Bugünkü Giriş Değeri: ${dataSummary.totalEntryValue.toFixed(2)} TL
Kritik Malzemeler: ${dataSummary.criticalMaterials.join(', ')}

Lütfen şu formatta JSON döndür:
{
  "summary": "Günün özeti (3-4 cümle)",
  "highlights": ["Önemli nokta 1", "Önemli nokta 2"],
  "warnings": ["Uyarı 1", "Uyarı 2"],
  "recommendations": ["Öneri 1", "Öneri 2"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sen bir Yönetim sistem uzmanısın. Günlük stok raporları oluşturuyorsun.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 1500
    });

    const response = completion.choices[0]?.message?.content || '';
    const report = parseAIJson(response);
    try {
      if (!report) throw new Error('parse_failed');
      return {
        date: dataSummary.date,
        summary: report.summary || 'Rapor oluşturulamadı',
        highlights: report.highlights || [],
        warnings: report.warnings || [],
        recommendations: report.recommendations || []
      };
    } catch (parseError) {
      return {
        date: dataSummary.date,
        summary: response.substring(0, 300),
        highlights: [],
        warnings: [],
        recommendations: []
      };
    }
  } catch (error: any) {
    console.error('Günlük AI rapor hatası:', error);
    return {
      date: new Date().toLocaleDateString('tr-TR'),
      summary: 'Rapor oluşturulurken hata oluştu: ' + error.message,
      highlights: [],
      warnings: [],
      recommendations: []
    };
  }
};

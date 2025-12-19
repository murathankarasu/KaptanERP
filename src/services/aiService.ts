import OpenAI from 'openai';

// OpenAI client - ucuz model kullanımı için gpt-3.5-turbo
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
      model: 'gpt-3.5-turbo',
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
    
    try {
      const fixedData = JSON.parse(response);
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
      model: 'gpt-3.5-turbo',
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
    
    try {
      const report = JSON.parse(response);
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
      const entryDate = new Date(e.arrivalDate);
      return entryDate.toDateString() === today.toDateString();
    });
    
    const todayOutputs = outputs.filter(o => {
      const outputDate = new Date(o.issueDate);
      return outputDate.toDateString() === today.toDateString();
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
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Sen bir ERP sistem uzmanısın. Günlük stok raporları oluşturuyorsun.'
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
    
    try {
      const report = JSON.parse(response);
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


import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getAllStockStatus, getStockEntries, getStockOutputs } from '../services/stockService';
import { StockStatus, StockEntry, StockOutput } from '../services/stockService';
import { generateAIStatusReport, generateDailyAIReport } from '../services/aiService';
import { addErrorLog } from '../services/userService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { Package, AlertTriangle, TrendingUp, Brain, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend } from 'recharts';

export default function Dashboard() {
  const [stockStatus, setStockStatus] = useState<StockStatus[]>([]);
  const [recentEntries, setRecentEntries] = useState<StockEntry[]>([]);
  const [recentOutputs, setRecentOutputs] = useState<StockOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<any>(null);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentCompany = getCurrentCompany();
      const companyId = currentCompany?.companyId;
      
      const [statuses, entries, outputs] = await Promise.all([
        getAllStockStatus(companyId),
        getStockEntries(companyId ? { companyId } : undefined),
        getStockOutputs(companyId ? { companyId } : undefined)
      ]);

      setStockStatus(statuses);
      setRecentEntries(entries.slice(0, 5));
      setRecentOutputs(outputs.slice(0, 5));
      
      // Günlük AI raporunu otomatik yükle
      loadDailyAIReport(statuses, entries, outputs);
    } catch (error: any) {
      console.error('Dashboard verileri yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Dashboard verileri yüklenirken hata: ${error.message || error}`,
        'Dashboard',
        userInfo?.id,
        userInfo?.username
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAIStatusReport = async () => {
    try {
      setLoadingAI(true);
      const report = await generateAIStatusReport(stockStatus, recentEntries, recentOutputs);
      setAiReport(report);
    } catch (error: any) {
      console.error('AI rapor yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `AI rapor yüklenirken hata: ${error.message || error}`,
        'Dashboard',
        userInfo?.id,
        userInfo?.username
      );
    } finally {
      setLoadingAI(false);
    }
  };

  const loadDailyAIReport = async (statuses: StockStatus[], entries: StockEntry[], outputs: StockOutput[]) => {
    try {
      const report = await generateDailyAIReport(statuses, entries, outputs);
      setDailyReport(report);
    } catch (error: any) {
      console.error('Günlük AI rapor yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Günlük AI rapor yüklenirken hata: ${error.message || error}`,
        'Dashboard',
        userInfo?.id,
        userInfo?.username
      );
    }
  };

  const statusCounts = {
    green: stockStatus.filter(s => s.status === 'green').length,
    orange: stockStatus.filter(s => s.status === 'orange').length,
    red: stockStatus.filter(s => s.status === 'red').length
  };

  const chartData = stockStatus.slice(0, 10).map(status => ({
    name: status.materialName.length > 15 
      ? status.materialName.substring(0, 15) + '...' 
      : status.materialName,
    stok: status.currentStock
  }));

  const pieData = [
    { name: 'Yeşil', value: statusCounts.green, color: '#28a745' },
    { name: 'Turuncu', value: statusCounts.orange, color: '#ffc107' },
    { name: 'Kırmızı', value: statusCounts.red, color: '#dc3545' }
  ].filter(item => item.value > 0); // Sadece değeri 0'dan büyük olanları göster

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Yükleniyor...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '40px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '40px', color: '#000', letterSpacing: '-1px' }}>
          Dashboard
        </h1>

        {/* İstatistik Kartları */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0',
            border: '2px solid #000',
            borderLeft: '6px solid #000'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#666', fontSize: '12px', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '600' }}>Toplam Malzeme</p>
                <h2 style={{ fontSize: '42px', fontWeight: '700', color: '#000', margin: 0, letterSpacing: '-1px' }}>
                  {stockStatus.length}
                </h2>
              </div>
              <Package size={48} color="#000" />
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0',
            border: '2px solid #000',
            borderLeft: '6px solid #000'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#666', fontSize: '12px', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '600' }}>Yeşil Durum</p>
                <h2 style={{ fontSize: '42px', fontWeight: '700', color: '#000', margin: 0, letterSpacing: '-1px' }}>
                  {statusCounts.green}
                </h2>
              </div>
              <TrendingUp size={48} color="#000" />
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0',
            border: '2px solid #000',
            borderLeft: '6px solid #000'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#666', fontSize: '12px', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '600' }}>Turuncu Durum</p>
                <h2 style={{ fontSize: '42px', fontWeight: '700', color: '#000', margin: 0, letterSpacing: '-1px' }}>
                  {statusCounts.orange}
                </h2>
              </div>
              <AlertTriangle size={48} color="#000" />
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0',
            border: '2px solid #000',
            borderLeft: '6px solid #000'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#666', fontSize: '12px', marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: '600' }}>Kırmızı Durum</p>
                <h2 style={{ fontSize: '42px', fontWeight: '700', color: '#000', margin: 0, letterSpacing: '-1px' }}>
                  {statusCounts.red}
                </h2>
              </div>
              <AlertTriangle size={48} color="#000" />
            </div>
          </div>
        </div>

        {/* Grafikler - İlk Satır */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', 
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0',
            border: '2px solid #000',
            minHeight: '400px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Stok Durumu (İlk 10 Malzeme)
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 11 }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '2px solid #000',
                    borderRadius: '0'
                  }} 
                />
                <Bar dataKey="stok" fill="#4a90e2" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0',
            border: '2px solid #000',
            minHeight: '400px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Durum Dağılımı
            </h3>
            {pieData.length === 0 ? (
              <div style={{ 
                height: '350px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#666',
                fontSize: '14px'
              }}>
                Henüz stok durumu verisi bulunmamaktadır.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => {
                      // Sadece değeri 0'dan büyük olanları göster
                      if (value === 0) return '';
                      return `${name}: ${value} (${(percent * 100).toFixed(0)}%)`;
                    }}
                    outerRadius={110}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '2px solid #000',
                      borderRadius: '0'
                    }}
                    formatter={(value: any) => [`${value} adet`, 'Miktar']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => {
                      const item = pieData.find(p => p.name === value);
                      return item ? `${value} (${item.value})` : value;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* İkinci Satır - Trend Grafikleri */}
        {recentEntries.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', 
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '0',
              border: '2px solid #000',
              minHeight: '350px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Son Girişler Trendi
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={recentEntries.map((entry) => ({
                  name: entry.materialName.substring(0, 10),
                  miktar: entry.quantity,
                  tarih: entry.arrivalDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '2px solid #000',
                      borderRadius: '0'
                    }} 
                  />
                  <Area type="monotone" dataKey="miktar" stroke="#4a90e2" fill="#4a90e2" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '0',
              border: '2px solid #000',
              minHeight: '350px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '24px', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Stok Giriş/Çıkış Karşılaştırması
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stockStatus.slice(0, 8).map(status => ({
                  name: status.materialName.substring(0, 10),
                  giriş: status.totalEntry,
                  çıkış: status.totalOutput
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '2px solid #000',
                      borderRadius: '0'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="giriş" stroke="#28a745" strokeWidth={2} />
                  <Line type="monotone" dataKey="çıkış" stroke="#dc3545" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* AI Raporları */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Günlük AI Raporu */}
          {dailyReport && (
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '0',
              border: '2px solid #000'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Brain size={20} color="#000" />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
                  Günlük AI Raporu - {dailyReport.date}
                </h3>
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#000' }}>
                <p style={{ marginBottom: '16px', fontWeight: '500' }}>{dailyReport.summary}</p>
                {dailyReport.highlights && dailyReport.highlights.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Öne Çıkanlar:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {dailyReport.highlights.map((h: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {dailyReport.warnings && dailyReport.warnings.length > 0 && (
                  <div style={{ marginBottom: '16px', color: '#dc3545' }}>
                    <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uyarılar:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {dailyReport.warnings.map((w: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {dailyReport.recommendations && dailyReport.recommendations.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Öneriler:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {dailyReport.recommendations.map((r: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Durum Raporu */}
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0',
            border: '2px solid #000'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#000" />
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
                  AI Durum Raporu
                </h3>
              </div>
              <button
                onClick={loadAIStatusReport}
                disabled={loadingAI}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                {loadingAI ? 'Yükleniyor...' : 'Rapor Oluştur'}
              </button>
            </div>
            {aiReport ? (
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#000' }}>
                <p style={{ marginBottom: '16px', fontWeight: '500' }}>{aiReport.summary}</p>
                {aiReport.criticalIssues && aiReport.criticalIssues.length > 0 && (
                  <div style={{ marginBottom: '16px', color: '#dc3545' }}>
                    <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kritik Sorunlar:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {aiReport.criticalIssues.map((issue: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiReport.recommendations && aiReport.recommendations.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Öneriler:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {aiReport.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiReport.trends && aiReport.trends.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trendler:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {aiReport.trends.map((trend: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{trend}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: '#666', fontSize: '13px', fontStyle: 'italic' }}>
                Rapor oluşturmak için "Rapor Oluştur" butonuna tıklayın.
              </p>
            )}
          </div>
        </div>

        {/* Son İşlemler */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0',
            border: '2px solid #000'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Son Stok Girişleri
            </h3>
            {recentEntries.length === 0 ? (
              <p style={{ color: '#666', fontSize: '13px' }}>Henüz stok girişi yapılmamış</p>
            ) : (
              <div style={{ fontSize: '14px' }}>
                {recentEntries.map((entry, index) => (
                  <div key={index} style={{ 
                    padding: '12px', 
                    borderBottom: '1px solid #000',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <strong style={{ color: '#000', fontWeight: '600' }}>{entry.materialName}</strong>
                      <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                        {entry.arrivalDate.toLocaleDateString('tr-TR')} - {entry.quantity} {entry.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '0',
            border: '2px solid #000'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#000', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Son Personel Çıkışları
            </h3>
            {recentOutputs.length === 0 ? (
              <p style={{ color: '#666', fontSize: '13px' }}>Henüz çıkış yapılmamış</p>
            ) : (
              <div style={{ fontSize: '14px' }}>
                {recentOutputs.map((output, index) => (
                  <div key={index} style={{ 
                    padding: '12px', 
                    borderBottom: '1px solid #000',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <strong style={{ color: '#000', fontWeight: '600' }}>{output.materialName}</strong>
                      <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                        {output.employee} - {output.issueDate.toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}


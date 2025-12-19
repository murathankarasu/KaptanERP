import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { addJournalEntry, getJournalEntries, JournalLine } from '../services/financeService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { addErrorLog } from '../services/userService';
import { Plus, Save, BookOpen, RefreshCw } from 'lucide-react';

interface FormLine extends JournalLine {
  id: string;
}

export default function JournalEntries() {
  const [lines, setLines] = useState<FormLine[]>([
    { id: 'l1', accountCode: '', amount: 0, currency: 'TRY', exchangeRate: 1, side: 'debit', description: '' },
    { id: 'l2', accountCode: '', amount: 0, currency: 'TRY', exchangeRate: 1, side: 'credit', description: '' }
  ]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('TRY');
  const [companyIdOverride, setCompanyIdOverride] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const currentCompany = getCurrentCompany();
      const data = await getJournalEntries({ companyId: currentCompany?.companyId, limit: 100 });
      setEntries(data);
    } catch (error: any) {
      console.error('Yevmiye kayıtları yüklenirken hata:', error);
      const currentUser = localStorage.getItem('currentUser');
      const userInfo = currentUser ? JSON.parse(currentUser) : null;
      await addErrorLog(
        `Yevmiye kayıtları yüklenirken hata: ${error.message || error}`,
        'JournalEntries',
        userInfo?.id,
        userInfo?.username
      );
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { id: `l${Date.now()}`, accountCode: '', amount: 0, currency: 'TRY', exchangeRate: 1, side: 'debit', description: '' }]);
  };

  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) {
      alert('En az iki satır olmalı (borç/alacak)');
      return;
    }
    setLines(lines.filter(l => l.id !== id));
  };

  const totals = lines.reduce(
    (acc, l) => {
      if (l.side === 'debit') acc.debit += Number(l.amount) || 0;
      else acc.credit += Number(l.amount) || 0;
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totals.debit <= 0 || totals.debit !== totals.credit) {
      alert('Borç ve alacak toplamı eşit ve sıfırdan büyük olmalı');
      return;
    }
    if (!date) {
      alert('Tarih seçin');
      return;
    }
    try {
      setSubmitting(true);
      const currentCompany = getCurrentCompany();
      const companyId = companyIdOverride || currentCompany?.companyId;
      await addJournalEntry({
        date: new Date(date),
        description: description || 'Yevmiye Fişi',
        companyId,
        baseCurrency,
        lines: lines.map(({ id, ...rest }) => rest)
      });
      alert('Yevmiye kaydedildi');
      setDescription('');
      setLines([
        { id: 'l1', accountCode: '', amount: 0, currency: 'TRY', exchangeRate: 1, side: 'debit', description: '' },
        { id: 'l2', accountCode: '', amount: 0, currency: 'TRY', exchangeRate: 1, side: 'credit', description: '' }
      ]);
      loadEntries();
    } catch (error: any) {
      console.error('Yevmiye kaydı eklenirken hata:', error);
      alert('Yevmiye kaydı eklenirken hata: ' + (error.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={32} color="#000" />
            <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#000', letterSpacing: '-0.5px' }}>
              Yevmiye Fişleri
            </h1>
          </div>
          <button onClick={loadEntries} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading}>
            <RefreshCw size={16} />
            Yenile
          </button>
        </div>

        <div className="excel-form" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#000' }}>Yeni Fiş</h2>
            <button onClick={addLine} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} />
              Satır Ekle
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="excel-form-label">Tarih</label>
                <input
                  type="date"
                  className="excel-form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="excel-form-label">Açıklama</label>
                <input
                  type="text"
                  className="excel-form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="excel-form-label">Şirket ID (override)</label>
                <input
                  type="text"
                  className="excel-form-input"
                  placeholder="Boş bırakılırsa aktif şirket"
                  value={companyIdOverride}
                  onChange={(e) => setCompanyIdOverride(e.target.value)}
                />
              </div>
              <div>
                <label className="excel-form-label">Temel Para Birimi</label>
                <input
                  type="text"
                  className="excel-form-input"
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  placeholder="TRY"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#000' }}>Toplam Borç:</span>
                <span style={{ fontWeight: 700 }}>{totals.debit.toFixed(2)} </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#000' }}>Toplam Alacak:</span>
                <span style={{ fontWeight: 700 }}>{totals.credit.toFixed(2)} </span>
              </div>
            </div>

            <div className="table-container" style={{ marginBottom: '12px' }}>
              <table className="excel-table">
                <thead>
                  <tr>
                    <th>Hesap Kodu</th>
                    <th>Borç / Alacak</th>
                    <th>Tutar</th>
                    <th>Para Birimi</th>
                    <th>Kur</th>
                    <th>Açıklama</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <input
                          type="text"
                          className="excel-form-input"
                          value={line.accountCode}
                          onChange={(e) => updateLine(line.id, 'accountCode', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="excel-form-select"
                          value={line.side}
                          onChange={(e) => updateLine(line.id, 'side', e.target.value as 'debit' | 'credit')}
                        >
                          <option value="debit">Borç</option>
                          <option value="credit">Alacak</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="excel-form-input"
                          value={line.amount}
                          onChange={(e) => updateLine(line.id, 'amount', parseFloat(e.target.value))}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="excel-form-input"
                        placeholder="TRY"
                        value={line.currency || 'TRY'}
                          onChange={(e) => updateLine(line.id, 'currency', e.target.value)}
                        />
                      </td>
                    <td>
                      <input
                        type="number"
                        step="0.0001"
                        className="excel-form-input"
                        placeholder="Kur"
                        value={line.exchangeRate || 1}
                        onChange={(e) => updateLine(line.id, 'exchangeRate', parseFloat(e.target.value) || 1)}
                      />
                    </td>
                      <td>
                        <input
                          type="text"
                          className="excel-form-input"
                          value={line.description || ''}
                          onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        />
                      </td>
                      <td>
                        <button type="button" className="btn btn-secondary" onClick={() => removeLine(line.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Save size={16} style={{ marginRight: '6px' }} />
              Kaydet
            </button>
          </form>
        </div>

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : entries.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Henüz fiş bulunmuyor.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Açıklama</th>
                  <th>Toplam</th>
                  <th>Satırlar</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const debit = entry.lines?.filter((l: any) => l.side === 'debit').reduce((s: number, l: any) => s + l.amount, 0) || 0;
                  return (
                    <tr key={entry.id}>
                      <td>{new Date(entry.date).toLocaleDateString('tr-TR')}</td>
                      <td>{entry.description}</td>
                      <td>{debit.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#555' }}>
                          {entry.lines?.map((l: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600 }}>{l.accountCode}</span>
                              <span>{l.side === 'debit' ? 'B' : 'A'}</span>
                              <span>{l.amount.toFixed(2)} {l.currency || 'TRY'}</span>
                              {l.description && <span style={{ color: '#777' }}>{l.description}</span>}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}


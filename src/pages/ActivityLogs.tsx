import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getActivityLogs, ActivityLog } from '../services/activityLogService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCurrentUser } from '../utils/getCurrentUser';
import { PERMISSIONS } from '../types/permissions';
import { Activity, Filter, Calendar } from 'lucide-react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    module: '',
    startDate: '',
    endDate: ''
  });

  const currentUser = getCurrentUser();
  const currentCompany = getCurrentCompany();

  useEffect(() => {
    // Sadece manager görebilir
    if (currentUser?.role !== 'manager') {
      window.location.href = '/dashboard';
      return;
    }
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const filterParams: any = {
        companyId: currentCompany?.companyId,
        limit: 500 // Son 500 kayıt
      };

      if (filters.module) {
        filterParams.module = filters.module;
      }

      if (filters.startDate) {
        filterParams.startDate = new Date(filters.startDate);
      }

      if (filters.endDate) {
        filterParams.endDate = new Date(filters.endDate);
        // End date'in sonuna kadar (23:59:59)
        filterParams.endDate.setHours(23, 59, 59, 999);
      }

      const data = await getActivityLogs(filterParams);
      setLogs(data);
    } catch (error: any) {
      console.error('Aktivite logları yüklenirken hata:', error);
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const uniqueModules = Array.from(new Set(logs.map(log => log.module))).filter(Boolean);

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={32} color="#000" />
            <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
              Aktivite Logları
            </h1>
          </div>
        </div>

        {/* Filtreler */}
        <div style={{
          background: 'white',
          border: '2px solid #000',
          padding: '20px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Modül
            </label>
            <select
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Tümü</option>
              {uniqueModules.map(module => (
                <option key={module} value={module}>
                  {PERMISSIONS[module as keyof typeof PERMISSIONS]?.label || module}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Tablo */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Henüz aktivite logu bulunmamaktadır.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Tarih/Saat</th>
                  <th>Kullanıcı</th>
                  <th>Personel</th>
                  <th>İşlem</th>
                  <th>Modül</th>
                  <th>Detay</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px' }}>{formatDate(log.timestamp)}</td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>
                        {log.username || log.userEmail || '-'}
                      </div>
                    </td>
                    <td>
                      {log.personnelName ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>{log.personnelName}</div>
                          {log.personnelId && (
                            <div style={{ fontSize: '11px', color: '#666' }}>ID: {log.personnelId}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px' }}>{log.action}</td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        background: '#000',
                        color: '#fff',
                        borderRadius: '2px'
                      }}>
                        {PERMISSIONS[log.module as keyof typeof PERMISSIONS]?.label || log.module}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#666', maxWidth: '300px' }}>
                      {log.details ? (
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {log.details}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}


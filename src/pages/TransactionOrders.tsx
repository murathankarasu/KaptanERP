import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getActivityLogs, ActivityLog } from '../services/activityLogService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCurrentUser } from '../utils/getCurrentUser';
import { PERMISSIONS } from '../types/permissions';
import { FileText, Filter, Calendar, User, Activity } from 'lucide-react';

export default function TransactionOrders() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    module: '',
    startDate: '',
    endDate: ''
  });
  const [users, setUsers] = useState<{ id: string; username: string; email?: string }[]>([]);

  const currentUser = getCurrentUser();
  const currentCompany = getCurrentCompany();

  useEffect(() => {
    // Sadece admin görebilir
    const checkAdmin = () => {
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) {
        window.location.href = '/admin-login';
        return false;
      }
      try {
        const userData = JSON.parse(currentUser);
        if (userData.role !== 'admin') {
          window.location.href = '/admin-login';
          return false;
        }
        return true;
      } catch (error) {
        window.location.href = '/admin-login';
        return false;
      }
    };
    
    if (!checkAdmin()) {
      return;
    }
    
    loadLogs();
  }, [filters]);


  const loadLogs = async () => {
    try {
      setLoading(true);
      const filterParams: any = {
        companyId: currentCompany?.companyId,
        limit: 1000 // Son 1000 kayıt
      };

      if (filters.userId) {
        filterParams.userId = filters.userId;
      }

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
      
      // Kullanıcıları güncelle
      const uniqueUsers = new Map<string, { id: string; username: string; email?: string }>();
      data.forEach(log => {
        if (log.userId && log.username) {
          uniqueUsers.set(log.userId, {
            id: log.userId,
            username: log.username,
            email: log.userEmail
          });
        }
      });
      setUsers(Array.from(uniqueUsers.values()));
    } catch (error: any) {
      console.error('İşlem emirleri yüklenirken hata:', error);
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
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const uniqueModules = Array.from(new Set(logs.map(log => log.module))).filter(Boolean);

  // İşlem istatistikleri
  const stats = {
    total: logs.length,
    byUser: logs.reduce((acc, log) => {
      const key = log.userId || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byModule: logs.reduce((acc, log) => {
      const key = log.module || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={32} color="#000" />
            <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
              İşlem Emirleri
            </h1>
          </div>
        </div>

        {/* İstatistikler */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'white',
            border: '2px solid #000',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Toplam İşlem
            </div>
          </div>
          <div style={{
            background: 'white',
            border: '2px solid #000',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
              {Object.keys(stats.byUser).length}
            </div>
            <div style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Aktif Kullanıcı
            </div>
          </div>
          <div style={{
            background: 'white',
            border: '2px solid #000',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#000', marginBottom: '8px' }}>
              {Object.keys(stats.byModule).length}
            </div>
            <div style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Modül Sayısı
            </div>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              <User size={16} />
              Kullanıcı
            </label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #000',
                borderRadius: '0',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">Tüm Kullanıcılar</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} {user.email && `(${user.email})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              <Activity size={16} />
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
              <option value="">Tüm Modüller</option>
              {uniqueModules.map(module => (
                <option key={module} value={module}>
                  {PERMISSIONS[module as keyof typeof PERMISSIONS]?.label || module}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              <Calendar size={16} />
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000' }}>
              <Calendar size={16} />
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
              Henüz işlem emri bulunmamaktadır.
            </div>
          ) : (
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Tarih/Saat</th>
                  <th>Kullanıcı</th>
                  <th>E-posta</th>
                  <th>Personel</th>
                  <th>İşlem</th>
                  <th>Modül</th>
                  <th>Detay</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDate(log.timestamp)}</td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>
                        {log.username || '-'}
                      </div>
                      {log.userId && (
                        <div style={{ fontSize: '11px', color: '#666' }}>ID: {log.userId}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: '#666' }}>
                      {log.userEmail || '-'}
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


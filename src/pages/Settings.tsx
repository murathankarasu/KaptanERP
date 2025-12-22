import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getCurrentUser } from '../utils/getCurrentUser';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCustomers } from '../services/customerService';
import { getOrders } from '../services/orderService';
import { getShipments } from '../services/shipmentService';
import { getAllStockStatus } from '../services/stockService';
import { getRequisitions, getRFQs, getPurchaseOrders, getGoodsReceipts } from '../services/procurementService';
import { getBOMs, getProductionOrders } from '../services/productionService';
import { getLeaveRequests } from '../services/hrmService';
import { collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FileDown, Trash2, Shield, Bell, Send } from 'lucide-react';
import * as XLSX from 'xlsx';
import { deleteUser, getErrorLogs, addErrorLog, ErrorLog } from '../services/userService';

const SettingsPage = () => {
  const user = getCurrentUser();
  const isManager = user?.role === 'manager';
  const company = getCurrentCompany();
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [issueText, setIssueText] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    if (!user?.id) return;
    try {
      setLoadingLogs(true);
      const data = await getErrorLogs({ userId: user.id });
      setLogs(data);
    } catch (err) {
      console.error('Bildirimler yüklenirken hata:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const exportAll = async () => {
    if (!isManager) {
      alert('Tüm verileri indirme işlemi sadece şirket yöneticisi içindir.');
      return;
    }
    try {
      setBusy(true);
      if (!company?.companyId) {
        alert('Şirket bilgisi bulunamadı.');
        return;
      }
      const companyId = company.companyId;

      // Firestore koleksiyonlarından ham veriyi oku ve TEK bir Excel dosyasında çoklu sayfa olarak indir
      const colDefs = [
        { col: 'customers', name: 'Musteriler' },
        { col: 'orders', name: 'Siparisler' },
        { col: 'shipments', name: 'Sevkiyatlar' },
        { col: 'stockEntries', name: 'StokGirisleri' },
        { col: 'stockOutputs', name: 'StokCikislari' },
        { col: 'stockStatus', name: 'StokDurumu' },
        { col: 'requisitions', name: 'Talepler' },
        { col: 'rfqs', name: 'TeklifIstekleri' },
        { col: 'purchaseOrders', name: 'SatinAlmaSiparisleri' },
        { col: 'goodsReceipts', name: 'MalKabulGRN' },
        { col: 'boms', name: 'BOM' },
        { col: 'productionOrders', name: 'UretimEmirleri' },
        { col: 'leaveRequests', name: 'Izinler' },
        { col: 'personnel', name: 'Personel' },
        { col: 'users', name: 'Kullanicilar' },
        { col: 'invoices', name: 'Faturalar' },
        { col: 'products', name: 'UrunKartlari' },
        { col: 'bins', name: 'Raflar' },
        { col: 'transactions', name: 'Hareketler' },
        { col: 'journalEntries', name: 'YevmiyeKayitlari' },
        { col: 'activityLogs', name: 'KullaniciIslemleri' },
        { col: 'priceRules', name: 'FiyatKurallari' }
      ];

      const convertDoc = (data: any, id: string) => {
        const result: any = { id };
        Object.entries(data || {}).forEach(([k, v]) => {
          // Firestore Timestamp to ISO
          // @ts-ignore
          if (v && typeof v === 'object' && typeof (v as any).toDate === 'function') {
            // @ts-ignore
            result[k] = (v as any).toDate().toISOString();
          } else {
            result[k] = v;
          }
        });
        return result;
      };

      const wb = XLSX.utils.book_new();

      for (const def of colDefs) {
        const qRef = query(collection(db, def.col), where('companyId', '==', companyId));
        const snap = await getDocs(qRef);
        if (snap.empty) continue;
        const rows = snap.docs.map(d => convertDoc(d.data(), d.id));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, def.name.slice(0, 31));
      }

      const filename = `kaptan_tum_veri_${companyId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);

      alert('Tüm şirket verileri tek bir Excel dosyasında, farklı sayfalar halinde indirildi.');
    } catch (err: any) {
      alert('İndirme hatası: ' + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const deleteAll = async () => {
    if (!isManager) {
      alert('Veri silme işlemi sadece şirket yöneticisi içindir.');
      return;
    }
    if (!company?.companyId) {
      alert('Şirket bilgisi bulunamadı.');
      return;
    }
    const sure = confirm('Bu işlem geri alınamaz. Bu şirketin verilerini SİLMEK istediğine emin misin?');
    if (!sure) return;
    try {
      setBusy(true);
      const companyId = company.companyId;
      const colNames = [
        'customers','orders','shipments','stockStatus','requisitions','rfqs','purchaseOrders','goodsReceipts','boms','productionOrders','leaveRequests','activityLogs','priceRules','products','bins','transactions','journalEntries'
      ];
      for (const colName of colNames) {
        const qRef = query(collection(db, colName), where('companyId','==',companyId));
        const snap = await getDocs(qRef);
        const deletes = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletes);
      }
      alert('Tüm veriler silindi.');
    } catch (err: any) {
      alert('Silme hatası: ' + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!user?.id) {
      alert('Kullanıcı bilgisi bulunamadı.');
      return;
    }
    const sure = confirm('Hesabınızı silmek üzeresiniz. Bu işlem geri alınamaz. Devam edilsin mi?');
    if (!sure) return;
    try {
      setBusy(true);
      await deleteUser(user.id);
      localStorage.removeItem('currentUser');
      alert('Hesabınız silindi. Hoşçakalın.');
      window.location.href = '/login';
    } catch (err: any) {
      alert('Hesap silme hatası: ' + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const sendIssue = async () => {
    if (!issueText.trim()) {
      alert('Lütfen sorunu kısaca açıklayın.');
      return;
    }
    try {
      setBusy(true);
      await addErrorLog(issueText.trim(), 'Settings', user?.id, user?.username);
      setIssueText('');
      alert('Sorununuz kaydedildi. Yönetici inceleyecektir.');
      loadLogs();
    } catch (err: any) {
      alert('Sorun gönderilirken hata: ' + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '30px', maxWidth: '700px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Shield size={22} />
          <h1 style={{ fontSize: '26px', fontWeight: 700 }}>Ayarlar</h1>
        </div>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
          Bu sayfadan şirket verilerinizi indirebilir, silebilir, hesabınızı kapatabilir ve sorun bildirebilirsiniz.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ border: '1px solid #ddd', padding: '14px', background: '#fff' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '8px' }}>Veri İndirme</h3>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>
              Şirketinize ait tüm temel verileri tek bir Excel dosyası olarak indirebilirsiniz. Bu işlem sadece şirket yöneticisi için aktiftir.
            </p>
            <button className="btn btn-primary" onClick={exportAll} disabled={busy || !isManager}>
              <FileDown size={14} /> Tüm Verileri Excel İndir
            </button>
            {!isManager && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#999' }}>
                Bu işlem için şirket yöneticinizle iletişime geçin.
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #ddd', padding: '14px', background: '#fff' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '8px', color: '#b00000' }}>Şirket Verilerini Sil</h3>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>
              Bu işlem seçili şirketin ERP verilerini kalıcı olarak siler. Geri alınamaz ve sadece şirket yöneticisi tarafından yapılabilir.
            </p>
            <button className="btn btn-secondary" style={{ background: '#dc3545', borderColor: '#dc3545' }} onClick={deleteAll} disabled={busy || !isManager}>
              <Trash2 size={14} /> Tüm Verileri Sil (Geri Alınamaz)
            </button>
            {!isManager && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#999' }}>
                Sadece şirket yöneticileri verileri silebilir.
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #ddd', padding: '14px', background: '#fff' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '8px' }}>Hesabım</h3>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>
              Kendi kullanıcı hesabınızı sistemden tamamen silebilirsiniz.
            </p>
            <button className="btn btn-secondary" style={{ background: '#6c757d', borderColor: '#6c757d' }} onClick={deleteAccount} disabled={busy}>
              Hesabımı Sil
            </button>
          </div>

          <div style={{ border: '1px solid #ddd', padding: '14px', background: '#fff' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} /> Bildirimlerim
            </h3>
            {loadingLogs ? (
              <div style={{ fontSize: '12px', color: '#666' }}>Yükleniyor...</div>
            ) : logs.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#666' }}>Şu anda kayıtlı bir bildiriminiz yok.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {logs.map((log) => (
                  <div key={log.id} style={{ border: '1px solid #eee', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                      {log.resolved ? 'Sorununuz çözüldü' : 'Sorununuz beklemede'}
                    </div>
                    <div style={{ color: '#333' }}>{log.error}</div>
                    <div style={{ marginTop: '4px', color: '#777' }}>
                      {log.timestamp?.toLocaleString?.('tr-TR') || ''} {log.resolved && log.resolvedBy ? ` • Çözen: ${log.resolvedBy}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #ddd', padding: '14px', background: '#fff' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={16} /> Sorun Bildir
            </h3>
            <textarea
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="Yaşadığınız sorunu kısaca açıklayın..."
              style={{ width: '100%', minHeight: '80px', padding: '8px', fontSize: '12px', border: '1px solid #ccc', marginBottom: '8px' }}
            />
            <button className="btn btn-primary" onClick={sendIssue} disabled={busy}>
              Sorun Bildir
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;


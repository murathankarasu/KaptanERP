import Layout from '../components/Layout';
import { Info, ShieldCheck, Zap, Globe } from 'lucide-react';

export default function About() {
  return (
    <Layout>
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <Info size={40} color="#000" />
          <h1 style={{ fontSize: '48px', fontWeight: '800', margin: 0, letterSpacing: '-2px' }}>Kaptan Hakkında</h1>
        </div>

        <section style={{ marginBottom: '48px' }}>
          <p style={{ fontSize: '20px', lineHeight: '1.6', color: '#333' }}>
            Kaptan, karmaşık işletme süreçlerini basitleştirmek için tasarlanmış yeni nesil bir İşletme Yönetim Sistemi (BMS)'dir. 
            Geleneksel, hantal ERP sistemlerinden uzaklaşarak, Kaptan tedarik zincirleri, müşteri ilişkileri, finans, 
            üretim ve insan kaynakları yönetimi için modüler, yapay zeka odaklı bir yaklaşım sunar.
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px' }}>
          <div style={{ padding: '24px', border: '2px solid #000', borderRadius: '0' }}>
            <Zap size={24} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Verimlilik Öncelikli</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Hızlı veri girişi ve net görselleştirme için tasarlanmış minimalist arayüz. Gereksiz karmaşa yok, sadece performans.
            </p>
          </div>
          <div style={{ padding: '24px', border: '2px solid #000', borderRadius: '0' }}>
            <ShieldCheck size={24} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Çoklu Kiracı Güvenliği</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Şirket verileriniz için en son teknoloji Firestore güvenlik kuralları kullanılarak kurumsal düzeyde izolasyon.
            </p>
          </div>
          <div style={{ padding: '24px', border: '2px solid #000', borderRadius: '0' }}>
            <Globe size={24} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Küresel Uyumluluk</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Çoklu para birimi işlemleri ve Türk e-dönüşüm standartları dahil yerel düzenlemeler için destek.
            </p>
          </div>
          <div style={{ padding: '24px', border: '2px solid #000', borderRadius: '0' }}>
            <Info size={24} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Yapay Zeka Entegrasyonu</h3>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Otonom raporlama, tahminleme ve veri mutabakatı için GPT-4o Mini'nin gücünden yararlanma.
            </p>
          </div>
        </div>

        <section style={{ padding: '32px', background: '#f9f9f9', borderLeft: '4px solid #000' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>Misyonumuz</h2>
          <p style={{ fontSize: '16px', lineHeight: '1.5', margin: 0 }}>
            Misyonumuz, küçük ve orta ölçekli işletmelere dijital dünyada rekabet edebilmeleri için ihtiyaç duydukları araçları sağlamaktır. 
            Şeffaf, esnek ve akıllı bir platform sunarak, işletmelerin elektronik tablolardan tek bir doğruluk kaynağına geçişine yardımcı oluyoruz.
          </p>
        </section>

        <footer style={{ marginTop: '64px', textAlign: 'center', fontSize: '12px', color: '#999' }}>
          © 2025 Kaptan BMS. Tüm hakları saklıdır. Sürüm 2.4.0
        </footer>
      </div>
    </Layout>
  );
}


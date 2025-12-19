# Kaptan - Kolay ERP Sistemleri

Firestore tabanlı ERP uygulaması. Siyah-beyaz minimalist tasarım ile stok giriş, personel çıkış takibi ve zimmet imza yönetimi.

## Özellikler

- 🔐 Google Authentication ile güvenli giriş (izin verilen hesaplar)
- 📊 Excel benzeri tablo arayüzü
- 📥 Excel formatında veri dışa aktarma
- 📦 Stok Giriş Takibi (filtreleme ile)
- 👥 Personel Çıkış Takibi (otomatik stok düşme)
- 📈 Stok Durumu (otomatik hesaplama, renkli durum göstergesi)
- ✍️ Zimmet İmza Sayfası (A4 formatında yazdırılabilir)

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Firebase yapılandırması:
   - Firebase Console'dan yeni bir proje oluşturun
   - Authentication'da Google provider'ı etkinleştirin
   - Firestore Database'i oluşturun
   - `.env` dosyası oluşturun ve Firebase bilgilerinizi ekleyin:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. Firestore'da izin verilen kullanıcıları ayarlayın:
   - Firestore'da `settings` koleksiyonu oluşturun
   - `allowedUsers` dokümanı oluşturun
   - `emails` alanına izin verilen email adreslerini array olarak ekleyin:
   ```json
   {
     "emails": ["user1@example.com", "user2@example.com"]
   }
   ```

4. Uygulamayı çalıştırın:
```bash
npm run dev
```

## Kullanım

### Stok Giriş Takip
- Fabrikaya gelen stok malzemelerin girişi yapılır
- Filtreleme: Malzeme adı, kategori, tedarikçi, tarih aralığı
- Excel'e aktarma özelliği

### Personel Çıkış Takip
- Personellere malzeme çıkışı yapılır
- Stokta olmayan malzeme çıkışına izin verilmez
- Çıkış yapıldığında stok otomatik düşer
- Çıkış sonrası otomatik olarak zimmet imza sayfasına yönlendirilir

### Stok Durumu
- Otomatik hesaplanır (veri girişi yok)
- Durum renkleri:
  - 🟢 Yeşil: Kritik seviyenin üstünde
  - 🟠 Turuncu: Kritik seviyeye yaklaşıyor
  - 🔴 Kırmızı: Kritik seviyenin altında veya sıfır

### Zimmet İmza Sayfası
- A4 formatında yazdırılabilir
- Personel ve yetkili imzaları dijital olarak alınır
- İade tarihi belirlenebilir
- Firestore'da saklanır

## Vercel'de Deploy

1. **Vercel hesabı oluşturun** ve projeyi GitHub'a push edin

2. **Vercel Dashboard'dan projeyi import edin:**
   - "New Project" butonuna tıklayın
   - GitHub repository'nizi seçin
   - Framework Preset: **Vite** seçin
   - Root Directory: `.` (proje kök dizini)

3. **Environment Variables ekleyin:**
   Vercel Dashboard > Settings > Environment Variables bölümünden şu değişkenleri ekleyin:
   
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   VITE_OPENAI_API_KEY=your_openai_api_key (veya VITE_GPT_API_KEY)
   ```

4. **Deploy:**
   - "Deploy" butonuna tıklayın
   - Build otomatik olarak başlayacak
   - Deploy tamamlandıktan sonra URL'niz hazır olacak

5. **Firebase Hosting Domain'i ekleyin (opsiyonel):**
   - Firebase Console > Hosting
   - Vercel domain'inizi ekleyin
   - Firebase Authentication'da authorized domains'e ekleyin

### Vercel CLI ile Deploy (Alternatif)

```bash
# Vercel CLI'yı global olarak yükleyin
npm i -g vercel

# Proje dizininde
vercel

# Production deploy için
vercel --prod
```

## Teknolojiler

- React + TypeScript
- Firebase (Authentication + Firestore)
- Vite
- React Router
- Recharts (grafikler)
- XLSX (Excel export)
- React Signature Canvas (imza)
- OpenAI API (AI özellikleri)

## Lisans

MIT


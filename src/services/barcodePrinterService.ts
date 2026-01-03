/**
 * Barkod Yazıcı Servisi
 * ESC/POS protokolü ile barkod yazıcılarına bağlanır
 */

// Web Serial API types (browser global types)
declare global {
  interface SerialPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
  }
  
  interface USBDevice {
    open(): Promise<void>;
    close(): Promise<void>;
  }
  
  interface Navigator {
    serial?: {
      requestPort(): Promise<SerialPort>;
    };
  }
}

export interface PrinterConnection {
  type: 'usb' | 'serial' | 'network';
  port?: SerialPort | USBDevice;
  ipAddress?: string;
  portNumber?: number;
}

// ESC/POS Komutları
const ESC = '\x1B';
const GS = '\x1D';

// Yazıcı komutları
const ESC_POS_COMMANDS = {
  INIT: ESC + '@',
  CUT: GS + 'V' + '\x41' + '\x03',
  FEED: '\n\n\n',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  FONT_A: ESC + 'M' + '\x00',
  FONT_B: ESC + 'M' + '\x01',
  FONT_C: ESC + 'M' + '\x02',
};

// Code128 barkod oluştur (ESC/POS)
const generateCode128 = (data: string): string => {
  // GS k m n d1...dk
  // m: 73 (Code128), n: veri uzunluğu (0-255), d1...dk: veri
  const length = Math.min(data.length, 255);
  // Bazı yazıcılar için alternatif format: GS k 4 0 n d1...dk (n=0: otomatik uzunluk)
  return GS + 'k' + '\x49' + String.fromCharCode(length) + data.substring(0, length);
};

// Code39 barkod oluştur (ESC/POS)
const generateCode39 = (data: string): string => {
  // GS k m n d1...dk
  // m: 4 (Code39), n: veri uzunluğu (0-255), d1...dk: veri
  const length = Math.min(data.length, 255);
  return GS + 'k' + '\x04' + String.fromCharCode(length) + data.substring(0, length);
};

/**
 * USB yazıcıya bağlan
 */
export const connectUSBPrinter = async (): Promise<SerialPort | null> => {
  try {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API desteklenmiyor. Chrome/Edge kullanın.');
    }

    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    return port;
  } catch (error: any) {
    console.error('USB yazıcı bağlantı hatası:', error);
    throw new Error('Yazıcıya bağlanılamadı: ' + error.message);
  }
};

/**
 * Seri port yazıcıya bağlan
 */
export const connectSerialPrinter = async (baudRate: number = 9600): Promise<SerialPort | null> => {
  try {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API desteklenmiyor. Chrome/Edge kullanın.');
    }

    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate });
    return port;
  } catch (error: any) {
    console.error('Seri port yazıcı bağlantı hatası:', error);
    throw new Error('Yazıcıya bağlanılamadı: ' + error.message);
  }
};

/**
 * Ağ yazıcısına bağlan (HTTP/RAW)
 */
export const connectNetworkPrinter = async (_ipAddress: string, _port: number = 9100): Promise<void> => {
  // Network yazıcı için doğrudan HTTP/RAW protokolü kullanılır
  // Bu tarayıcı güvenlik kısıtlamaları nedeniyle backend'de yapılmalı
  // Şimdilik sadece interface tanımlıyoruz
  return Promise.resolve();
};

/**
 * Yazıcıya veri gönder (Serial Port)
 */
export const sendToSerialPrinter = async (port: SerialPort, data: string): Promise<void> => {
  try {
    const writer = port.writable?.getWriter();
    if (!writer) {
      throw new Error('Yazıcı yazılabilir değil');
    }

    const encoder = new TextEncoder();
    await writer.write(encoder.encode(data));
    writer.releaseLock();
  } catch (error: any) {
    console.error('Yazıcıya veri gönderme hatası:', error);
    throw new Error('Yazıcıya veri gönderilemedi: ' + error.message);
  }
};

/**
 * Ağ yazıcısına veri gönder (HTTP/RAW)
 */
export const sendToNetworkPrinter = async (ipAddress: string, port: number, data: string): Promise<void> => {
  try {
    // CORS nedeniyle doğrudan fetch çalışmayabilir
    // Backend proxy gerekebilir
    await fetch(`http://${ipAddress}:${port}`, {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      mode: 'no-cors' // CORS bypass (sınırlı)
    });
    
    // no-cors modunda response okunamaz, sadece gönderilir
    return Promise.resolve();
  } catch (error: any) {
    console.error('Ağ yazıcısına veri gönderme hatası:', error);
    throw new Error('Ağ yazıcısına veri gönderilemedi: ' + error.message);
  }
};

/**
 * Barkod etiketi oluştur ve yazdır
 */
export const printBarcodeLabel = async (
  barcode: string,
  materialName?: string,
  sku?: string,
  variant?: string,
  productionDate?: Date,
  companyInfo?: {
    name?: string;
    logoUrl?: string;
    companyCode?: string;
    website?: string;
    email?: string;
  },
  options?: {
    printerType?: 'usb' | 'serial' | 'network';
    ipAddress?: string;
    port?: number;
    labelWidth?: number; // mm
    labelHeight?: number; // mm
    barcodeType?: 'code128' | 'code39';
    showText?: boolean;
  }
): Promise<void> => {
  const printerType = options?.printerType || 'serial';
  const labelWidth = options?.labelWidth || 58; // 58mm standart etiket
  const barcodeType = options?.barcodeType || 'code128';
  const showText = options?.showText !== false;

  // ESC/POS komutları ile etiket oluştur
  let printData = '';
  
  // Yazıcıyı başlat
  printData += ESC_POS_COMMANDS.INIT;
  
  // Sol hizalama
  printData += ESC_POS_COMMANDS.ALIGN_LEFT;
  
  // Şirket adı (varsa)
  if (companyInfo?.name && showText) {
    printData += ESC_POS_COMMANDS.BOLD_ON;
    printData += ESC_POS_COMMANDS.FONT_B;
    printData += companyInfo.name + '\n';
    printData += ESC_POS_COMMANDS.BOLD_OFF;
  }
  
  // Ürün adı (varsa)
  if (materialName && showText) {
    printData += ESC_POS_COMMANDS.BOLD_ON;
    printData += ESC_POS_COMMANDS.FONT_B;
    // RAL kodu varsa ekle
    const ralCode = variant?.match(/RAL\s*(\d+)/i)?.[1] || variant?.match(/\b(\d{4})\b/)?.[1] || '';
    const displayName = ralCode 
      ? `${materialName} (RAL ${ralCode})`
      : variant 
        ? `${materialName} (${variant})`
        : materialName;
    // Maksimum karakter sayısı (etiket genişliğine göre)
    const maxChars = Math.floor(labelWidth / 2);
    const finalName = displayName.length > maxChars 
      ? displayName.substring(0, maxChars - 3) + '...' 
      : displayName;
    printData += finalName + '\n';
    printData += ESC_POS_COMMANDS.BOLD_OFF;
  }
  
  // Üretim tarihi (varsa)
  if (productionDate && showText) {
    printData += ESC_POS_COMMANDS.FONT_A;
    const d = new Date(productionDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    printData += `ÜRETİM TARİHİ: ${day}.${month}.${year}\n`;
  }
  
  // SKU (varsa)
  if (sku && showText) {
    printData += ESC_POS_COMMANDS.FONT_A;
    printData += `ÜRÜN KODU: ${sku}\n`;
  }
  
  // Etiket seri no
  if (showText) {
    printData += ESC_POS_COMMANDS.FONT_A;
    printData += `ETİKET SERİ NO: ${barcode}\n`;
  }
  
  // Barkod
  printData += '\n';
  printData += ESC_POS_COMMANDS.ALIGN_CENTER;
  if (barcodeType === 'code128') {
    printData += generateCode128(barcode);
  } else {
    printData += generateCode39(barcode);
  }
  printData += '\n';
  
  // İletişim bilgileri (varsa)
  if ((companyInfo?.website || companyInfo?.email) && showText) {
    printData += ESC_POS_COMMANDS.ALIGN_LEFT;
    printData += ESC_POS_COMMANDS.FONT_A;
    printData += '\n';
    if (companyInfo.website) {
      printData += companyInfo.website + '\n';
    }
    if (companyInfo.email) {
      printData += companyInfo.email + '\n';
    }
  }
  
  // Boş satır ve kesme
  printData += ESC_POS_COMMANDS.FEED;
  printData += ESC_POS_COMMANDS.CUT;

  // Yazıcıya gönder
  if (printerType === 'network' && options?.ipAddress) {
    await sendToNetworkPrinter(options.ipAddress, options.port || 9100, printData);
  } else {
    // USB/Serial için port seçimi
    const port = await connectSerialPrinter();
    if (port) {
      await sendToSerialPrinter(port, printData);
      // Port'u kapat
      await port.close();
    }
  }
};

/**
 * Tarayıcı yazdırma API'si ile yazdır (görseldeki formatta)
 */
export const printBarcodeViaBrowser = async (
  barcode: string, 
  materialName?: string, 
  sku?: string,
  variant?: string,
  productionDate?: Date,
  companyInfo?: {
    name?: string;
    logoUrl?: string;
    companyCode?: string;
    website?: string;
    email?: string;
  }
): Promise<void> => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up engelleyici nedeniyle yazdırma penceresi açılamadı.');
    return;
  }

  // Logo base64'e çevir (CORS sorununu çözmek için)
  let logoBase64 = '';
  if (companyInfo?.logoUrl) {
    try {
      const response = await fetch(companyInfo.logoUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      logoBase64 = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Logo yüklenirken hata:', error);
    }
  }

  const formatDate = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // RAL kodu variant'tan çıkar (örn: "RAL 7004" veya "7004")
  const ralCode = variant?.match(/RAL\s*(\d+)/i)?.[1] || variant?.match(/\b(\d{4})\b/)?.[1] || '';

  // QR verisi: Modal'daki QR ile aynı olmalı (barcode-scanner deep link)
  const origin = window.location.origin;
  const cc = companyInfo?.companyCode ? String(companyInfo.companyCode) : '';
  const qrData = `${origin}/barcode-scanner?companyCode=${encodeURIComponent(cc)}&barcode=${encodeURIComponent(barcode)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barkod Etiketi</title>
      <style>
        @media print {
          @page {
            size: 100mm 60mm;
            margin: 0;
          }
          html, body {
            width: 100mm;
            height: 60mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          .label-container {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          font-size: 9px;
          background: white;
          width: 100mm;
          height: 60mm;
          overflow: hidden;
        }
        body {
          padding: 4mm;
        }
        .label-container {
          display: flex;
          flex-direction: column;
          width: calc(100mm - 8mm);
          height: calc(60mm - 8mm);
          border: 1px solid #000;
          padding: 3mm;
          overflow: hidden;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #000;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .logo {
          max-width: 35px;
          max-height: 35px;
          object-fit: contain;
        }
        .company-name {
          font-size: 10px;
          font-weight: bold;
          color: #000;
          text-transform: uppercase;
        }
        .product-section {
          flex: 1;
          margin-bottom: 3mm;
        }
        .product-name {
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 2mm;
          line-height: 1.2;
          text-transform: uppercase;
        }
        .product-code {
          font-size: 9px;
          margin-bottom: 1mm;
          font-weight: 600;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          margin-bottom: 1mm;
        }
        .info-label {
          font-weight: bold;
        }
        .barcode-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 3mm;
          padding-top: 3mm;
          border-top: 1px solid #000;
        }
        .barcode-left {
          flex: 1;
        }
        .serial-number {
          font-size: 9px;
          font-weight: bold;
          font-family: monospace;
          margin-bottom: 2mm;
        }
        .barcode-svg {
          margin: 2mm 0;
        }
        .barcode-right {
          margin-left: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .qr-code {
          width: 40px;
          height: 40px;
        }
        .footer {
          margin-top: 3mm;
          padding-top: 2mm;
          border-top: 1px solid #000;
          font-size: 7px;
          text-align: center;
          color: #333;
        }
        .footer div {
          margin: 1px 0;
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
    </head>
    <body>
      <div class="label-container">
        <!-- Header: Logo ve Şirket Adı -->
        <div class="header">
          <div class="logo-section">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : ''}
            <div class="company-name">${companyInfo?.name || 'ŞİRKET ADI'}</div>
          </div>
        </div>

        <!-- Ürün Bilgileri -->
        <div class="product-section">
          <div class="product-name">
            ${materialName || 'ÜRÜN ADI'}${ralCode ? ` (RAL ${ralCode})` : variant ? ` (${variant})` : ''}
          </div>
          ${sku ? `<div class="product-code"><strong>ÜRÜN KODU:</strong> ${sku}</div>` : ''}
          ${productionDate ? `<div class="info-row"><span class="info-label">ÜRETİM TARİHİ:</span> <span>${formatDate(productionDate)}</span></div>` : ''}
        </div>

        <!-- Barkod ve QR Kod -->
        <div class="barcode-section">
          <div class="barcode-left">
            <div class="serial-number">ETİKET SERİ NO: ${barcode}</div>
            <svg id="barcode" class="barcode-svg"></svg>
          </div>
          <div class="barcode-right">
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${encodeURIComponent(qrData)}" 
              alt="QR Code" 
              class="qr-code"
            />
          </div>
        </div>

        <!-- Footer: İletişim Bilgileri -->
        ${(companyInfo?.website || companyInfo?.email) ? `
        <div class="footer">
          ${companyInfo.website ? `<div>${companyInfo.website}</div>` : ''}
          ${companyInfo.email ? `<div>${companyInfo.email}</div>` : ''}
        </div>
        ` : ''}
      </div>
      <script>
        JsBarcode("#barcode", "${barcode}", {
          format: "CODE128",
          width: 1.5,
          height: 30,
          displayValue: true,
          fontSize: 10,
          margin: 0
        });
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Yazıcı bağlantısını test et
 */
export const testPrinterConnection = async (
  printerType: 'usb' | 'serial' | 'network',
  ipAddress?: string,
  port?: number
): Promise<boolean> => {
  try {
    if (printerType === 'network' && ipAddress) {
      // Network yazıcı testi
      const testData = ESC_POS_COMMANDS.INIT + 'Yazici Test\n' + ESC_POS_COMMANDS.FEED + ESC_POS_COMMANDS.CUT;
      await sendToNetworkPrinter(ipAddress, port || 9100, testData);
      return true;
    } else {
      // USB/Serial yazıcı testi
      const testPort = await connectSerialPrinter();
      if (testPort) {
        const testData = ESC_POS_COMMANDS.INIT + 'Yazici Test\n' + ESC_POS_COMMANDS.FEED + ESC_POS_COMMANDS.CUT;
        await sendToSerialPrinter(testPort, testData);
        await testPort.close();
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Yazıcı test hatası:', error);
    return false;
  }
};


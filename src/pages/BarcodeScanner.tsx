import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getStockEntryByBarcode, getAllStockStatus } from '../services/stockService';
import { getCurrentCompany } from '../utils/getCurrentCompany';
import { getCurrentUser } from '../utils/getCurrentUser';
import { getCompanyByCode, getCompanyById } from '../services/companyService';
import { QrCode, Search, Package, Warehouse, Calendar, DollarSign, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { formatDate } from '../utils/formatDate';
import { registerPdfFonts } from '../utils/pdfEdocs';

export default function BarcodeScanner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [barcode, setBarcode] = useState(searchParams.get('barcode') || '');
  const [stockEntry, setStockEntry] = useState<any>(null);
  const [stockStatus, setStockStatus] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null);
  const [resolvedCompanyCode, setResolvedCompanyCode] = useState<string | null>(searchParams.get('companyCode') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const company = getCurrentCompany();
  const currentUser = getCurrentUser();
  const hasBarcodeInUrl = !!searchParams.get('barcode');

  // URL'den companyCode geldiğinde şirketi çöz (public kullanım için)
  useEffect(() => {
    const urlCompanyCode = searchParams.get('companyCode') || null;
    if (urlCompanyCode !== resolvedCompanyCode) {
      setResolvedCompanyCode(urlCompanyCode);
    }
  }, [searchParams]);

  useEffect(() => {
    const urlCompanyCode = searchParams.get('companyCode');

    const resolveCompany = async () => {
      // 1) URL companyCode varsa: public akış
      if (urlCompanyCode) {
        const c = await getCompanyByCode(urlCompanyCode);
        if (c?.id) {
          setResolvedCompanyId(c.id);
          setCompanyData(c);
          return;
        }
      }

      // 2) Login/company context varsa: internal akış
      if (company?.companyId) {
        setResolvedCompanyId(company.companyId);
        try {
          const c = await getCompanyById(company.companyId);
          setCompanyData(c);
        } catch {
          // ignore
        }
        return;
      }

      setResolvedCompanyId(null);
    };

    resolveCompany();
  }, [searchParams, company?.companyId]);

  // URL'den barcode geldiğinde otomatik fiş oluştur (ilk açılış dahil)
  useEffect(() => {
    const urlBarcode = searchParams.get('barcode');
    if (!urlBarcode) return;

    // input'u senkronla
    if (urlBarcode !== barcode) {
      setBarcode(urlBarcode);
    }

    // şirket çözülmeden arama yapma
    if (!resolvedCompanyId) return;

    // aynı barkod için tekrar sorgu yapma
    if (stockEntry?.barcode === urlBarcode) return;

    const performSearch = async () => {
      setLoading(true);
      setError('');
      setStockEntry(null);
      setStockStatus(null);

      try {
        const entry = await getStockEntryByBarcode(urlBarcode.trim(), resolvedCompanyId);
        if (!entry) {
          setError('Bu barkod ile kayıtlı ürün bulunamadı');
          return;
        }

        setStockEntry(entry);

        const statuses = await getAllStockStatus(resolvedCompanyId, entry.warehouse);
        const status = statuses.find(
          (s: any) => s.materialName === entry.materialName && s.warehouse === entry.warehouse
        );
        setStockStatus(status);
      } catch (err: any) {
        setError('Arama sırasında hata oluştu: ' + (err.message || err));
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchParams, resolvedCompanyId, barcode, stockEntry?.barcode]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSearch = async () => {
    if (!barcode.trim()) {
      setError('Lütfen barkod numarası girin');
      return;
    }

    const companyIdToUse = resolvedCompanyId || company?.companyId;
    if (!companyIdToUse) {
      setError('Şirket bilgisi bulunamadı. QR linki companyCode içermeli.');
      return;
    }

    setLoading(true);
    setError('');
    setStockEntry(null);
    setStockStatus(null);

    try {
      // Barkod ile stok girişi bul
      const entry = await getStockEntryByBarcode(barcode.trim(), companyIdToUse);
      
      if (!entry) {
        setError('Bu barkod ile kayıtlı ürün bulunamadı');
        setLoading(false);
        return;
      }

      setStockEntry(entry);

      // Stok durumunu getir
      const statuses = await getAllStockStatus(companyIdToUse, entry.warehouse);
      const status = statuses.find(
        (s: any) => s.materialName === entry.materialName && s.warehouse === entry.warehouse
      );
      setStockStatus(status);

      // Şirket bilgilerini getir (logo için)
      if (!companyData && companyIdToUse) {
        try {
          const companyInfo = await getCompanyById(companyIdToUse);
          setCompanyData(companyInfo);
        } catch {
          // ignore
        }
      }

      // URL'i güncelle
      const companyCodeToUse = resolvedCompanyCode || company?.companyCode || '';
      setSearchParams({ companyCode: companyCodeToUse, barcode: barcode.trim() });
    } catch (err: any) {
      setError('Arama sırasında hata oluştu: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDownloadPDF = () => {
    if (!stockEntry) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true,
      floatPrecision: 16
    });
    // Türkçe karakterler için fontları kaydet
    registerPdfFonts(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Logo ve başlık
    if (companyData?.logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = companyData.logoUrl;
        img.onload = () => {
          const logoWidth = 40;
          const logoHeight = (img.height / img.width) * logoWidth;
          doc.addImage(img, 'PNG', (pageWidth - logoWidth) / 2, yPos, logoWidth, logoHeight);
          yPos += logoHeight + 10;
          addTextToPDF();
        };
        img.onerror = () => {
          addTextToPDF();
        };
      } catch {
        addTextToPDF();
      }
    } else {
      addTextToPDF();
    }

    function addTextToPDF() {
      let y = yPos;
      
      // Şirket adı (Türkçe font)
      doc.setFontSize(20);
      doc.setFont('NotoSans', 'bold');
      doc.text(companyData?.name || currentUser?.companyName || 'ŞİRKET ADI', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Başlık
      doc.setFontSize(12);
      doc.setFont('NotoSans', 'normal');
      doc.text('ÜRÜN STOK BİLGİSİ', pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Barkod
      doc.setFontSize(10);
      doc.text('BARKOD', pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(18);
      doc.setFont('courier', 'bold');
      doc.text(stockEntry.barcode || '', pageWidth / 2, y, { align: 'center' });
      y += 15;

      // Giriş miktarı (adet)
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.text('GİRİŞ MİKTARI', 20, y);
      y += 6;
      doc.setFontSize(16);
      doc.setFont('NotoSans', 'bold');
      const qtyText = `${Number(stockEntry.quantity ?? 0).toFixed(2)} ${stockEntry.unit || ''}`.trim();
      doc.text(qtyText, 20, y);
      y += 12;

      // Ürün bilgileri
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.text('ÜRÜN ADI', 20, y);
      y += 5;
      doc.setFontSize(14);
      doc.setFont('NotoSans', 'bold');
      doc.text(stockEntry.materialName || '', 20, y);
      y += 10;

      if (stockEntry.sku) {
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text('SKU', 20, y);
        y += 5;
        doc.setFontSize(12);
        doc.setFont('courier', 'normal');
        doc.text(stockEntry.sku, 20, y);
        y += 10;
      }

      // Grid bilgileri
      const leftX = 20;
      const rightX = pageWidth - 20;
      let currentY = y;

      if (stockEntry.category) {
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.text('KATEGORİ', leftX, currentY);
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text(stockEntry.category, leftX, currentY + 5);
      }

      if (stockEntry.variant) {
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.text('VARYANT', rightX, currentY, { align: 'right' });
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text(stockEntry.variant, rightX, currentY + 5, { align: 'right' });
      }

      currentY += 12;

      doc.setFontSize(8);
      doc.setFont('NotoSans', 'normal');
      doc.text('BİRİM', leftX, currentY);
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.text(stockEntry.unit || '', leftX, currentY + 5);

      if (stockEntry.warehouse) {
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.text('DEPO', rightX, currentY, { align: 'right' });
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text(stockEntry.warehouse, rightX, currentY + 5, { align: 'right' });
      }

      currentY += 12;

      if (stockEntry.binCode) {
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.text('RAF/GÖZ', leftX, currentY);
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text(stockEntry.binCode, leftX, currentY + 5);
        currentY += 12;
      }

      doc.setFontSize(8);
      doc.setFont('NotoSans', 'normal');
      doc.text('GİRİŞ TARİHİ', leftX, currentY);
      doc.setFontSize(10);
      doc.setFont('NotoSans', 'normal');
      doc.text(formatDate(stockEntry.arrivalDate), leftX, currentY + 5);

      if (stockEntry.supplier) {
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.text('TEDARİKÇİ', rightX, currentY, { align: 'right' });
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text(stockEntry.supplier, rightX, currentY + 5, { align: 'right' });
      }

      currentY += 12;

      if (stockEntry.unitPrice && stockEntry.unitPrice > 0) {
        currentY += 5;
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.text('BİRİM FİYAT', pageWidth / 2, currentY, { align: 'center' });
        currentY += 5;
        doc.setFontSize(16);
        doc.setFont('NotoSans', 'bold');
        doc.text(`${stockEntry.unitPrice.toFixed(2)} ₺`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;
      }

      if (stockEntry.note) {
        currentY += 5;
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.text('NOT', 20, currentY);
        currentY += 5;
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        const splitNote = doc.splitTextToSize(stockEntry.note, pageWidth - 40);
        doc.text(splitNote, 20, currentY);
        currentY += splitNote.length * 5;
      }

      // Stok durumu
      if (stockStatus) {
        currentY += 10;
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text('STOK DURUMU', pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;
        doc.setFontSize(20);
        doc.setFont('NotoSans', 'bold');
        doc.text(`${stockStatus.currentStock.toFixed(2)} ${stockStatus.unit}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        const statusText = stockStatus.status === 'green' ? '✅ Yeterli Stok' :
                          stockStatus.status === 'orange' ? '⚠️ Dikkat' : '🔴 Kritik Seviye';
        doc.text(statusText, pageWidth / 2, currentY, { align: 'center' });
      }

      // Alt bilgi
      currentY = pageHeight - 20;
      doc.setFontSize(8);
      doc.setFont('NotoSans', 'normal');
      doc.text(new Date().toLocaleString('tr-TR'), pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;
      const cc = resolvedCompanyCode || company?.companyCode || '';
      doc.text(`${window.location.origin}/barcode-scanner?companyCode=${encodeURIComponent(cc)}&barcode=${stockEntry.barcode}`, pageWidth / 2, currentY, { align: 'center' });

      // PDF'i kaydet
      doc.save(`barkod-${stockEntry.barcode}-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  // Eğer barkod varsa ve ürün bulunduysa, sadece fiş göster (Layout olmadan)
  const showReceipt = stockEntry && barcode;

  // QR ile gelindiyse sorgulama ekranını hiç gösterme (beyaz loading ekranı)
  if (hasBarcodeInUrl && !showReceipt) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        <div style={{ padding: '24px', fontSize: '14px', color: '#666' }}>
          {error ? error : (loading ? 'Yükleniyor...' : '')}
        </div>
      </div>
    );
  }

  // Sadece fiş gösteriliyorsa Layout kullanma
  if (showReceipt) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#f5f5f5', 
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          {/* Ürün Fişi - Fiş Formatında */}
          <div style={{
            background: '#fff',
            border: '3px solid #000',
            padding: '0',
            borderRadius: '0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '100%'
          }}>
            {/* Fiş Başlığı */}
            <div style={{
              background: '#000',
              color: '#fff',
              padding: '20px',
              textAlign: 'center',
              borderBottom: '3px solid #000'
            }}>
              {companyData?.logoUrl && (
                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={companyData.logoUrl}
                    alt={`${companyData.name} Logo`}
                    style={{
                      maxWidth: '120px',
                      maxHeight: '60px',
                      objectFit: 'contain',
                      background: '#fff',
                      padding: '8px',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              )}
              <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
                {companyData?.name || currentUser?.companyName || 'ŞİRKET ADI'}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                ÜRÜN STOK BİLGİSİ
              </div>
            </div>

            {/* Fiş İçeriği */}
            <div style={{ padding: '24px' }}>
              {/* Barkod - Büyük ve Öne Çıkan */}
              <div style={{
                textAlign: 'center',
                padding: '20px',
                background: '#f8f9fa',
                border: '2px dashed #000',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  BARKOD
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px' }}>
                  {stockEntry.barcode}
                </div>
              </div>

              {/* Giriş Miktarı (Adet) */}
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: '#fff',
                border: '2px solid #000',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  GİRİŞ MİKTARI
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800 }}>
                  {Number(stockEntry.quantity ?? 0).toFixed(2)} {stockEntry.unit}
                </div>
              </div>

              {/* Ürün Bilgileri - Fiş Formatında */}
              <div style={{
                borderTop: '2px dashed #ccc',
                borderBottom: '2px dashed #ccc',
                padding: '20px 0',
                marginBottom: '20px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                    ÜRÜN ADI
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: '1.4' }}>
                    {stockEntry.materialName}
                  </div>
                </div>

                {stockEntry.sku && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      SKU
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'monospace' }}>
                      {stockEntry.sku}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {stockEntry.category && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                        KATEGORİ
                      </div>
                      <div style={{ fontSize: '14px' }}>{stockEntry.category}</div>
                    </div>
                  )}
                  {stockEntry.variant && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                        VARYANT
                      </div>
                      <div style={{ fontSize: '14px' }}>{stockEntry.variant}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      BİRİM
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{stockEntry.unit}</div>
                  </div>
                  {stockEntry.warehouse && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                        DEPO
                      </div>
                      <div style={{ fontSize: '14px' }}>{stockEntry.warehouse}</div>
                    </div>
                  )}
                </div>

                {stockEntry.binCode && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      RAF/GÖZ
                    </div>
                    <div style={{ fontSize: '14px' }}>{stockEntry.binCode}</div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      GİRİŞ TARİHİ
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      {formatDate(stockEntry.arrivalDate)}
                    </div>
                  </div>
                  {stockEntry.supplier && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                        TEDARİKÇİ
                      </div>
                      <div style={{ fontSize: '14px' }}>{stockEntry.supplier}</div>
                    </div>
                  )}
                </div>

                {stockEntry.unitPrice && stockEntry.unitPrice > 0 && (
                  <div style={{
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      BİRİM FİYAT
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {stockEntry.unitPrice.toFixed(2)} ₺
                    </div>
                  </div>
                )}
              </div>

              {stockEntry.note && (
                <div style={{
                  padding: '12px',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                    NOT
                  </div>
                  <div style={{ fontSize: '13px' }}>{stockEntry.note}</div>
                </div>
              )}

              {/* Stok Durumu - Fiş Altında */}
              {stockStatus && (
                <div style={{
                  borderTop: '2px dashed #ccc',
                  paddingTop: '20px',
                  marginTop: '20px'
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px', textTransform: 'uppercase', textAlign: 'center' }}>
                    STOK DURUMU
                  </div>
                  <div style={{
                    padding: '16px',
                    background: stockStatus.status === 'green' ? '#e8f5e9' : stockStatus.status === 'orange' ? '#fff3e0' : '#ffebee',
                    border: `2px solid ${stockStatus.status === 'green' ? '#4caf50' : stockStatus.status === 'orange' ? '#ff9800' : '#f44336'}`,
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>
                      MEVCUT STOK
                    </div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: 700,
                      color: stockStatus.status === 'green' ? '#2e7d32' : stockStatus.status === 'orange' ? '#e65100' : '#c62828',
                      marginBottom: '4px'
                    }}>
                      {stockStatus.currentStock.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{stockStatus.unit}</div>
                    <div style={{
                      fontSize: '11px',
                      marginTop: '8px',
                      fontWeight: 600,
                      color: stockStatus.status === 'green' ? '#2e7d32' : stockStatus.status === 'orange' ? '#e65100' : '#c62828'
                    }}>
                      {stockStatus.status === 'green' ? '✅ Yeterli Stok' :
                       stockStatus.status === 'orange' ? '⚠️ Dikkat' :
                       '🔴 Kritik Seviye'}
                    </div>
                  </div>
                </div>
              )}

              {/* Fiş Alt Bilgi */}
              <div style={{
                borderTop: '2px dashed #ccc',
                paddingTop: '16px',
                marginTop: '20px',
                textAlign: 'center',
                fontSize: '10px',
                color: '#999'
              }}>
                <div>{new Date().toLocaleString('tr-TR')}</div>
                <div style={{ marginTop: '4px' }}>
                  {window.location.origin}/barcode-scanner?companyCode={encodeURIComponent(resolvedCompanyCode || company?.companyCode || '')}&barcode={stockEntry.barcode}
                </div>
              </div>

              {/* PDF İndir Butonu */}
              <div style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleDownloadPDF}
                  style={{
                    padding: '12px 24px',
                    background: '#000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Download size={18} />
                  PDF Olarak İndir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Arama sayfası (Layout ile)
  return (
    <Layout>
      <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
          <QrCode size={32} />
          <h1 style={{ fontSize: '32px', fontWeight: 700 }}>Barkod / QR Kod Okuma</h1>
        </div>

        {/* Arama Kutusu */}
        <div style={{ 
          background: '#fff', 
          border: '2px solid #000', 
          padding: '20px', 
          marginBottom: '20px',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Barkod numarasını girin veya QR kod okutun"
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #000',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn btn-primary"
              style={{ 
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px'
              }}
            >
              <Search size={20} />
              {loading ? 'Aranıyor...' : 'Ara'}
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            💡 Telefonunuzun kamerası ile QR kod okutabilir veya barkod numarasını manuel girebilirsiniz
          </div>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div style={{
            background: '#fee',
            border: '2px solid #f00',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

        {/* Ürün Fişi - Fiş Formatında */}
        {stockEntry && (
          <div style={{
            background: '#fff',
            border: '3px solid #000',
            padding: '0',
            borderRadius: '0',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: '100%'
          }}>
            {/* Fiş Başlığı */}
            <div style={{
              background: '#000',
              color: '#fff',
              padding: '20px',
              textAlign: 'center',
              borderBottom: '3px solid #000'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
                {currentUser?.companyName || 'ŞİRKET ADI'}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                ÜRÜN STOK BİLGİSİ
              </div>
            </div>

            {/* Fiş İçeriği */}
            <div style={{ padding: '24px' }}>

              {/* Barkod - Büyük ve Öne Çıkan */}
              <div style={{
                textAlign: 'center',
                padding: '20px',
                background: '#f8f9fa',
                border: '2px dashed #000',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  BARKOD
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px' }}>
                  {stockEntry.barcode}
                </div>
              </div>

              {/* Ürün Bilgileri - Fiş Formatında */}
              <div style={{
                borderTop: '2px dashed #ccc',
                borderBottom: '2px dashed #ccc',
                padding: '20px 0',
                marginBottom: '20px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                    ÜRÜN ADI
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: '1.4' }}>
                    {stockEntry.materialName}
                  </div>
                </div>

                {stockEntry.sku && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      SKU
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'monospace' }}>
                      {stockEntry.sku}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {stockEntry.category && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                        KATEGORİ
                      </div>
                      <div style={{ fontSize: '14px' }}>{stockEntry.category}</div>
                    </div>
                  )}
                  {stockEntry.variant && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                        VARYANT
                      </div>
                      <div style={{ fontSize: '14px' }}>{stockEntry.variant}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      BİRİM
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{stockEntry.unit}</div>
                  </div>
                  {stockEntry.warehouse && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                        DEPO
                      </div>
                      <div style={{ fontSize: '14px' }}>{stockEntry.warehouse}</div>
                    </div>
                  )}
                </div>

                {stockEntry.binCode && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      RAF/GÖZ
                    </div>
                    <div style={{ fontSize: '14px' }}>{stockEntry.binCode}</div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      GİRİŞ TARİHİ
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      {new Date(stockEntry.arrivalDate).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  {stockEntry.supplier && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                        TEDARİKÇİ
                      </div>
                      <div style={{ fontSize: '14px' }}>{stockEntry.supplier}</div>
                    </div>
                  )}
                </div>

                {stockEntry.unitPrice && stockEntry.unitPrice > 0 && (
                  <div style={{
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                      BİRİM FİYAT
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {stockEntry.unitPrice.toFixed(2)} ₺
                    </div>
                  </div>
                )}
              </div>

              {stockEntry.note && (
                <div style={{
                  padding: '12px',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>
                    NOT
                  </div>
                  <div style={{ fontSize: '13px' }}>{stockEntry.note}</div>
                </div>
              )}

              {/* Stok Durumu - Fiş Altında */}
              {stockStatus && (
                <div style={{
                  borderTop: '2px dashed #ccc',
                  paddingTop: '20px',
                  marginTop: '20px'
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px', textTransform: 'uppercase', textAlign: 'center' }}>
                    STOK DURUMU
                  </div>
                  <div style={{
                    padding: '16px',
                    background: stockStatus.status === 'green' ? '#e8f5e9' : stockStatus.status === 'orange' ? '#fff3e0' : '#ffebee',
                    border: `2px solid ${stockStatus.status === 'green' ? '#4caf50' : stockStatus.status === 'orange' ? '#ff9800' : '#f44336'}`,
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>
                      MEVCUT STOK
                    </div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: 700,
                      color: stockStatus.status === 'green' ? '#2e7d32' : stockStatus.status === 'orange' ? '#e65100' : '#c62828',
                      marginBottom: '4px'
                    }}>
                      {stockStatus.currentStock.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{stockStatus.unit}</div>
                    <div style={{
                      fontSize: '11px',
                      marginTop: '8px',
                      fontWeight: 600,
                      color: stockStatus.status === 'green' ? '#2e7d32' : stockStatus.status === 'orange' ? '#e65100' : '#c62828'
                    }}>
                      {stockStatus.status === 'green' ? '✅ Yeterli Stok' :
                       stockStatus.status === 'orange' ? '⚠️ Dikkat' :
                       '🔴 Kritik Seviye'}
                    </div>
                  </div>
                </div>
              )}

              {/* Fiş Alt Bilgi */}
              <div style={{
                borderTop: '2px dashed #ccc',
                paddingTop: '16px',
                marginTop: '20px',
                textAlign: 'center',
                fontSize: '10px',
                color: '#999'
              }}>
                <div>{new Date().toLocaleString('tr-TR')}</div>
                <div style={{ marginTop: '4px' }}>
                  {window.location.origin}/barcode-scanner?barcode={stockEntry.barcode}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}


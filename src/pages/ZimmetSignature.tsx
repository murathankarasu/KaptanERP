import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import SignatureCanvas from 'react-signature-canvas';
import { Download, Save, ArrowLeft } from 'lucide-react';

interface ZimmetData {
  employee: string;
  department: string;
  materialName: string;
  quantity: number;
  issueDate: Date;
  returnDate?: string;
  employeeSignature?: string;
  authorizedSignature?: string;
}

export default function ZimmetSignature() {
  const { outputId } = useParams<{ outputId: string }>();
  const navigate = useNavigate();
  const [zimmetData, setZimmetData] = useState<ZimmetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeSigPad, setEmployeeSigPad] = useState<SignatureCanvas | null>(null);
  const [authorizedSigPad, setAuthorizedSigPad] = useState<SignatureCanvas | null>(null);
  const [returnDate, setReturnDate] = useState('');

  useEffect(() => {
    loadZimmetData();
  }, [outputId]);

  const loadZimmetData = async () => {
    try {
      if (!outputId) return;

      const outputRef = doc(db, 'stockOutputs', outputId);
      const outputSnap = await getDoc(outputRef);

      if (outputSnap.exists()) {
        const data = outputSnap.data();
        const issueDate =
          data.issueDate?.toDate?.() ? data.issueDate.toDate() : new Date(data.issueDate);
        setZimmetData({
          employee: data.employee,
          department: data.department,
          materialName: data.materialName,
          quantity: data.quantity,
          issueDate,
          returnDate: data.returnDate || '',
          employeeSignature: data.employeeSignature || '',
          authorizedSignature: data.authorizedSignature || ''
        });
        setReturnDate(data.returnDate || '');
      }
    } catch (error) {
      console.error('Zimmet verisi yüklenirken hata:', error);
      alert('Veri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!outputId || !employeeSigPad || !authorizedSigPad) {
        alert('Lütfen her iki imzayı da tamamlayın');
        return;
      }

      const employeeSignature = employeeSigPad.toDataURL();
      const authorizedSignature = authorizedSigPad.toDataURL();

      if (employeeSignature === employeeSigPad.toDataURL('image/png') && 
          employeeSigPad.isEmpty()) {
        alert('Lütfen personel imzasını ekleyin');
        return;
      }

      if (authorizedSignature === authorizedSigPad.toDataURL('image/png') && 
          authorizedSigPad.isEmpty()) {
        alert('Lütfen yetkili imzasını ekleyin');
        return;
      }

      const outputRef = doc(db, 'stockOutputs', outputId);
      await updateDoc(outputRef, {
        employeeSignature,
        authorizedSignature,
        returnDate: returnDate || null
      });

      alert('İmzalar başarıyla kaydedildi!');
      navigate('/stock-output');
    } catch (error) {
      console.error('İmzalar kaydedilirken hata:', error);
      alert('İmzalar kaydedilirken bir hata oluştu');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const clearSignature = (type: 'employee' | 'authorized') => {
    if (type === 'employee' && employeeSigPad) {
      employeeSigPad.clear();
    } else if (type === 'authorized' && authorizedSigPad) {
      authorizedSigPad.clear();
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>
      </Layout>
    );
  }

  if (!zimmetData) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Zimmet verisi bulunamadı</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#000', letterSpacing: '-1px' }}>
            Zimmet İmza Sayfası
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/stock-output')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={18} />
              Geri
            </button>
            <button onClick={handlePrint} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} />
              Yazdır
            </button>
            <button onClick={handleSave} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} />
              Kaydet
            </button>
          </div>
        </div>

        {/* A4 Formatında Zimmet Formu */}
        <div 
          id="zimmet-form"
          style={{
            background: 'white',
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            padding: '20mm',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            fontSize: '14px',
            lineHeight: '1.6'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '15px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>ZİMMET TUTANAĞI</h2>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #333', fontWeight: '600', width: '30%' }}>Personel Adı:</td>
                <td style={{ padding: '8px', border: '1px solid #333' }}>{zimmetData.employee}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #333', fontWeight: '600' }}>Departman:</td>
                <td style={{ padding: '8px', border: '1px solid #333' }}>{zimmetData.department}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #333', fontWeight: '600' }}>Malzeme:</td>
                <td style={{ padding: '8px', border: '1px solid #333' }}>{zimmetData.materialName}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #333', fontWeight: '600' }}>Miktar:</td>
                <td style={{ padding: '8px', border: '1px solid #333' }}>{zimmetData.quantity}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #333', fontWeight: '600' }}>Veriliş Tarihi:</td>
                <td style={{ padding: '8px', border: '1px solid #333' }}>
                  {zimmetData.issueDate.toLocaleDateString('tr-TR')}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', border: '1px solid #333', fontWeight: '600' }}>İade Tarihi:</td>
                <td style={{ padding: '8px', border: '1px solid #333' }}>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '40px' }}>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>Personel İmzası:</h3>
              <div style={{ 
                border: '2px solid #333', 
                borderRadius: '4px',
                background: '#f9f9f9',
                marginBottom: '10px'
              }}>
                {zimmetData.employeeSignature ? (
                  <img 
                    src={zimmetData.employeeSignature} 
                    alt="Personel İmzası" 
                    style={{ width: '100%', maxHeight: '150px', objectFit: 'contain' }}
                  />
                ) : (
                  <SignatureCanvas
                    ref={(ref) => setEmployeeSigPad(ref)}
                    canvasProps={{
                      width: 600,
                      height: 150,
                      className: 'signature-canvas'
                    }}
                    backgroundColor="#f9f9f9"
                  />
                )}
              </div>
              {!zimmetData.employeeSignature && (
                <button
                  onClick={() => clearSignature('employee')}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Temizle
                </button>
              )}
            </div>

            <div style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>Yetkili İmzası:</h3>
              <div style={{ 
                border: '2px solid #333', 
                borderRadius: '4px',
                background: '#f9f9f9',
                marginBottom: '10px'
              }}>
                {zimmetData.authorizedSignature ? (
                  <img 
                    src={zimmetData.authorizedSignature} 
                    alt="Yetkili İmzası" 
                    style={{ width: '100%', maxHeight: '150px', objectFit: 'contain' }}
                  />
                ) : (
                  <SignatureCanvas
                    ref={(ref) => setAuthorizedSigPad(ref)}
                    canvasProps={{
                      width: 600,
                      height: 150,
                      className: 'signature-canvas'
                    }}
                    backgroundColor="#f9f9f9"
                  />
                )}
              </div>
              {!zimmetData.authorizedSignature && (
                <button
                  onClick={() => clearSignature('authorized')}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Temizle
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '50px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
            <p>Bu belge elektronik ortamda oluşturulmuştur ve geçerlidir.</p>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #zimmet-form, #zimmet-form * {
              visibility: visible;
            }
            #zimmet-form {
              position: absolute;
              left: 0;
              top: 0;
              width: 210mm;
              box-shadow: none;
            }
            button {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}


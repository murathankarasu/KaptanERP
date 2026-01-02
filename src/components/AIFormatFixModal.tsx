import { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';

interface AIFormatFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (data: any[]) => void;
  aiFixedData: any[];
  originalErrors: string[];
}

export default function AIFormatFixModal({
  isOpen,
  onClose,
  onAccept,
  aiFixedData,
  originalErrors
}: AIFormatFixModalProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set(Array.from({ length: aiFixedData.length }, (_, i) => i)));

  if (!isOpen) return null;

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleAccept = () => {
    const acceptedData = aiFixedData.filter((_, index) => selectedRows.has(index));
    onAccept(acceptedData);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        border: '2px solid #000',
        borderRadius: '0',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '2px solid #000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'white',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={24} color="#000" />
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000', margin: 0 }}>
              AI Format Düzeltme
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={24} color="#000" />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px', padding: '16px', background: '#f5f5f5', border: '1px solid #000' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#000' }}>
              <strong>AI tarafından düzeltilmiş veriler:</strong> Lütfen düzeltmeleri kontrol edin ve onaylamak istediğiniz satırları seçin.
            </p>
            {originalErrors.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong style={{ fontSize: '12px' }}>Orijinal Hatalar:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '12px' }}>
                  {originalErrors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px', maxHeight: '400px', overflow: 'auto', border: '1px solid #000' }}>
            <table className="excel-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.size === aiFixedData.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(new Set(Array.from({ length: aiFixedData.length }, (_, i) => i)));
                        } else {
                          setSelectedRows(new Set());
                        }
                      }}
                    />
                  </th>
                  <th>Geliş Tarihi</th>
                  <th>Malzeme Adı</th>
                  <th>Kategori</th>
                  <th>Birim</th>
                  <th>Miktar</th>
                  <th>Birim Fiyat</th>
                  <th>Tedarikçi</th>
                </tr>
              </thead>
              <tbody>
                {aiFixedData.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => toggleRow(index)}
                      />
                    </td>
                    <td>{row.arrivalDate || row['Geliş Tarihi'] || '-'}</td>
                    <td>{row.materialName || row['Malzeme Adı'] || '-'}</td>
                    <td>{row.category || row['Kategori'] || '-'}</td>
                    <td>{row.unit || row['Birim'] || '-'}</td>
                    <td>{row.quantity || row['Gelen Miktar'] || '-'}</td>
                    <td>{row.unitPrice || row['Birim Fiyat'] || '-'}</td>
                    <td>{row.supplier || row['Tedarikçi'] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={onClose} className="btn btn-secondary">
              İptal
            </button>
            <button
              onClick={handleAccept}
              disabled={selectedRows.size === 0}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Check size={18} />
              Seçilenleri Kabul Et ({selectedRows.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


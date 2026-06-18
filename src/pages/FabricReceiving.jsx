import React, { useState } from 'react';
import { X, CornerDownLeft, Barcode, Palette, RotateCcw } from 'lucide-react';

const FabricReceiving = ({ selectedJob, onClose, onReceiveComplete }) => {
  const [returnType, setReturnType] = useState('barcode'); // barcode, shade, general
  const [barcodeId, setBarcodeId] = useState('');
  const [shadeName, setShadeName] = useState('');
  const [weight, setWeight] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Production Surplus');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse shades list from selectedJob
  const shades = selectedJob?.Shade ? selectedJob.Shade.split(',').map(s => s.trim()) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    if (returnType === 'barcode' && !barcodeId.trim()) {
      alert('Please enter or scan a barcode.');
      return;
    }
    if (returnType === 'shade' && !shadeName) {
      alert('Please select a shade.');
      return;
    }
    if ((returnType === 'barcode' || returnType === 'shade') && (!weight || parseFloat(weight) <= 0)) {
      alert('Please enter a valid weight.');
      return;
    }
    if (returnType === 'general') {
      if (!quantity || parseInt(quantity) <= 0) {
        alert('Please enter a valid quantity.');
        return;
      }
      if (!weight || parseFloat(weight) <= 0) {
        alert('Please enter a valid weight.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Create record representation to pass back
      let record = {
        lotNumber: selectedJob['Lot Number'],
        timestamp: new Date().toISOString(),
        reason
      };

      if (returnType === 'barcode') {
        record.barcodeId = barcodeId.trim();
        record.weight = parseFloat(weight);
        record.shade = shadeName || 'Surplus';
      } else if (returnType === 'shade') {
        record.shadeName = shadeName;
        record.returnWeight = parseFloat(weight);
      } else {
        record.totalQuantity = parseInt(quantity);
        record.totalWeight = parseFloat(weight);
      }

      // Trigger local complete handler
      onReceiveComplete(record);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to process return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="receiving-modal-overlay">
      <div className="receiving-modal-card">
        <div className="receiving-modal-header">
          <div className="title-block">
            <span className="header-icon">📥</span>
            <div>
              <h3>Receive Returned Fabric</h3>
              <p>Lot: {selectedJob['Lot Number']} · {selectedJob['Fabric']}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="receiving-modal-body">
          <div className="type-selector">
            <button
              type="button"
              className={`type-tab ${returnType === 'barcode' ? 'active' : ''}`}
              onClick={() => setReturnType('barcode')}
            >
              <Barcode size={16} />
              By Barcode
            </button>
            <button
              type="button"
              className={`type-tab ${returnType === 'shade' ? 'active' : ''}`}
              onClick={() => setReturnType('shade')}
            >
              <Palette size={16} />
              By Shade
            </button>
            <button
              type="button"
              className={`type-tab ${returnType === 'general' ? 'active' : ''}`}
              onClick={() => setReturnType('general')}
            >
              <RotateCcw size={16} />
              General Return
            </button>
          </div>

          <div className="form-fields">
            {returnType === 'barcode' && (
              <div className="form-group">
                <label>Barcode ID / Roll Number *</label>
                <input
                  type="text"
                  placeholder="Scan or enter Barcode ID"
                  value={barcodeId}
                  onChange={(e) => setBarcodeId(e.target.value)}
                  className="form-control"
                  autoFocus
                  required
                />
              </div>
            )}

            {returnType === 'shade' && (
              <div className="form-group">
                <label>Select Shade *</label>
                <select
                  value={shadeName}
                  onChange={(e) => setShadeName(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="">-- Choose Shade --</option>
                  {shades.map((shade, idx) => (
                    <option key={idx} value={shade}>{shade}</option>
                  ))}
                </select>
              </div>
            )}

            {returnType === 'general' && (
              <div className="form-row-two">
                <div className="form-group">
                  <label>Returned Quantity (Rolls) *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 2"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Total Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
              </div>
            )}

            {returnType !== 'general' && (
              <div className="form-group">
                <label>Returned Weight (kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Reason for Return</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="form-control"
              >
                <option value="Production Surplus">Production Surplus</option>
                <option value="Fabric Defect / Damage">Fabric Defect / Damage</option>
                <option value="Incorrect Shade / Specification">Incorrect Shade / Specification</option>
                <option value="Order Cancelled">Order Cancelled</option>
                <option value="Testing / Quality Check Return">Testing / Quality Check Return</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              <CornerDownLeft size={16} />
              {isSubmitting ? 'Recording...' : 'Record Return'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .receiving-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeInOverlay 0.2s ease-out;
        }

        .receiving-modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.8);
          animation: slideUpCard 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .receiving-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
        }

        .receiving-modal-header .title-block {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .receiving-modal-header .header-icon {
          font-size: 24px;
        }

        .receiving-modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
          font-weight: 700;
        }

        .receiving-modal-header p {
          margin: 2px 0 0 0;
          font-size: 13px;
          color: #64748b;
        }

        .receiving-modal-header .close-btn {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .receiving-modal-header .close-btn:hover {
          background: #e2e8f0;
          color: #334155;
        }

        .receiving-modal-body {
          padding: 24px;
        }

        .type-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 10px;
          margin-bottom: 24px;
        }

        .type-tab {
          border: none;
          background: transparent;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s;
        }

        .type-tab.active {
          background: #ffffff;
          color: #2563eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-row-two {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-fields label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
        }

        .form-fields .form-control {
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s;
          background-color: #ffffff;
        }

        .form-fields .form-control:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }

        .modal-actions button {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .modal-actions .btn-secondary {
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
        }

        .modal-actions .btn-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .modal-actions .btn-primary {
          border: none;
          background: #2563eb;
          color: #ffffff;
        }

        .modal-actions .btn-primary:hover {
          background: #1d4ed8;
        }

        .modal-actions .btn-primary:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }

        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUpCard {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default FabricReceiving;

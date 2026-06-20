import { useState, useEffect, useRef } from 'react';
import { store } from '../store.js';
import { Plus, Search, Edit, Trash2, Eye, Package, Filter, Download, QrCode, X, AlertTriangle, ArrowLeft, FileText } from 'lucide-react';
import JsBarcode from 'jsbarcode';


const CATEGORIES = ['Summer Fabric', 'Winter Fabric', 'Accessories'];
const SUB_CATS = {
  'Summer Fabric': ['Plain Cotton', 'Woven', 'Viscose Lining', 'Double Knit', 'Cotton Twill', 'Interlock'],
  'Winter Fabric': ['Rib Knit', 'Polar Fleece', 'Heavy Denim', 'Woolen'],
  'Accessories': ['Plastic Buttons', 'Metal Zippers', 'Threads', 'Labels', 'Elastic'],
};
const UNITS = ['Roll'];

function MaterialForm({ material, suppliers, onSave, onClose }) {
  const [form, setForm] = useState(material || {
    name: '',
    category: CATEGORIES[0],
    subCategory: SUB_CATS[CATEGORIES[0]][0],
    color: '',
    supplier: '',
    weight: '',
    rolls: '',
    unit: 'Roll',
    location: '',
    status: 'Active',
  });
  const isEdit = !!material?.id;
  const [shelves, setShelves] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([store.getShelves(), store.getRooms()])
      .then(([s, r]) => {
        setShelves(s || []);
        setRooms(r || []);
      })
      .catch(console.error);
  }, []);

  const reqRolls = parseInt(form.rolls) || 0;
  const targetRoom = rooms.find(r => r.category === form.category);
  const recommendedShelves = shelves
    .map(s => {
      const currentMatRolls = (isEdit && material?.location === s.id) ? (material.rolls || 0) : 0;
      const freeSpace = s.capacity - s.used + currentMatRolls;
      const roomMatch = targetRoom ? s.room === targetRoom.id : false;
      return { ...s, freeSpace, roomMatch };
    })
    .filter(s => s.freeSpace >= reqRolls)
    .sort((a, b) => {
      if (a.roomMatch !== b.roomMatch) {
        return a.roomMatch ? -1 : 1;
      }
      return a.freeSpace - b.freeSpace;
    });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError('');
    if (!form.name || !form.category || !form.supplier) {
      setError('Please fill required fields.');
      return;
    }
    const formattedForm = {
      ...form,
      weight: parseFloat(form.weight) || 0,
      rolls: parseInt(form.rolls) || 0,
      stockKg: parseFloat(form.weight) || 0
    };
    try {
      if (isEdit) {
        await store.updateMaterial(material.id, formattedForm);
      } else {
        await store.addMaterial(formattedForm);
      }
      onSave();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title"><Package size={18} /> {isEdit ? 'Edit Material' : 'Add New Material'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
          <div className="form-grid form-grid-3" style={{ gap: 16 }}>
            {isEdit && (
              <div className="form-group">
                <label className="form-label">Material Code</label>
                <input className="form-control" value={form.code || ''} disabled />
              </div>
            )}
            <div className="form-group" style={isEdit ? {} : { gridColumn: 'span 1' }}>
              <label className="form-label">Material Name <span className="required">*</span></label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cotton Fabric" />
            </div>
            <div className="form-group">
              <label className="form-label">Category <span className="required">*</span></label>
              <select className="form-control" value={form.category} onChange={e => { set('category', e.target.value); set('subCategory', SUB_CATS[e.target.value]?.[0] || ''); }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sub Category</label>
              <select className="form-control" value={form.subCategory} onChange={e => set('subCategory', e.target.value)}>
                {(SUB_CATS[form.category] || []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <input className="form-control" value={form.color} onChange={e => set('color', e.target.value)} placeholder="e.g. White, Blue" />
            </div>
            <div className="form-group">
              <label className="form-label">Supplier <span className="required">*</span></label>
              <select className="form-control" value={form.supplier} onChange={e => set('supplier', parseInt(e.target.value))}>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Weight (Kg)</label>
              <input className="form-control" type="number" value={form.weight} onChange={e => set('weight', parseFloat(e.target.value))} placeholder="e.g. 250" />
            </div>
            <div className="form-group">
              <label className="form-label">Roll Quantity</label>
              <input className="form-control" type="number" value={form.rolls} onChange={e => set('rolls', parseInt(e.target.value))} placeholder="e.g. 10" />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-control" value={form.unit} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Location</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="form-control"
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="e.g. A03-S02"
                  style={{ flex: 1 }}
                  id="material-location-input"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  id="recommend-location-btn"
                >
                  💡 Recommend Space
                </button>
              </div>

              {showRecommendations && (
                <div
                  className="recommendations-container"
                  style={{
                    marginTop: 10,
                    padding: 16,
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                    Recommended Shelves for {reqRolls} Rolls ({form.category})
                  </div>
                  {recommendedShelves.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      No available shelves found that can fit {reqRolls} rolls in {form.category}.
                    </div>
                  ) : (
                    <div className="recommendations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 10 }}>
                      {recommendedShelves.slice(0, 6).map(shelf => (
                        <div
                          key={shelf.id}
                          onClick={() => { set('location', shelf.id); setShowRecommendations(false); }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: `1.5px solid ${form.location === shelf.id ? 'var(--primary)' : 'var(--border)'}`,
                            background: form.location === shelf.id ? 'var(--primary-light)' : 'var(--surface)',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}
                          className="shelf-rec-card"
                          id={`rec-shelf-${shelf.id}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{shelf.id}</span>
                            <span className={`badge ${shelf.roomMatch ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                              {shelf.roomMatch ? 'Category Room' : 'Other Room'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            Free: <strong style={{ color: 'var(--success)' }}>{shelf.freeSpace}</strong> / {shelf.capacity} Rolls
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Active</option>
                <option>Low Stock</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" id="save-material-btn" onClick={handleSave}>{isEdit ? 'Update Material' : 'Add Material'}</button>
        </div>
      </div>
    </div>
  );
}

const printDirectly = (type, data) => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'auth',
        token: 'fabric-print-secret-key-2024'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.type === 'auth_success') {
          ws.send(JSON.stringify({
            type: type,
            data: data
          }));
        } else if (response.type === 'print_result') {
          ws.close();
          if (response.success) {
            resolve(response.message);
          } else {
            reject(new Error(response.message));
          }
        }
      } catch (e) {
        ws.close();
        reject(e);
      }
    };

    ws.onerror = (err) => {
      reject(new Error('Print service offline'));
    };

    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        reject(new Error('Print request timed out'));
      }
    }, 3000);
  });
};

function Barcode({ value, width = 1.5, height = 35, displayValue = false }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: width,
          height: height,
          displayValue: displayValue,
          margin: 0,
          background: "transparent",
          fontSize: 10,
          textMargin: 2
        });
      } catch (e) {
        console.error("Barcode generation error:", e);
      }
    }
  }, [value, width, height, displayValue]);

  return <svg ref={svgRef}></svg>;
}

function BarcodeModal({ material, onClose }) {
  const [lotNumber, setLotNumber] = useState(material.code || '');
  const [billNumber, setBillNumber] = useState(material.billNumber || '');
  const [weight, setWeight] = useState(material.weight || '0.00');
  const [receivedDate, setReceivedDate] = useState(material.receivedDate || new Date().toISOString().split('T')[0]);
  const [receivedPerson, setReceivedPerson] = useState(material.receivedPerson || '');
  const [authorizedPerson, setAuthorizedPerson] = useState(material.authorizedPerson || '');

  const formatDateForDisplay = (dateStr) => {
    try {
      if (!dateStr || dateStr === '—') return '—';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const handlePrint = async () => {
    try {
      await printDirectly('print_material', {
        code: material.code,
        name: material.name,
        category: material.category,
        subCategory: material.subCategory || '',
        color: material.color || '',
        weight: weight,
        location: material.location,
        receivedDate: receivedDate,
        billNumber: billNumber,
        lotNumber: lotNumber,
        receivedPerson: receivedPerson,
        authorizedPerson: authorizedPerson
      });
      alert('✓ Sticker print request sent to Python print service!');
    } catch (err) {
      console.error('Direct print failed:', err);
      alert(`❌ Print Failed: Print service is offline.\n\nPlease start the Python print service by running:\npython python_service/print-service/print_service.py`);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-md">
        <style>{`
          .barcode-label {
            width: 2.40in;
            height: 1.60in;
            padding: 4px 6px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: white;
            color: black;
            font-family: Arial, sans-serif;
          }
          .sticker-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            font-size: 5.5pt;
            border: 1px solid black;
          }
          .sticker-table td {
            border: 1px solid black;
            padding: 1px 2px;
            line-height: 1.1;
          }
          .label-cell {
            font-weight: bold;
            width: 30%;
          }
          .val-cell {
            width: 70%;
          }
          .barcode-svg-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 2px;
          }
          .barcode-svg-container svg {
            width: 2.10in !important;
            height: 0.35in !important;
            display: block;
          }
          .barcode-footer {
            text-align: center;
            font-size: 5pt;
            color: #555;
            border-top: 1px solid #000;
            padding-top: 1px;
            margin-top: 1px;
            line-height: 1;
          }
        `}</style>
        <div className="modal-header">
          <div className="modal-title"><QrCode size={18} /> Barcode Label — {material.code}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', gap: '20px', flexDirection: 'row', flexWrap: 'wrap', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Form Inputs (Left Column) */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '280px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Lot Number</label>
              <input className="form-control" style={{ padding: '8px 12px' }} value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="e.g. LOT-4509" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Bill Number</label>
              <input className="form-control" style={{ padding: '8px 12px' }} value={billNumber} onChange={e => setBillNumber(e.target.value)} placeholder="e.g. BILL-9921" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Weight (Kg)</label>
              <input className="form-control" style={{ padding: '8px 12px' }} type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Received Date</label>
              <input className="form-control" style={{ padding: '8px 12px' }} type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Received By</label>
              <input className="form-control" style={{ padding: '8px 12px' }} value={receivedPerson} onChange={e => setReceivedPerson(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Authorized Person</label>
              <input className="form-control" style={{ padding: '8px 12px' }} value={authorizedPerson} onChange={e => setAuthorizedPerson(e.target.value)} placeholder="e.g. Sarah Smith" />
            </div>
          </div>

          {/* Sticker Preview (Right Column) */}
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sticker Live Preview</div>
            <div id="barcode-print-area">
              <div className="barcode-label" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <table className="sticker-table">
                  <tbody>
                    <tr>
                      <td className="label-cell">BARCODE ID</td>
                      <td className="val-cell" style={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#fef3c7' }}>{material.code}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">CMP</td>
                      <td className="val-cell">{material.category || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">FABRIC</td>
                      <td className="val-cell">{material.name || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">GROUP</td>
                      <td className="val-cell">{material.subCategory || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">SHADE</td>
                      <td className="val-cell">
                        <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                          <tbody>
                            <tr style={{ border: 'none' }}>
                              <td style={{ border: 'none', padding: 0, fontWeight: 'bold', width: '45%' }}>{material.color || '—'}</td>
                              <td style={{ border: 'none', borderLeft: '1px solid black', padding: '0 0 0 4px', fontWeight: 'bold', width: '55%' }}>LOCATION: {material.location || '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">WEIGHT</td>
                      <td className="val-cell">
                        <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                          <tbody>
                            <tr style={{ border: 'none' }}>
                              <td style={{ border: 'none', padding: 0, fontWeight: 'bold', width: '45%' }}>{weight} Kg</td>
                              <td style={{ border: 'none', borderLeft: '1px solid black', padding: '0 0 0 4px', width: '55%' }}>BILL NO: {billNumber || '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">DATE</td>
                      <td className="val-cell">{receivedDate ? formatDateForDisplay(receivedDate) : '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">LOT NO</td>
                      <td className="val-cell" style={{ fontWeight: 'bold' }}>{lotNumber || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">RECEIVED BY</td>
                      <td className="val-cell">{receivedPerson || '—'}</td>
                    </tr>
                    <tr>
                      <td className="label-cell">AUTHORIZED</td>
                      <td className="val-cell">{authorizedPerson || '—'}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="barcode-svg-container" style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                  <Barcode value={material.code} width={1.8} height={32} displayValue={true} />
                </div>
                <div className="barcode-footer">
                  Scan Barcode for details
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" id="print-label-btn" onClick={handlePrint}>🖨️ Print Sticker</button>
        </div>
      </div>
    </div>
  );
}

function DyeingVerificationModal({ onClose }) {
  const [dyeingReport, setDyeingReport] = useState([]);
  const [dyeingMaterials, setDyeingMaterials] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [lotRolls, setLotRolls] = useState([]);
  const [isLoadingLotRolls, setIsLoadingLotRolls] = useState(false);
  const [dyeingSearchQuery, setDyeingSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '—') return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB');
  };

  const handleOpenReceipt = async (receipt) => {
    setSelectedReceipt(receipt);
    setLotRolls([]);
    setIsLoadingLotRolls(true);
    try {
      const rolls = await store.getDyeingMaterials();
      const filtered = rolls.filter(r => {
        const receiptLot = String(receipt.lotNumber || '').trim().toLowerCase();
        const rollLot = String(r.lotNumber || '').trim().toLowerCase();
        if (receiptLot && receiptLot !== '—') {
          return rollLot === receiptLot;
        }
        const receiptBill = String(receipt.billNumber || '').trim().toLowerCase();
        const rollBill = String(r.billNumber || '').trim().toLowerCase();
        if (receiptBill && receiptBill !== '—') {
          return rollBill === receiptBill;
        }
        return false;
      });
      // Sort by roll number ascending
      filtered.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
      setLotRolls(filtered);
    } catch (e) {
      console.error('Failed to fetch lot rolls:', e);
    } finally {
      setIsLoadingLotRolls(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      store.getDyeingDiscrepancyReport(),
      store.getDyeingMaterials()
    ]).then(([dyeingData, dyeingMats]) => {
      if (!active) return;
      setDyeingReport(dyeingData || []);
      setDyeingMaterials(dyeingMats || []);
    }).catch(console.error);
    return () => { active = false; };
  }, []);

  const filteredDyeingReport = dyeingReport.filter(d => {
    const query = dyeingSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (d.billNumber && d.billNumber.toLowerCase().includes(query)) ||
      (d.lotNumber && d.lotNumber.toLowerCase().includes(query)) ||
      (d.barcodeIds && d.barcodeIds.toLowerCase().includes(query)) ||
      (d.fabric && d.fabric.toLowerCase().includes(query)) ||
      (d.brand && d.brand.toLowerCase().includes(query)) ||
      (d.sentShade && d.sentShade.toLowerCase().includes(query)) ||
      (d.receivedShade && d.receivedShade.toLowerCase().includes(query))
    );
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal modal-lg" style={{ maxWidth: '1200px', width: '95%' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={18} /> Dyeing Verification & Lot Discrepancy</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>10% weight variance threshold</span>
            <div style={{ position: 'relative', width: '320px' }}>
              <input
                type="text"
                placeholder="Search lot, barcode, bill, fabric..."
                value={dyeingSearchQuery}
                onChange={e => setDyeingSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 36px',
                  fontSize: '13px',
                  border: isSearchFocused ? '1px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: isSearchFocused ? '0 0 0 3px rgba(26, 86, 219, 0.15)' : 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: isSearchFocused ? 'var(--primary)' : 'var(--text-muted)'
                }}
              />
              {dyeingSearchQuery && (
                <button
                  onClick={() => setDyeingSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="table-wrap" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Bill Number</th>
                  <th>Lot Number</th>
                  <th>Barcode ID</th>
                  <th>Fabric / Brand</th>
                  <th>Sent Rolls</th>
                  <th>Sent Wt.</th>
                  <th>Received Rolls</th>
                  <th>Received Wt.</th>
                  <th>Weight Loss</th>
                  <th>Shortage %</th>
                  <th>Shade (Sent → Rec)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDyeingReport.map((d, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{d.billNumber}</td>
                    <td style={{ fontWeight: 600, fontSize: 12 }}>{d.lotNumber}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {d.barcodeIds ? (
                        d.barcodeIds.split(',').length > 1 ? (
                          <span title={d.barcodeIds.split(',').join('\n')} style={{ cursor: 'help', borderBottom: '1px dotted var(--text-muted)' }}>
                            {d.barcodeIds.split(',')[0]} (+{d.barcodeIds.split(',').length - 1} more)
                          </span>
                        ) : (
                          d.barcodeIds
                        )
                      ) : ''}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 600 }}>{d.fabric}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.brand}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{d.sentRolls}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{d.sentWeight.toFixed(1)} kg</td>
                    <td style={{ fontWeight: 600 }}>{d.receivedRolls}</td>
                    <td style={{ fontWeight: 700 }}>{d.receivedWeight.toFixed(1)} kg</td>
                    <td style={{ color: d.weightDiff > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {d.weightDiff > 0 ? `+${d.weightDiff.toFixed(1)}` : d.weightDiff.toFixed(1)} kg
                    </td>
                    <td style={{ fontWeight: 700 }}>{d.shortagePct.toFixed(1)}%</td>
                    <td style={{ fontSize: 11 }}>
                      <div style={{ color: 'var(--text-secondary)' }}>Sent: <b>{d.sentShade}</b></div>
                      <div style={{ color: d.colorMismatch ? 'var(--danger)' : 'var(--success)' }}>Rec: <b>{d.receivedShade}</b></div>
                    </td>
                    <td>
                      <span className={`badge ${d.status === 'OK' ? 'badge-success' : 'badge-danger'}`} title={d.status}>
                        {d.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleOpenReceipt(d)}
                      >
                        🖨️ JW Receipt
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDyeingReport.length === 0 && (
                  <tr>
                    <td colSpan="14" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                      {dyeingReport.length === 0 ? "No dyeing material received records found to compare." : "No matching dyeing lots found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Printable Fabric JW Receipt Modal (Nested inside DyeingVerificationModal) */}
      {selectedReceipt && (() => {
        const tdStyle = {
          border: '1px solid #000',
          padding: '6px 8px',
          fontSize: '12px',
          height: '24px'
        };

        const thStyle = {
          border: '1px solid #000',
          padding: '6px 8px',
          fontSize: '11px',
          fontWeight: 'bold',
          backgroundColor: '#f3f4f6'
        };

        const hasRollMismatch = selectedReceipt.receivedRolls < selectedReceipt.sentRolls;
        const hasWeightShortage = selectedReceipt.weightDiff > 0;
        const showShortageSection = (hasRollMismatch || hasWeightShortage) && selectedReceipt.sentRolls > 0 && selectedReceipt.receivedRolls > 0;

        const expectedWeight = hasRollMismatch
          ? ((selectedReceipt.sentWeight / selectedReceipt.sentRolls) * selectedReceipt.receivedRolls)
          : selectedReceipt.sentWeight;
        const actualShortage = expectedWeight - selectedReceipt.receivedWeight;
        const actualShortagePct = expectedWeight > 0 ? (actualShortage / expectedWeight) * 100 : 0;

        return (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            overflowY: 'auto',
            padding: '20px'
          }}>
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm 15mm;
                }

                .sidebar,
                .topbar,
                .tabs,
                .page-header,
                .grid,
                .card,
                .modal-header,
                .modal-footer,
                .no-print,
                .modal-lg,
                button {
                  display: none !important;
                }

                .app-layout,
                .main-content,
                .page-content {
                  display: block !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  background: transparent !important;
                  box-shadow: none !important;
                }

                .modal-overlay {
                  position: static !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                  overflow: visible !important;
                  z-index: auto !important;
                }

                .modal {
                  background: transparent !important;
                  box-shadow: none !important;
                  border: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  max-height: none !important;
                  max-width: none !important;
                  width: 100% !important;
                  height: auto !important;
                }

                #jw-receipt-print-area {
                  border: 1px solid #000 !important;
                  padding: 15px !important;
                  margin: 0 auto !important;
                  width: 100% !important;
                  max-width: 180mm !important;
                  box-sizing: border-box !important;
                  background: white !important;
                  color: black !important;
                  page-break-inside: avoid !important;
                }

                #jw-receipt-print-area * {
                  color: #000 !important;
                  border-color: #000 !important;
                  background-color: transparent !important;
                }
              }
            `}</style>

            <div className="modal" style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
              color: 'black'
            }}>
              <div className="modal-header no-print" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>🖨️ Fabric JW Receipt Preview</h3>
                <button style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#9ca3af'
                }} onClick={() => setSelectedReceipt(null)}>×</button>
              </div>

              <div id="jw-receipt-print-area" style={{
                border: '1px solid #000',
                padding: '20px',
                backgroundColor: 'white',
                color: 'black',
                boxSizing: 'border-box'
              }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>FABRIC JW RECEIPT</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0' }}>MOHIT HOSIERY</div>
                  <div style={{ fontSize: '11px', color: '#374151' }}>Address 1</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', border: '1px solid #000' }}>
                  <tbody>
                    <tr>
                      <td style={tdStyle}><b>Job Processor</b></td>
                      <td style={tdStyle}>{selectedReceipt.brand && selectedReceipt.brand !== '—' ? selectedReceipt.brand : ''}</td>
                      <td style={tdStyle}><b>Lot No.</b></td>
                      <td style={tdStyle}>{selectedReceipt.lotNumber && selectedReceipt.lotNumber !== '—' ? selectedReceipt.lotNumber : ''}</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}><b>Process</b></td>
                      <td style={tdStyle}>ONLY RFD (HEAT SET ALREADY DONE)</td>
                      <td style={tdStyle}><b>Date of Receipt</b></td>
                      <td style={tdStyle}>{selectedReceipt.latestReceivedAt ? formatDate(selectedReceipt.latestReceivedAt) : ''}</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}><b>Date of Issue</b></td>
                      <td style={tdStyle}>{selectedReceipt.date ? formatDate(selectedReceipt.date) : ''}</td>
                      <td style={tdStyle}><b>Standard Depth</b></td>
                      <td style={tdStyle}></td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={tdStyle}><b>DIA (Fabric+Rib) approved By Master</b></td>
                      <td colSpan="2" style={tdStyle}>[ ] Yes   [ ] No</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}><b>Storage Location</b></td>
                      <td style={tdStyle} colSpan="3">{selectedReceipt.location && selectedReceipt.location !== '—' ? selectedReceipt.location : ''}</td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', border: '1px solid #000', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th colSpan="2" style={thStyle}>Color</th>
                      <th colSpan="3" style={thStyle}>DIA</th>
                      <th colSpan="3" style={thStyle}>GSM</th>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={thStyle}>Required</th>
                      <th style={thStyle}>Receipt</th>
                      <th style={thStyle}>Sent</th>
                      <th style={thStyle}>Reqd.</th>
                      <th style={thStyle}>Recd.</th>
                      <th style={thStyle}>Sent</th>
                      <th style={thStyle}>Reqd.</th>
                      <th style={thStyle}>Recd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdStyle}>{selectedReceipt.sentShade && selectedReceipt.sentShade !== '—' ? selectedReceipt.sentShade : ''}</td>
                      <td style={tdStyle}>{selectedReceipt.receivedShade && selectedReceipt.receivedShade !== '—' ? selectedReceipt.receivedShade : ''}</td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold', marginBottom: '12px', fontSize: '12px' }}>
                  Fabric : {selectedReceipt.fabric && selectedReceipt.fabric !== '—' ? selectedReceipt.fabric : ''}
                </div>

                {showShortageSection && (
                  <div style={{
                    border: '1px solid #dc2626',
                    padding: '8px 12px',
                    marginBottom: '12px',
                    fontSize: '11px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ fontWeight: 'bold', borderBottom: '1px solid #fca5a5', paddingBottom: '4px', marginBottom: '6px' }}>
                      {hasRollMismatch
                        ? "Shortage Calculation for Received Roll(s) Only:"
                        : "Shortage Calculation:"}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                      <div>Total Sent: <b>{selectedReceipt.sentRolls} Rolls / {selectedReceipt.sentWeight.toFixed(2)} KG</b> {hasRollMismatch && `(Avg: ${(selectedReceipt.sentWeight / selectedReceipt.sentRolls).toFixed(2)} KG/Roll)`}</div>
                      <div>Actual Received: <b>{selectedReceipt.receivedRolls} Rolls / {selectedReceipt.receivedWeight.toFixed(2)} KG</b></div>
                      <div>Expected Weight {hasRollMismatch && `(for ${selectedReceipt.receivedRolls} Roll)`}: <b>{expectedWeight.toFixed(2)} KG</b></div>
                      <div>Actual Shortage {hasRollMismatch && "on Recd. Roll"}: <strong style={{ color: '#dc2626' }}>{actualShortage.toFixed(2)} KG ({actualShortagePct.toFixed(2)}%)</strong></div>
                    </div>
                  </div>
                )}

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', border: '1px solid #000', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th colSpan="3" style={thStyle}>Rolls</th>
                      <th colSpan="3" style={thStyle}>Qty in KGS</th>
                      <th rowSpan="2" style={thStyle}>Std Short(Kgs.)</th>
                      <th rowSpan="2" style={thStyle}>Std Short(%)</th>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={thStyle}>Issued</th>
                      <th style={thStyle}>Billed</th>
                      <th style={thStyle}>Recd.</th>
                      <th style={thStyle}>Issued</th>
                      <th style={thStyle}>Billed</th>
                      <th style={thStyle}>Recd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdStyle}>{selectedReceipt.sentRolls || 0}</td>
                      <td style={tdStyle}>{selectedReceipt.sentRolls || 0}</td>
                      <td style={tdStyle}>{selectedReceipt.receivedRolls || 0}</td>
                      <td style={tdStyle}>{selectedReceipt.sentWeight ? selectedReceipt.sentWeight.toFixed(2) : '0.00'}</td>
                      <td style={tdStyle}>{selectedReceipt.sentWeight ? selectedReceipt.sentWeight.toFixed(2) : '0.00'}</td>
                      <td style={tdStyle}>{selectedReceipt.receivedWeight ? selectedReceipt.receivedWeight.toFixed(2) : '0.00'}</td>
                      <td style={{ ...tdStyle, color: selectedReceipt.weightDiff > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                        {selectedReceipt.weightDiff ? selectedReceipt.weightDiff.toFixed(2) : '0.00'}/0
                      </td>
                      <td style={{ ...tdStyle, color: selectedReceipt.shortageAlert ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                        {selectedReceipt.shortagePct ? selectedReceipt.shortagePct.toFixed(2) : '0.00'}/0
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: '14px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '6px', textAlign: 'left' }}>
                    RECEIVED ROLLS DETAILS & STORAGE LOCATIONS
                  </div>
                  {isLoadingLotRolls ? (
                    <div style={{ fontSize: '11px', textAlign: 'center', padding: '8px', color: '#4b5563' }}>Loading rolls details...</div>
                  ) : lotRolls.length === 0 ? (
                    <div style={{ fontSize: '11px', textAlign: 'center', padding: '8px', color: '#6b7280' }}>No rolls received yet.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Roll No.</th>
                          <th style={thStyle}>Barcode ID</th>
                          <th style={thStyle}>Received Weight</th>
                          <th style={thStyle}>Storage Location (Shelf)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lotRolls.map((roll, idx) => (
                          <tr key={roll.id || idx}>
                            <td style={tdStyle}>Roll {roll.rollNumber} of {roll.batchTotal || selectedReceipt.sentRolls}</td>
                            <td style={{ ...tdStyle, fontWeight: 'bold' }}>{roll.barcodeId}</td>
                            <td style={{ ...tdStyle, fontWeight: 'bold' }}>{parseFloat(roll.weight).toFixed(2)} KG</td>
                            <td style={tdStyle}>{roll.location && roll.location !== '—' ? roll.location : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Fabric match with RIB/COLLAR/TAPE/ANY OTHER</span>
                    <span style={{ border: '1px solid #000', width: '60px', height: '20px' }}></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Fabric as per Standard</span>
                    <span style={{ border: '1px solid #000', width: '60px', height: '20px' }}></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Depth of Color as per Standard</span>
                    <span style={{ border: '1px solid #000', width: '60px', height: '20px' }}></span>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', border: '1px solid #000' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={thStyle}>Shrinkage Test</th>
                      <th style={thStyle}>Before Wash</th>
                      <th style={thStyle}>After Wash</th>
                      <th style={thStyle}>Difference</th>
                      <th style={thStyle}>Shrinkage %</th>
                      <th style={thStyle}>Std %</th>
                      <th style={thStyle}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <td style={tdStyle}><b>Fabric Length</b></td>
                      <td style={tdStyle}>50 CM</td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                    </tr>
                    <tr>
                      <td style={tdStyle}><b>Fabric Width</b></td>
                      <td style={tdStyle}>50 CM</td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                      <td style={tdStyle}></td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', padding: '0 10px', fontSize: '12px' }}>
                  <div>
                    <div><b>Prepared By</b></div>
                    <div style={{ marginTop: '24px', borderTop: '1px solid #000', width: '120px' }}></div>
                  </div>
                  <div>
                    <div><b>Checked By</b></div>
                    <div style={{ marginTop: '24px', borderTop: '1px solid #000', width: '120px' }}></div>
                  </div>
                </div>
              </div>

              <div className="modal-footer no-print" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px',
                marginTop: '16px'
              }}>
                <button className="btn btn-secondary" onClick={() => setSelectedReceipt(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print Receipt</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editMat, setEditMat] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [showDyeing, setShowDyeing] = useState(false);

  const load = () => {
    store.getMaterials().then(setMaterials).catch(console.error);
    store.getSuppliers().then(setSuppliers).catch(console.error);
  };
  useEffect(load, []);

  const filtered = materials.filter(m => {
    const q = search.toLowerCase();
    const matchQ = !q || m.name?.toLowerCase().includes(q) || m.code?.toLowerCase().includes(q) || m.location?.toLowerCase().includes(q);
    const matchCat = catFilter === 'All' || m.category === catFilter;
    const matchStatus = statusFilter === 'All' || m.status === statusFilter;
    return matchQ && matchCat && matchStatus;
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this material?')) return;
    try {
      await store.deleteMaterial(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleExport = () => {
    try {
      const headers = ['Code', 'Material Name', 'Category', 'Color', 'Weight (Kg)', 'Stock (Rolls)', 'Location', 'Status'];
      const rows = filtered.map(m => [
        m.code,
        m.name,
        m.category,
        m.color || '—',
        m.weight,
        m.rolls,
        m.location,
        m.status
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `material_master_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-title-block" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <button
            onClick={() => window.history.back()}
            className="btn btn-secondary btn-icon btn-sm"
            style={{ borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="breadcrumb"><span>Home</span><span>/</span><span>Material Master</span></div>
            <h1 style={{ margin: 0 }}>Material Master</h1>
            <p style={{ margin: '4px 0 0 0' }}>Manage fabric materials, colors, rolls, and warehouse placement.</p>
          </div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" id="dyeing-verification-btn" onClick={() => setShowDyeing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Dyeing Verification
          </button>
          <button className="btn btn-secondary btn-sm" id="export-materials-btn" onClick={handleExport}><Download size={14} /> Export</button>
          {/* <button className="btn btn-primary btn-sm" id="add-material-btn" onClick={() => { setEditMat(null); setShowForm(true); }}><Plus size={14} /> Add Material</button> */}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body" style={{ padding: '14px 18px' }}>
          <div className="filter-row">
            <div className="search-bar" style={{ maxWidth: 320 }}>
              <Search size={14} className="icon" />
              <input id="material-search" placeholder="Search by name, code, location..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)} id="category-filter">
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="form-control" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} id="status-filter">
              <option value="All">All Status</option>
              <option>Active</option>
              <option>Low Stock</option>
              <option>Inactive</option>
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} items</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Material Name</th>
                <th>Category</th>
                <th>Color</th>
                <th>Supplier</th>
                <th>Weight (Kg)</th>
                <th>Stock (Rolls)</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Package size={28} /></div>
                    <h3>No Materials Found</h3>
                    <p>Try adjusting your search or add a new material.</p>
                  </div>
                </td></tr>
              ) : filtered.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{m.code}</td>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td><span className="badge badge-primary" style={{ fontSize: 11 }}>{m.category}</span></td>
                  <td>{m.color || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getSupplierName(m.supplier)}</td>
                  <td>{m.weight} Kg</td>
                  <td style={{ fontWeight: 700 }}>{m.rolls}</td>
                  <td><span className="tag" style={{ fontSize: 11 }}>{m.location}</span></td>
                  <td>
                    <span className={`badge ${m.status === 'Active' ? 'badge-success' : m.status === 'Low Stock' ? 'badge-warning' : 'badge-secondary'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" title="View QR" id={`qr-btn-${m.id}`} onClick={() => setShowQR(m)}><QrCode size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Edit" id={`edit-mat-${m.id}`} onClick={() => { setEditMat(m); setShowForm(true); }}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Delete" id={`del-mat-${m.id}`} onClick={() => handleDelete(m.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <MaterialForm
          material={editMat}
          suppliers={suppliers}
          onSave={() => { load(); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}
      {showQR && <BarcodeModal material={showQR} onClose={() => setShowQR(null)} />}
      {showDyeing && (
        <DyeingVerificationModal
          onClose={() => {
            setShowDyeing(false);
            if (location.search.includes('dyeing=true')) {
              navigate('/materials');
            }
          }}
        />
      )}
    </div>
  );
}

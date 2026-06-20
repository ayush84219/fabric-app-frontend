import { useState, useEffect } from 'react';
import { store } from '../store.js';
import { BarChart3, Download, FileText, TrendingUp, Package, Warehouse, Users, Search, Printer } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PIE_COLORS = ['#1a56db', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState('stock');
  const [materials, setMaterials] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [grns, setGRNs] = useState([]);
  const [issues, setIssues] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [dyeingReport, setDyeingReport] = useState([]);
  const [dyeingMaterials, setDyeingMaterials] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [lotRolls, setLotRolls] = useState([]);
  const [isLoadingLotRolls, setIsLoadingLotRolls] = useState(false);
  const [dyeingSearchQuery, setDyeingSearchQuery] = useState('');
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '—') return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB');
  };

  const getShelfStatus = (shelf) => {
    const pct = shelf.capacity > 0 ? Math.round((shelf.used / shelf.capacity) * 100) : 0;
    let status = 'empty';
    if (pct >= 90) status = 'full';
    else if (pct > 0) status = 'partial';
    return { pct, status };
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
    const loadData = async () => {
      try {
        const [mats, shvs, grnList, iss, trfs, sups, rms, dyeingData, dyeingMats] = await Promise.all([
          store.getMaterials(),
          store.getShelves(),
          store.getGRNs(),
          store.getIssues(),
          store.getTransfers(),
          store.getSuppliers(),
          store.getRooms(),
          store.getDyeingDiscrepancyReport(),
          store.getDyeingMaterials()
        ]);
        if (!active) return;
        setMaterials(mats || []);
        setShelves(shvs || []);
        setGRNs(grnList || []);
        setIssues(iss || []);
        setTransfers(trfs || []);
        setSuppliers(sups || []);
        setRooms(rms || []);
        setDyeingReport(dyeingData || []);
        setDyeingMaterials(dyeingMats || []);
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || '—';

  // Stock Report Data
  const stockData = [
    ...materials.map(m => ({
      name: m.name, code: m.code, category: m.category, color: m.color || '—',
      stock: m.rolls,
      location: m.location || '—', status: m.status,
    })),
    ...dyeingMaterials.map(dm => ({
      name: dm.fabricName || dm.cmfName || 'Dyeing Fabric',
      code: dm.barcodeId,
      category: 'Dyeing Fabric',
      color: dm.shade || '—',
      stock: dm.status === 'issued' ? 0 : 1,
      location: dm.location || '—',
      status: dm.status === 'issued' ? 'Issued' : 'Active',
    }))
  ];

  const allStockItems = [
    ...materials.map(m => ({ category: m.category, rolls: m.rolls })),
    ...dyeingMaterials.map(dm => ({ category: 'Dyeing Fabric', rolls: dm.status === 'issued' ? 0 : 1 }))
  ];

  const categoryStock = Object.entries(
    allStockItems.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + item.rolls; return acc; }, {})
  ).map(([cat, val]) => ({ name: cat, value: val }));

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

  // Warehouse Report
  const roomData = rooms.map(room => {
    const r = room.id;
    const rs = shelves.filter(s => s.room === r);
    const total = rs.reduce((a, s) => a + s.capacity, 0);
    const used = rs.reduce((a, s) => a + s.used, 0);
    return { room: room.name, category: room.category, total, used, free: total - used, pct: total > 0 ? Math.round((used / total) * 100) : 0 };
  });

  // Detailed Warehouse Material Placement Report Data
  const warehouseReportData = shelves.map(shelf => {
    const shelfRoom = rooms.find(r => r.id === shelf.room);
    const zoneName = shelf.rack ? shelf.rack.split('-')[1] : '—';
    const shelfMaterialsData = materials.filter(m => m && m.location === shelf.id);
    return {
      shelf,
      roomName: shelfRoom ? shelfRoom.name : '—',
      zoneName: `Zone ${zoneName}`,
      shelfMaterials: shelfMaterialsData
    };
  });

  const filteredWarehouseReport = warehouseReportData.filter(item => {
    const query = warehouseSearchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const matchRoom = item.roomName.toLowerCase().includes(query);
    const matchZone = item.zoneName.toLowerCase().includes(query);
    const matchRack = item.shelf.id.toLowerCase().includes(query);
    const matchMaterial = item.shelfMaterials.some(m => 
      m.name?.toLowerCase().includes(query) || 
      m.code?.toLowerCase().includes(query) ||
      m.color?.toLowerCase().includes(query) ||
      m.category?.toLowerCase().includes(query)
    );
    
    return matchRoom || matchZone || matchRack || matchMaterial;
  });

  // Movement Report
  const movementByDate = {};
  grns.forEach(g => {
    movementByDate[g.receivedDate] = movementByDate[g.receivedDate] || { date: g.receivedDate, received: 0, issued: 0 };
    movementByDate[g.receivedDate].received += g.rolls || 0;
  });
  issues.forEach(i => {
    movementByDate[i.date] = movementByDate[i.date] || { date: i.date, received: 0, issued: 0 };
    movementByDate[i.date].issued += i.rolls || 0;
  });
  const movementData = Object.values(movementByDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  // Supplier Report
  const supplierData = suppliers.map(s => {
    const sGrns = grns.filter(g => g.supplier === s.id);
    const totalRolls = sGrns.reduce((a, g) => a + (g.rolls || 0), 0);
    return { name: s.name, contact: s.contact, city: s.city, deliveries: sGrns.length, totalRolls, status: s.status };
  });

  const TABS = [
    { id: 'stock', label: 'Stock Report', icon: Package },
    { id: 'warehouse', label: 'Warehouse Report', icon: Warehouse },
    { id: 'movement', label: 'Movement Report', icon: TrendingUp },
    { id: 'supplier', label: 'Supplier Report', icon: Users },
    { id: 'dyeing', label: 'Dyeing Verification', icon: FileText },
  ];

  return (
    <div className="print-block" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-title-block">
          <div className="breadcrumb"><span>Home</span><span>/</span><span>Reports</span></div>
          <h1>Reports & Analytics</h1>
          <p>Comprehensive reports for stock, warehouse utilization and material movements.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" id="export-report-btn"
            onClick={() => {
              if (tab === 'warehouse') {
                try {
                  const headers = ['Room / Hall', 'Zone', 'Rack ID', 'Stored Material Codes', 'Stored Material Names', 'Stored Material Colors', 'Total Rolls', 'Used Capacity', 'Total Capacity', 'Utilization Pct (%)', 'Status'];
                  const rows = filteredWarehouseReport.map(item => {
                    const statusInfo = getShelfStatus(item.shelf);
                    const materialCodes = item.shelfMaterials.map(m => m.code).join('; ');
                    const materialNames = item.shelfMaterials.map(m => m.name).join('; ');
                    const materialColors = item.shelfMaterials.map(m => m.color || 'No color').join('; ');
                    const totalRolls = item.shelfMaterials.reduce((sum, m) => sum + (m.rolls || 0), 0);
                    return [
                      item.roomName,
                      item.zoneName,
                      item.shelf.id,
                      materialCodes,
                      materialNames,
                      materialColors,
                      totalRolls,
                      item.shelf.used,
                      item.shelf.capacity,
                      statusInfo.pct,
                      statusInfo.status.toUpperCase()
                    ];
                  });

                  const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `warehouse_placement_report_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (e) {
                  alert(`Export failed: ${e.message}`);
                }
                return;
              }

              const dataMap = {
                stock: stockData,
                movement: movementData,
                supplier: supplierData,
                dyeing: dyeingReport.map(d => ({
                  'Bill Number': d.billNumber,
                  'Lot Number': d.lotNumber,
                  'Batch Number': d.batchNumber,
                  'Fabric': d.fabric,
                  'Brand': d.brand,
                  'Sent Rolls': d.sentRolls,
                  'Sent Weight (kg)': d.sentWeight,
                  'Received Rolls': d.receivedRolls,
                  'Received Weight (kg)': d.receivedWeight,
                  'Roll Diff': d.rollDiff,
                  'Weight Diff (kg)': d.weightDiff,
                  'Shortage Pct (%)': d.shortagePct,
                  'Sent Shade': d.sentShade,
                  'Received Shade': d.receivedShade,
                  'Verification Status': d.status
                }))
              };
              exportCSV(dataMap[tab], `${tab}-report.csv`);
            }}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary btn-sm" id="print-report-btn" onClick={() => window.print()}>
            <FileText size={14} /> Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* STOCK REPORT */}
      {tab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">Stock by Category (Rolls)</div></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryStock}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1a56db" radius={[4, 4, 0, 0]} name="Stock (Rolls)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Stock Distribution</div></div>
              <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={categoryStock} cx="50%" cy="50%" outerRadius={75} dataKey="value">
                      {categoryStock.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `${v} Rolls`} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categoryStock.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i], flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{d.name}</span>
                      <span style={{ fontWeight: 700 }}>{d.value} Rolls</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Stock Details</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stockData.length} materials</span>
            </div>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Code</th>
                    <th>Material Name</th>
                    <th>Category</th>
                    <th>Color</th>
                    <th>Stock (Rolls)</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((m, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{m.code}</td>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td><span className="badge badge-primary" style={{ fontSize: 11 }}>{m.category}</span></td>
                      <td>{m.color}</td>
                      <td style={{ fontWeight: 700 }}>{m.stock} Rolls</td>
                      <td><span className="tag" style={{ fontSize: 11 }}>{m.location}</span></td>
                      <td>
                        <span className={`badge ${m.status === 'Active' ? 'badge-success' : m.status === 'Low Stock' ? 'badge-warning' : 'badge-secondary'}`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WAREHOUSE REPORT */}
      {tab === 'warehouse' && (
        <div className="print-block" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="grid grid-3">
            {roomData.map(r => (
              <div key={r.room} className="card card-hover">
                <div className="card-body">
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{r.room}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{r.category}</div>
                  <div className="progress-bar" style={{ marginBottom: 8 }}>
                    <div className={`progress-fill ${r.pct >= 90 ? 'red' : r.pct >= 50 ? 'yellow' : 'green'}`} style={{ width: `${r.pct}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Used: <b style={{ color: 'var(--text-primary)' }}>{r.used.toLocaleString()} Rolls</b></span>
                    <span style={{ fontWeight: 700, color: r.pct >= 90 ? 'var(--danger)' : r.pct >= 50 ? '#d97706' : 'var(--success)' }}>{r.pct}%</span>
                    <span style={{ color: 'var(--text-muted)' }}>Free: <b style={{ color: 'var(--success)' }}>{r.free.toLocaleString()} Rolls</b></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Room Utilization Comparison</div></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={roomData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="room" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="used" fill="#1a56db" radius={[4, 4, 0, 0]} name="Used (Rolls)" />
                  <Bar dataKey="free" fill="#10b981" radius={[4, 4, 0, 0]} name="Free (Rolls)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Warehouse Occupancy & Material Placement Report */}
          <div className="card printable-report-card" style={{ marginTop: 10 }}>
            <div className="card-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)'
            }}>
              <div>
                <div className="card-title" style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={16} style={{ color: 'var(--primary)' }} />
                  Warehouse Material Placement Report
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Comprehensive inventory map showing stored materials across all racks and zones
                </span>
              </div>
              <div className="no-print" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => {
                    document.body.classList.add('print-single-report');
                    window.print();
                    setTimeout(() => {
                      document.body.classList.remove('print-single-report');
                    }, 500);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  <Printer size={14} /> Print Table
                </button>
                {/* Search Input */}
                <div style={{ position: 'relative', width: '280px' }}>
                  <input
                    type="text"
                    placeholder="Search rack, material name or code..."
                    value={warehouseSearchQuery}
                    onChange={e => setWarehouseSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      fontSize: '12.5px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)'
                    }}
                  />
                  {warehouseSearchQuery && (
                    <button
                      onClick={() => setWarehouseSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        fontSize: '16px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrap" style={{ border: 'none', margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Room / Hall</th>
                      <th>Zone</th>
                      <th>Rack ID</th>
                      <th>Stored Material(s)</th>
                      <th>Total Rolls</th>
                      <th>Utilized Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWarehouseReport.map((item, idx) => {
                      const statusInfo = getShelfStatus(item.shelf);
                      return (
                        <tr key={item.shelf.id} style={{ transition: 'background-color 0.15s' }}>
                          <td style={{ fontWeight: 650 }}>{item.roomName}</td>
                          <td style={{ fontWeight: 600 }}>{item.zoneName}</td>
                          <td>
                            <span className="tag" style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px' }}>
                              {item.shelf.id}
                            </span>
                          </td>
                          <td>
                            {item.shelfMaterials.length === 0 ? (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>— Empty —</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {item.shelfMaterials.map((m, mIdx) => (
                                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12.5px' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: '70px', display: 'inline-block' }}>{m.code}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({m.color || 'No color'})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {item.shelfMaterials.reduce((sum, m) => sum + (m.rolls || 0), 0)} Rolls
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="progress-bar" style={{ width: '80px', height: '6px', background: 'var(--border)' }}>
                                <div
                                  className={`progress-fill ${statusInfo.pct >= 90 ? 'red' : statusInfo.pct >= 50 ? 'yellow' : 'green'}`}
                                  style={{ width: `${statusInfo.pct}%` }}
                                />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                {item.shelf.used} / {item.shelf.capacity} ({statusInfo.pct}%)
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${
                              statusInfo.status === 'full' ? 'badge-danger' : 
                              statusInfo.status === 'partial' ? 'badge-warning' : 'badge-success'
                            }`}>
                              {statusInfo.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredWarehouseReport.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No matching placement records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOVEMENT REPORT */}
      {tab === 'movement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Daily Material Movement (Rolls)</div></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={movementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="received" stroke="#1a56db" strokeWidth={2} dot={{ r: 4 }} name="Received (Rolls)" />
                  <Line type="monotone" dataKey="issued" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Issued (Rolls)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">GRN Records</div></div>
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead><tr><th>GRN No.</th><th>Supplier</th><th>Roll Qty</th><th>Date</th></tr></thead>
                  <tbody>
                    {grns.slice(0, 10).map(g => (
                      <tr key={g.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{g.grnNo}</td>
                        <td style={{ fontSize: 12 }}>{getSupplierName(g.supplier)}</td>
                        <td style={{ fontWeight: 600 }}>{g.rolls} Roll(s)</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.receivedDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Issue Records</div></div>
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead><tr><th>Issue No.</th><th>Department</th><th>Roll Qty</th><th>Date</th></tr></thead>
                  <tbody>
                    {issues.slice(0, 10).map(i => (
                      <tr key={i.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{i.issueNo}</td>
                        <td><span className="badge badge-info" style={{ fontSize: 11 }}>{i.department}</span></td>
                        <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{i.rolls} Roll(s)</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIER REPORT */}
      {tab === 'supplier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Supplier Performance</div></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={supplierData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalRolls" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Total Received (Rolls)" />
                  <Bar dataKey="deliveries" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="No. of Deliveries" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Supplier Summary</div></div>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr><th>#</th><th>Supplier Name</th><th>Contact</th><th>City</th><th>Deliveries</th><th>Total Rolls</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {supplierData.map((s, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{s.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.contact}</td>
                      <td style={{ fontSize: 12 }}>{s.city}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.deliveries}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.totalRolls} Rolls</td>
                      <td>
                        <span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-secondary'}`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DYEING REPORT */}
      {tab === 'dyeing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Summary Cards */}
          <div className="grid grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Lots Checked</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0' }}>{dyeingReport.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total lots compared</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Total Weight Received</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0' }}>
                  {dyeingReport.reduce((sum, d) => sum + d.receivedWeight, 0).toFixed(1)} kg
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total received in warehouse</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Weight Shortage</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: 'var(--danger)' }}>
                  {dyeingReport.reduce((sum, d) => sum + d.weightDiff, 0).toFixed(1)} kg
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total weight difference</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Discrepancy Alert Rate</div>
                <div style={{ fontSize: 24, fontWeight: 700, margin: '8px 0', color: dyeingReport.some(d => d.status !== 'OK') ? 'var(--danger)' : 'var(--success)' }}>
                  {dyeingReport.length > 0
                    ? ((dyeingReport.filter(d => d.status !== 'OK').length / dyeingReport.length) * 100).toFixed(1)
                    : '0.0'}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Lots exceeding tolerance / mismatch</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            {/* Sent vs Received Weight Chart */}
            <div className="card">
              <div className="card-header"><div className="card-title">Sent vs Received Weight (kg)</div></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dyeingReport.slice(-8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="lotNumber" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip formatter={v => `${v} kg`} />
                    <Legend />
                    <Bar dataKey="sentWeight" fill="#6366f1" radius={[4, 4, 0, 0]} name="Sent Weight" />
                    <Bar dataKey="receivedWeight" fill="#10b981" radius={[4, 4, 0, 0]} name="Received Weight" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Verification Status Distribution */}
            <div className="card">
              <div className="card-header"><div className="card-title">Status Breakdown</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'OK', value: dyeingReport.filter(d => d.status === 'OK').length },
                        { name: 'Alerts', value: dyeingReport.filter(d => d.status !== 'OK').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>🟢 OK:</span>
                    <span style={{ fontWeight: 700 }}>{dyeingReport.filter(d => d.status === 'OK').length} Lots</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>🔴 Alerts:</span>
                    <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{dyeingReport.filter(d => d.status !== 'OK').length} Lots</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="card-title">Dyeing Lot Discrepancy & Verification</div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>10% weight variance threshold</span>
              </div>
              <div style={{ position: 'relative', width: '320px', transition: 'all 0.2s ease' }}>
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
                    color: isSearchFocused ? 'var(--primary)' : 'var(--text-muted)',
                    transition: 'color 0.2s ease'
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
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%'
                    }}
                    title="Clear search"
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
                      <td colSpan="13" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                        {dyeingReport.length === 0 ? "No dyeing material received records found to compare." : "No matching dyeing lots found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Printable Fabric JW Receipt Modal */}
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

                /* Hide sidebar, topbar, tabs, header, cards, and buttons */
                .sidebar,
                .topbar,
                .tabs,
                .page-header,
                .grid,
                .card,
                .modal-header,
                .modal-footer,
                .no-print,
                button {
                  display: none !important;
                }

                /* Reset layout wrapper constraints for printing */
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

                /* Remove grey overlay background and positioning of modal */
                .modal-overlay {
                  position: static !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                  overflow: visible !important;
                  z-index: auto !important;
                }

                /* Reset modal popup box styling */
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

                /* Ensure the receipt is displayed nicely on paper */
                #jw-receipt-print-area {
                  border: 1px solid #000 !important;
                  padding: 15px !important;
                  margin: 0 auto !important;
                  width: 100% !important;
                  max-width: 180mm !important; /* Perfect fit for A4 width (210mm - 30mm margins) */
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

              {/* Receipt Body */}
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

              {/* Modal Footer */}
              <div className="modal-footer no-print" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px',
                marginTop: '16px'
              }}>
                <button className="btn btn-secondary" onClick={() => setSelectedReceipt(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => window.print()} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  🖨️ Print Receipt
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { store } from '../store.js';
import { BarChart3, Download, FileText, TrendingUp, Package, Warehouse, Users } from 'lucide-react';
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
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [mats, shvs, grnList, iss, trfs, sups, rms, dyeingData] = await Promise.all([
          store.getMaterials(),
          store.getShelves(),
          store.getGRNs(),
          store.getIssues(),
          store.getTransfers(),
          store.getSuppliers(),
          store.getRooms(),
          store.getDyeingDiscrepancyReport()
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
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || '—';

  // Stock Report Data
  const stockData = materials.map(m => ({
    name: m.name, code: m.code, category: m.category, color: m.color,
    stock: m.rolls,
    location: m.location, status: m.status,
  }));

  const categoryStock = Object.entries(
    materials.reduce((acc, m) => { acc[m.category] = (acc[m.category] || 0) + m.rolls; return acc; }, {})
  ).map(([cat, val]) => ({ name: cat, value: val }));

  // Warehouse Report
  const roomData = rooms.map(room => {
    const r = room.id;
    const rs = shelves.filter(s => s.room === r);
    const total = rs.reduce((a, s) => a + s.capacity, 0);
    const used = rs.reduce((a, s) => a + s.used, 0);
    return { room: room.name, category: room.category, total, used, free: total - used, pct: total > 0 ? Math.round((used / total) * 100) : 0 };
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-title-block">
          <div className="breadcrumb"><span>Home</span><span>/</span><span>Reports</span></div>
          <h1>Reports & Analytics</h1>
          <p>Comprehensive reports for stock, warehouse utilization and material movements.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" id="export-report-btn"
            onClick={() => {
              const dataMap = {
                stock: stockData,
                warehouse: roomData,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            <div className="card-header">
              <div className="card-title">Dyeing Lot Discrepancy & Verification</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>10% weight variance threshold</span>
            </div>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Bill Number</th>
                    <th>Lot Number</th>
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
                  {dyeingReport.map((d, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{d.billNumber}</td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{d.lotNumber}</td>
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
                          onClick={() => setSelectedReceipt(d)}
                        >
                          🖨️ JW Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                  {dyeingReport.length === 0 && (
                    <tr>
                      <td colSpan="13" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                        No dyeing material received records found to compare.
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
                      <td style={tdStyle}>{selectedReceipt.brand || '—'}</td>
                      <td style={tdStyle}><b>Lot No.</b></td>
                      <td style={tdStyle}>{selectedReceipt.lotNumber || '—'}</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}><b>Process</b></td>
                      <td style={tdStyle}>ONLY RFD (HEAT SET ALREADY DONE)</td>
                      <td style={tdStyle}><b>Date of Receipt</b></td>
                      <td style={tdStyle}>{selectedReceipt.latestReceivedAt ? new Date(selectedReceipt.latestReceivedAt).toLocaleDateString('en-GB') : '—'}</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}><b>Date of Issue</b></td>
                      <td style={tdStyle}>{selectedReceipt.date ? new Date(selectedReceipt.date).toLocaleDateString('en-GB') : '—'}</td>
                      <td style={tdStyle}><b>Standard Depth</b></td>
                      <td style={tdStyle}>—</td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={tdStyle}><b>DIA (Fabric+Rib) approved By Master</b></td>
                      <td colSpan="2" style={tdStyle}>[ ] Yes   [ ] No</td>
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
                      <td style={tdStyle}>{selectedReceipt.sentShade || '—'}</td>
                      <td style={tdStyle}>{selectedReceipt.receivedShade || '—'}</td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle}>—</td>
                      <td style={tdStyle}>—</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold', marginBottom: '12px', fontSize: '12px' }}>
                  Fabric : {selectedReceipt.fabric || '—'}
                </div>

                {selectedReceipt.receivedRolls < selectedReceipt.sentRolls && selectedReceipt.sentRolls > 0 && selectedReceipt.receivedRolls > 0 && (
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
                      Shortage Calculation for Received Roll(s) Only:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                      <div>Total Sent: <b>{selectedReceipt.sentRolls} Rolls / {selectedReceipt.sentWeight.toFixed(2)} KG</b> (Avg: {(selectedReceipt.sentWeight / selectedReceipt.sentRolls).toFixed(2)} KG/Roll)</div>
                      <div>Actual Received: <b>{selectedReceipt.receivedRolls} Rolls / {selectedReceipt.receivedWeight.toFixed(2)} KG</b></div>
                      <div>Expected Weight (for {selectedReceipt.receivedRolls} Roll): <b>{((selectedReceipt.sentWeight / selectedReceipt.sentRolls) * selectedReceipt.receivedRolls).toFixed(2)} KG</b></div>
                      <div>Actual Shortage on Recd. Roll: <strong style={{ color: '#dc2626' }}>{(((selectedReceipt.sentWeight / selectedReceipt.sentRolls) * selectedReceipt.receivedRolls) - selectedReceipt.receivedWeight).toFixed(2)} KG ({(((((selectedReceipt.sentWeight / selectedReceipt.sentRolls) * selectedReceipt.receivedRolls) - selectedReceipt.receivedWeight) / ((selectedReceipt.sentWeight / selectedReceipt.sentRolls) * selectedReceipt.receivedRolls)) * 100).toFixed(2)}%)</strong></div>
                    </div>
                  </div>
                )}

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', border: '1px solid #000', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th colSpan="3" style={thStyle}>Rolls</th>
                      <th colSpan="3" style={thStyle}>Qty in KGS</th>
                      <th rowSpan="2" style={thStyle}>Short / Std Short(Kgs.)</th>
                      <th rowSpan="2" style={thStyle}>Short / Std Short(%)</th>
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

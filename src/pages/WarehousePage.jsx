import { useState, useEffect } from 'react';
import { store } from '../store.js';
import { Warehouse, ChevronRight, Box, Package, Info, Building2 } from 'lucide-react';

export default function WarehousePage() {
  const [rooms, setRooms] = useState([]);
  const [floors, setFloors] = useState([]);
  const [racks, setRacks] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedRack, setSelectedRack] = useState(null);
  const [selectedShelf, setSelectedShelf] = useState(null);
  const [selectedZone, setSelectedZone] = useState('A');

  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [roomsData, floorsData, racksData, shelvesData, materialsData, suppliersData] = await Promise.all([
          store.getRooms(),
          store.getFloors(),
          store.getRacks(),
          store.getShelves(),
          store.getMaterials(),
          store.getSuppliers()
        ]);
        if (!active) return;
        setRooms(roomsData || []);
        setFloors(floorsData || []);
        setRacks(racksData || []);
        setShelves(shelvesData || []);
        setMaterials(materialsData || []);
        setSuppliers(suppliersData || []);
        if (roomsData && roomsData.length > 0) {
          setSelectedRoom(roomsData[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

  const roomRacks = racks.filter(r => r && r.room === selectedRoom);

  const getZoneStats = (zoneLetter) => {
    const zoneRacks = racks.filter(r => r && r.id && r.room === 'C' && String(r.id).startsWith(`C-${zoneLetter}-`));
    const zoneRackIds = zoneRacks.map(r => r.id);
    const zoneShelves = shelves.filter(s => s && zoneRackIds.includes(s.rack));
    const totalCap = zoneShelves.reduce((a, s) => a + s.capacity, 0);
    const totalUsed = zoneShelves.reduce((a, s) => a + s.used, 0);
    return totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;
  };

  const getRackStatus = (rackId) => {
    const rs = shelves.filter(s => s && s.rack === rackId);
    const total = rs.reduce((a, s) => a + s.capacity, 0);
    const used = rs.reduce((a, s) => a + s.used, 0);
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
    return { pct, status: pct === 0 ? 'empty' : pct >= 90 ? 'full' : 'partial' };
  };

  const rackShelves = selectedRack
    ? shelves.filter(s => s && s.rack === selectedRack).map(s => ({
      ...s,
      pct: s.capacity > 0 ? Math.round((s.used / s.capacity) * 100) : 0,
    }))
    : [];

  const renderZoneGrid = (zoneLetter, rows, cols, title, racksCount) => {
    const zoneRacks = racks.filter(r => r && r.id && r.room === 'C' && String(r.id).startsWith(`C-${zoneLetter}-`));
    const zoneRackIds = zoneRacks.map(r => r.id);
    const zoneShelves = shelves.filter(s => s && zoneRackIds.includes(s.rack));
    const totalCap = zoneShelves.reduce((a, s) => a + s.capacity, 0);
    const totalUsed = zoneShelves.reduce((a, s) => a + s.used, 0);
    const utilPct = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;

    const cells = Array.from({ length: racksCount }, (_, i) => i + 1);

    return (
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: '8px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: 'var(--shadow-sm)',
        width: '100%'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#334155' }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="progress-bar" style={{ height: '4px', flex: 1, background: '#e2e8f0' }}>
              <div
                className="progress-fill blue"
                style={{ width: `${utilPct}%`, background: 'var(--primary)' }}
              />
            </div>
            <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>
              {utilPct}%
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '4px'
        }}>
          {cells.map(num => {
            const rackId = `C-${zoneLetter}-R${num}`;
            const rack = racks.find(r => r.id === rackId);
            const { pct, status } = rack ? getRackStatus(rackId) : { pct: 0, status: 'empty' };

            const isSelected = selectedRack === rackId;
            let bg = '#dcfce7';
            let color = '#166534';
            let border = '1.5px solid #bbf7d0';

            if (status === 'partial') {
              bg = '#dbeafe';
              color = '#1e40af';
              border = '1.5px solid #bfdbfe';
            } else if (status === 'full') {
              bg = '#fef9c3';
              color = '#854d0e';
              border = '1.5px solid #fde68a';
            }

            return (
              <div
                key={rackId}
                onClick={() => {
                  if (rack) {
                    setSelectedRack(rackId === selectedRack ? null : rackId);
                    setSelectedShelf(null);
                  }
                }}
                style={{
                  background: bg,
                  color: color,
                  border: isSelected ? '1.5px solid var(--primary)' : border,
                  boxShadow: isSelected ? '0 0 0 2px rgba(26, 86, 219, 0.2)' : 'none',
                  borderRadius: '4px',
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: rack ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  transform: isSelected ? 'scale(1.05)' : 'none',
                  opacity: rack ? 1 : 0.4
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: '800' }}>R{num}</span>
                {rack && <span style={{ fontSize: '7px', opacity: 0.8, fontWeight: '600' }}>{pct}%</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const shelfMaterials = selectedRoom === 'C'
    ? (selectedRack ? materials.filter(m => m && m.location && m.location.startsWith(selectedRack)) : [])
    : (selectedShelf ? materials.filter(m => m && m.location === selectedShelf) : []);

  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || '—';

  const roomStats = rooms.map(r => {
    const rs = shelves.filter(s => s && s.room === r.id);
    const total = rs.reduce((a, s) => a + s.capacity, 0);
    const used = rs.reduce((a, s) => a + s.used, 0);
    return { ...r, total, used, pct: total > 0 ? Math.round((used / total) * 100) : 0 };
  });

  const renderRoomCard = (r) => (
    <div
      key={r.id}
      className="card card-hover"
      style={{
        cursor: 'pointer',
        borderTop: `3px solid ${r.color}`,
        opacity: selectedRoom === r.id ? 1 : 0.75,
        boxShadow: selectedRoom === r.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'var(--transition)',
      }}
      onClick={() => { setSelectedRoom(r.id); setSelectedRack(null); setSelectedShelf(null); setSelectedZone('A'); }}
      id={`room-card-${r.id}`}
    >
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.category} • {r.floor || 'No Floor'}</div>
          </div>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: `${r.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Warehouse size={18} style={{ color: r.color }} />
          </span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div
            className={`progress-fill ${r.pct >= 90 ? 'red' : r.pct >= 50 ? 'yellow' : 'green'}`}
            style={{ width: `${r.pct}%` }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>Used: <b style={{ color: 'var(--text-primary)' }}>{r.used.toLocaleString()} Roll</b></span>
          <span style={{ fontWeight: 700, color: r.pct >= 90 ? 'var(--danger)' : r.pct >= 50 ? '#d97706' : 'var(--success)' }}>{r.pct}%</span>
          <span>Cap: <b style={{ color: 'var(--text-primary)' }}>{r.total.toLocaleString()} Roll</b></span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div className="page-title-block">
          <div className="breadcrumb"><span>Home</span><span>/</span><span>Warehouse</span></div>
          <h1>Warehouse Management</h1>
        </div>
      </div>

      {/* Room Summary Cards grouped by Floor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {floors.map(floorName => {
          const floorRooms = roomStats.filter(r => r.floor === floorName);
          if (floorRooms.length === 0) return null;
          return (
            <div key={floorName} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                fontSize: 12,
                fontWeight: 750,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderBottom: '1px solid var(--border)',
                paddingBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <Building2 size={13} />
                {floorName}
              </div>
              <div className="grid grid-3">
                {floorRooms.map(r => renderRoomCard(r))}
              </div>
            </div>
          );
        })}

        {roomStats.filter(r => !r.floor || !floors.includes(r.floor)).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 750,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderBottom: '1px solid var(--border)',
              paddingBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <Building2 size={13} />
              Unassigned Floors
            </div>
            <div className="grid grid-3">
              {roomStats.filter(r => !r.floor || !floors.includes(r.floor)).map(r => renderRoomCard(r))}
            </div>
          </div>
        )}
      </div>

      {/* Main Warehouse View */}
      <div style={{ display: 'grid', gap: 20 }}>
        {/* Rack Grid */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Warehouse size={15} />
              {rooms.find(r => r.id === selectedRoom)?.name} — Rack Layout
            </div>
            {selectedRoom !== 'C' && (
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                {['empty', 'partial', 'full'].map(s => (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      width: 12, height: 12, borderRadius: 3, display: 'inline-block',
                      background: s === 'empty' ? '#dcfce7' : s === 'partial' ? '#fef9c3' : '#fee2e2',
                      border: `1px solid ${s === 'empty' ? '#bbf7d0' : s === 'partial' ? '#fde68a' : '#fecaca'}`
                    }} />
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="card-body" style={{ background: selectedRoom === 'C' ? '#f8fafc' : 'transparent', padding: selectedRoom === 'C' ? '16px' : '20px' }}>
            {selectedRoom === 'C' ? (
              /* Custom Hall 3 Warehouse Design layout */
              <div style={{
                background: '#ffffff',
                border: '2px solid #475569',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                {/* Title Block */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={20} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', letterSpacing: '0.5px' }}>
                      HALL-3 WAREHOUSE LAYOUT
                    </span>
                  </div>
                  {/* Compass */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>N</span>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '1.5px solid #64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#64748b'
                    }}>
                      ↑
                    </div>
                  </div>
                </div>

                {/* Zone Tab Selector */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  flexWrap: 'wrap'
                }}>
                  {['A', 'B', 'C', 'D'].map(z => {
                    const isSelected = selectedZone === z;
                    const util = getZoneStats(z);
                    return (
                      <button
                        key={z}
                        onClick={() => {
                          setSelectedZone(z);
                          setSelectedRack(null);
                          setSelectedShelf(null);
                        }}
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          maxWidth: '180px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: isSelected ? '2.5px solid var(--primary)' : '1.5px solid #cbd5e1',
                          background: isSelected ? 'var(--primary-light)' : '#ffffff',
                          color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '800',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                          transform: isSelected ? 'scale(1.03)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '13px' }}>ZONE {z}</span>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', opacity: 0.8 }}>Utilized: {util}%</span>
                      </button>
                    );
                  })}
                </div>

                {/* Display Selected Zone Grid */}
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '10px' }}>
                  <div style={{ width: '100%', maxWidth: '320px' }}>
                    {selectedZone === 'A' && renderZoneGrid('A', 3, 3, 'Zone A (3x3 Racks)', 9)}
                    {selectedZone === 'B' && renderZoneGrid('B', 5, 3, 'Zone B (3x5 Racks)', 15)}
                    {selectedZone === 'D' && renderZoneGrid('D', 3, 3, 'Zone D (3x3 Racks)', 9)}
                    {selectedZone === 'C' && renderZoneGrid('C', 3, 3, 'Zone C (3x3 Racks)', 9)}
                  </div>
                </div>

                {/* Legend & Scale Block */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: '8px',
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: '12px',
                  fontSize: '11px',
                  color: '#64748b',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  {/* Scale */}
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {/* <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 'bold' }}>Scale: 0 - 5 - 10 Meters</span>
                      <div style={{ display: 'flex', height: '4px', background: '#cbd5e1', width: '130px' }}>
                        <div style={{ width: '25%', background: '#475569' }} />
                        <div style={{ width: '25%', background: '#64748b' }} />
                        <div style={{ width: '50%', background: '#94a3b8' }} />
                      </div>
                    </div> */}
                    {/* <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 'bold' }}>Travel Time: 0 - 5 - 10 - 20 Min</span>
                      <div style={{ display: 'flex', height: '4px', background: '#cbd5e1', width: '130px' }}>
                        <div style={{ width: '15%', background: '#475569' }} />
                        <div style={{ width: '15%', background: '#64748b' }} />
                        <div style={{ width: '30%', background: '#94a3b8' }} />
                        <div style={{ width: '40%', background: '#cbd5e1' }} />
                      </div>
                    </div> */}
                  </div>

                  {/* Legend */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', color: '#1e293b' }}>
                      Legend:
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#dcfce7', border: '1px solid #a5d6a7' }} />
                      Empty
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#dbeafe', border: '1px solid #90caf9' }} />
                      Occupied
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ee3238ff', border: '1px solid #fff59d' }} />
                      Reserved
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Default Grid Layout for other rooms */
              <div className="warehouse-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                {roomRacks.map(rack => {
                  const { status, pct } = getRackStatus(rack.id);
                  return (
                    <div
                      key={rack.id}
                      id={`warehouse-rack-${rack.id}`}
                      className={`rack-cell ${status} ${selectedRack === rack.id ? 'selected' : ''}`}
                      onClick={() => { setSelectedRack(rack.id === selectedRack ? null : rack.id); setSelectedShelf(null); }}
                    >
                      <span style={{ fontWeight: 700 }}>{rack.id}</span>
                      <span className="rack-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Shelf Detail */}
        {selectedRoom !== 'C' && selectedRack && (
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Box size={15} /> Rack {selectedRack} — Shelves</div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setSelectedRack(null); setSelectedShelf(null); }}
                style={{ fontSize: 18, lineHeight: 1, padding: '4px 8px' }}>×</button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rackShelves.map(shelf => (
                <div
                  key={shelf.id}
                  id={`shelf-item-${shelf.id}`}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${selectedShelf === shelf.id ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    background: selectedShelf === shelf.id ? 'var(--primary-light)' : 'var(--bg)',
                    transition: 'var(--transition)',
                  }}
                  onClick={() => setSelectedShelf(shelf.id === selectedShelf ? null : shelf.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      S{String(shelf.number).padStart(2, '0')} — {shelf.id}
                    </div>
                    <span className={`badge ${shelf.pct >= 90 ? 'badge-danger' : shelf.pct >= 1 ? 'badge-warning' : 'badge-success'}`}>
                      {shelf.pct === 0 ? 'Empty' : shelf.pct >= 90 ? 'Full' : 'Partial'}
                    </span>
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 8 }}>
                    <div
                      className={`progress-fill ${shelf.pct >= 90 ? 'red' : shelf.pct > 0 ? 'yellow' : 'green'}`}
                      style={{ width: `${Math.max(shelf.pct, 1)}%` }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>Capacity: <b style={{ color: 'var(--text-primary)' }}>{shelf.capacity} Roll</b></span>
                    <span>Used: <b style={{ color: 'var(--text-primary)' }}>{shelf.used} Roll</b></span>
                    <span>Free: <b style={{ color: 'var(--success)' }}>{shelf.capacity - shelf.used} Roll</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Materials in Selected Shelf */}
      {(selectedRoom === 'C' ? selectedRack : selectedShelf) && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Package size={15} />{' '}
              {selectedRoom === 'C'
                ? `Materials in Rack: ${selectedRack}`
                : `Materials in Shelf: ${selectedShelf}`}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{shelfMaterials.length} material(s)</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {shelfMaterials.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Info size={28} /></div>
                <h3>No Materials Here</h3>
                <p>This shelf is empty. Receive materials to assign them here.</p>
              </div>
            ) : (
              <div className="table-wrap" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Material Name</th>
                      <th>Category</th>
                      <th>Color</th>
                      <th>Weight (Kg)</th>
                      <th>Stock (Rolls)</th>
                      <th>Supplier</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shelfMaterials.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 12 }}>{m.code}</td>
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td><span className="badge badge-primary" style={{ fontSize: 11 }}>{m.category}</span></td>
                        <td>{m.color}</td>
                        <td>{m.weight} Kg</td>
                        <td style={{ fontWeight: 700 }}>{m.rolls}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getSupplierName(m.supplier)}</td>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

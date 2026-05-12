import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('POS');

  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [areasList, setAreasList] = useState([]);

  const [showAreaModal, setShowAreaModal] = useState(false);
  const [newArea, setNewArea] = useState({ MaKV: '', TenKV: '' });

  const [showTableModal, setShowTableModal] = useState(false);
  const [newTable, setNewTable] = useState({ MaBan: '', TenBan: '', MaKV: '' });

  const [selectedTableId, setSelectedTableId] = useState(null);
  const [selectedTableTitle, setSelectedTableTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [editTableData, setEditTableData] = useState({ MaBan: '', TenBan: '' });

  const [tableInvoices, setTableInvoices] = useState([]);
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetTableId, setTargetTableId] = useState('');
  const [activeMoveInvoiceId, setActiveMoveInvoiceId] = useState(null);

  // Generate 14 days from today
  const dateList = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      dayName: d.toLocaleDateString('vi-VN', { weekday: 'long' })
    };
  });
  const [selectedDate, setSelectedDate] = useState(dateList[0].dateStr);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState('Chuyển khoản');

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = currentTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dayStr = currentTime.toLocaleDateString('vi-VN', { weekday: 'long' });

  const fetchTables = () => axios.get('http://127.0.0.1:5000/api/tables').then(res => setTables(res.data)).catch(() => { });
  const fetchMenu = () => axios.get('http://127.0.0.1:5000/api/menu').then(res => setMenu(res.data)).catch(() => { });
  const fetchCategories = () => axios.get('http://127.0.0.1:5000/api/categories').then(res => setCategories(res.data)).catch(() => { });
  const fetchRevenueReport = () => axios.get('http://127.0.0.1:5000/api/reports/revenue').then(res => setRevenueData(res.data)).catch(() => { });
  const fetchAreas = () => axios.get('http://127.0.0.1:5000/api/areas').then(res => setAreasList(res.data)).catch(() => setAreasList([{ MaKV: 'KV1', TenKV: 'Trong nhà' }]));
  const fetchInvoices = (maBan) => {
    axios.get(`http://127.0.0.1:5000/api/invoices/${maBan}`).then(res => {
      setTableInvoices(res.data);
      if (res.data.length > 0) {
        const stillExists = res.data.find(inv => inv.MaHD === activeInvoiceId);
        if (!stillExists) setActiveInvoiceId(res.data[0].MaHD);
      } else {
        setActiveInvoiceId(null);
      }
    });
  };

  useEffect(() => {
    fetchTables(); fetchMenu(); fetchCategories(); fetchAreas();
  }, []);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'REPORT') fetchRevenueReport();
  };

  const handleTableClick = (maBan, tenBan) => {
    if (selectedTableId === maBan) {
      setSelectedTableId(null); setSelectedTableTitle(""); setTableInvoices([]); setActiveInvoiceId(null); return;
    }
    setSelectedTableId(maBan);
    setSelectedTableTitle(tenBan);
    fetchInvoices(maBan);
  };

  const handleCreateInvoice = () => {
    if (!selectedTableId) return;
    axios.post(`http://127.0.0.1:5000/api/invoice/create/${selectedTableId}`)
      .then(res => {
        fetchTables();
        fetchInvoices(selectedTableId);
        setActiveInvoiceId(res.data.MaHD);
      });
  };

  const handleMoveMerge = () => {
    if (!targetTableId) return alert("Vui lòng chọn bàn đích!");
    axios.post('http://127.0.0.1:5000/api/tables/move_merge', { MaHD: activeMoveInvoiceId, BanCu: selectedTableId, BanMoi: targetTableId })
      .then(res => {
        alert(res.data.message || "Thao tác thành công!");
        setShowMoveModal(false);
        if (!activeMoveInvoiceId) {
            setSelectedTableId(null);
        } else {
            fetchInvoices(selectedTableId);
        }
        fetchTables();
      });
  };

  const handleCreateArea = () => {
    if (!newArea.TenKV) return alert("Vui lòng nhập tên khu vực!");
    const generatedMaKV = "KV" + Date.now().toString(36).toUpperCase();
    const payload = { MaKV: generatedMaKV, TenKV: newArea.TenKV };

    axios.post('http://127.0.0.1:5000/api/areas', payload).then(() => {
      alert("Tạo khu vực thành công!");
      setShowAreaModal(false);
      setNewArea({ MaKV: '', TenKV: '' });
      fetchAreas();
    }).catch(() => {
      // Mock for frontend if backend not ready
      setAreasList([...areasList, payload]);
      setShowAreaModal(false);
      setNewArea({ MaKV: '', TenKV: '' });
      alert("Đã thêm tạm (chưa lưu DB do lỗi kết nối)");
    });
  };

  const handleCreateTable = () => {
    if (!newTable.TenBan || !newTable.MaKV) return alert("Vui lòng nhập tên bàn và chọn khu vực!");
    const generatedMaBan = "B" + Date.now().toString(36).toUpperCase();
    const payload = { MaBan: generatedMaBan, TenBan: newTable.TenBan, MaKV: newTable.MaKV, TrangThai: 'Trống' };

    axios.post('http://127.0.0.1:5000/api/tables', payload).then(() => {
      alert("Thêm bàn thành công!");
      setShowTableModal(false);
      setNewTable({ MaBan: '', TenBan: '', MaKV: '' });
      fetchTables();
    }).catch(() => {
      // Mock for frontend if backend not ready
      setTables([...tables, payload]);
      setShowTableModal(false);
      setNewTable({ MaBan: '', TenBan: '', MaKV: '' });
      alert("Đã thêm tạm (chưa lưu DB do lỗi kết nối)");
    });
  };

  const handleOrderItem = (maMon) => {
    if (!selectedTableId) return;
    if (!activeInvoiceId) {
      axios.post(`http://127.0.0.1:5000/api/invoice/create/${selectedTableId}`)
        .then(res => {
          const newId = res.data.MaHD;
          setActiveInvoiceId(newId);
          return axios.post(`http://127.0.0.1:5000/api/order`, { MaHD: newId, MaMon: maMon });
        }).then(() => { fetchTables(); fetchInvoices(selectedTableId); });
    } else {
      axios.post(`http://127.0.0.1:5000/api/order`, { MaHD: activeInvoiceId, MaMon: maMon })
        .then(() => { fetchTables(); fetchInvoices(selectedTableId); });
    }
  };

  const handleDecreaseItem = (maMon, maHd) => {
    axios.post(`http://127.0.0.1:5000/api/order/decrease`, { MaHD: maHd, MaMon: maMon })
      .then(() => { fetchTables(); fetchInvoices(selectedTableId); });
  };

  const handleCheckout = (maHd, phuongThuc) => {
    if (!window.confirm(`Xác nhận thanh toán ${phuongThuc} cho đơn này?`)) return;
    axios.post(`http://127.0.0.1:5000/api/checkout/${maHd}`, { PhuongThucTT: phuongThuc })
      .then(() => {
        alert(`Thanh toán thành công!`);
        fetchTables();
        fetchInvoices(selectedTableId);
      });
  };

  const handleUpdateTable = () => {
    if (!editTableData.TenBan) return alert("Vui lòng nhập tên bàn!");
    axios.put(`http://127.0.0.1:5000/api/tables/${editTableData.MaBan}`, { TenBan: editTableData.TenBan })
      .then(() => {
        alert("Cập nhật thành công!");
        setShowEditTableModal(false);
        fetchTables();
      })
      .catch(() => {
        // Fallback mock if PUT is not implemented
        setTables(tables.map(t => t.MaBan === editTableData.MaBan ? { ...t, TenBan: editTableData.TenBan } : t));
        setShowEditTableModal(false);
      });
  };

  const handleDeleteTable = (e, maBan) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Bạn có chắc muốn xóa bàn này?")) return;
    axios.delete(`http://127.0.0.1:5000/api/tables/${maBan}`)
      .then(() => fetchTables())
      .catch(err => {
        alert("Lỗi: " + (err.response?.data?.error || err.message));
        // Fallback mock nếu chưa nối được DB
        if (err.message === "Network Error") {
          setTables(tables.filter(t => t.MaBan !== maBan));
        }
      });
  };

  const handleDeleteInvoice = (e, maHd) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc muốn xóa đơn này? Thao tác không thể hoàn tác!")) return;
    axios.delete(`http://127.0.0.1:5000/api/invoices/${maHd}`)
      .then(() => {
        fetchTables();
        fetchInvoices(selectedTableId);
      })
      .catch(err => {
        alert("Lỗi: " + (err.response?.data?.error || err.message));
        if (err.message === "Network Error") {
          setTableInvoices(tableInvoices.filter(inv => inv.MaHD !== maHd));
        }
      });
  };

  const filteredMenu = selectedCategory === 'ALL' ? menu : menu.filter(mon => mon.MaDM === selectedCategory);


  return (
    <div className="app-container">

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#007bff" />
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#007bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Foody</span>
        </div>

        <div className="time-box">
          <h2 style={{ color: '#007bff', fontWeight: 'bold' }}>{timeStr}</h2>
          <p style={{ color: '#0056b3', fontWeight: '500' }}>{dayStr}, {dateStr}</p>
        </div>

        <div className="nav-menu">
          <button className={`nav-item ${activeTab === 'POS' ? 'active large' : ''}`} onClick={() => handleTabChange('POS')}><span style={{ fontSize: '24px', marginBottom: '5px' }}>🏠</span> Quản lý vị trí</button>
          <button className="nav-item"><span style={{ fontSize: '24px', marginBottom: '5px' }}>⏳</span>DV đang chờ</button>
          <button className="nav-item"><span style={{ fontSize: '24px', marginBottom: '5px' }}>📄</span>Hoá đơn</button>
          <button className="nav-item"><span style={{ fontSize: '24px', marginBottom: '5px' }}>🍽️</span>SP Dịch vụ</button>
          <button className="nav-item"><span style={{ fontSize: '24px', marginBottom: '5px' }}>⏱️</span>Ca làm việc</button>
          <button className="nav-item"><span style={{ fontSize: '24px', marginBottom: '5px' }}>👥</span>Nhân viên</button>
          <button className="nav-item"><span style={{ fontSize: '24px', marginBottom: '5px' }}>💰</span>Thu chi</button>
          <button className={`nav-item ${activeTab === 'REPORT' ? 'active large' : ''}`} onClick={() => handleTabChange('REPORT')}><span style={{ fontSize: '24px', marginBottom: '5px' }}>📊</span> Báo cáo</button>
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <h1 className="header-title">{activeTab === 'POS' ? 'QUẢN LÝ VỊ TRÍ' : 'BÁO CÁO TỔNG HỢP'}</h1>
          <div className="header-right">
            <span>Hoa Ngư Hoàng</span>
            <span>A10 TT11 Khu Đô Thị Văn Quán</span>
            <button className="icon-btn">🔔</button><button className="icon-btn">🎧</button><button className="icon-btn">☀️</button><button className="icon-btn">⛶</button>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#007bff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>AD</div>
          </div>
        </div>

        {activeTab === 'POS' && (
          <>
            <div className="date-tabs">
              {dateList.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`date-tab ${selectedDate === item.dateStr ? 'active' : ''}`}
                  onClick={() => setSelectedDate(item.dateStr)}
                >
                  <div className="date">{item.dateStr}</div>
                  <div className="day">{item.dayName}</div>
                </div>
              ))}
            </div>

            <div className="status-bar">
              <div className="status-tabs">
                <button className="status-tab active">Đơn tại vị trí</button>
              </div>
              <div className="summary-tags">
                <span className="summary-tag">Đang phục vụ {tables.filter(t => t.TrangThai !== 'Trống').length} bàn</span>
              </div>
            </div>

            <div className="filter-bar">
              <div className="filters">
                <button className="filter-chip active">Tất cả</button>
                {areasList.map(area => (
                  <button key={area.MaKV} className="filter-chip">{area.TenKV}</button>
                ))}
              </div>
              <div>
                <button className="btn-primary" onClick={() => setShowTableModal(true)} style={{ marginRight: '10px' }}>+ Thêm bàn</button>
                <button className="btn-primary" onClick={() => setShowAreaModal(true)}>+ Tạo khu vực</button>
              </div>
            </div>

            <div className="workspace">
              <div className="tables-grid">
                {areasList.map(area => {
                  const areaTables = tables.filter(t => t.MaKV === area.MaKV || (!t.MaKV && area.TenKV === 'Trong nhà'));
                  return (
                    <div key={area.MaKV} className="area-group">
                      <div className="area-title">{area.TenKV} ✎</div>
                      <div className="table-cards">
                        {areaTables.map(ban => (
                          <div key={ban.MaBan} className="table-wrapper">
                            <div className="chairs-row">
                              <div className="chair"></div>
                              <div className="chair"></div>
                            </div>
                            <div
                              className={`table-card ${selectedTableId === ban.MaBan ? 'active' : ''} ${ban.TrangThai !== 'Trống' ? 'occupied' : ''}`}
                              onClick={() => handleTableClick(ban.MaBan, ban.TenBan)}
                              style={{ position: 'relative' }}
                            >
                              <div className="table-name">
                                {ban.TenBan}
                                <span className="edit-icon" onClick={(e) => { e.stopPropagation(); setEditTableData({ MaBan: ban.MaBan, TenBan: ban.TenBan }); setShowEditTableModal(true); }}> ✎</span>
                              </div>
                              <div className="table-status" style={{ color: ban.TrangThai !== 'Trống' ? 'red' : 'transparent', marginTop: '5px', fontWeight: 'bold' }}>
                                {ban.TrangThai !== 'Trống' ? `${(ban.TienTamTinh || 0).toLocaleString('vi-VN')} đ` : '0 đ'}
                              </div>
                            </div>
                            <div className="chairs-row">
                              <div className="chair"></div>
                              <div className="chair"></div>
                              <div className="chair"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedTableId && (
                <div className="full-screen-order">
                  <div className="order-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                    <button onClick={() => setSelectedTableId(null)} style={{ background: '#e6f2ff', color: '#007bff', border: 'none', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{'<'} Quay lại</span>
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Mã HĐ: Vị trí {selectedTableTitle}</h3>
                      <div style={{ fontSize: '12px', color: '#777', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <span>Thời gian đặt lịch: --/--</span>
                        <span>Thời gian hoạt động: --/--</span>
                        <span>Nhân viên phục vụ: --</span>
                      </div>
                    </div>
                    <div></div>
                  </div>

                  <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div className="order-left-pane" style={{ flex: 2, padding: '20px', borderRight: '1px solid #eee', overflowY: 'auto', backgroundColor: '#fafbfc' }}>
                      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        <input type="text" placeholder="🔍 Tìm SP Dịch vụ" style={{ flex: 1, padding: '10px 15px', border: '1px solid #ddd', borderRadius: '4px' }} />
                      </div>

                      <div className="menu-categories" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        <span onClick={() => setSelectedCategory('ALL')} style={{ cursor: 'pointer', fontWeight: selectedCategory === 'ALL' ? 'bold' : 'normal', color: selectedCategory === 'ALL' ? '#007bff' : '#555', borderBottom: selectedCategory === 'ALL' ? '2px solid #007bff' : 'none', paddingBottom: '10px' }}>Tất cả</span>
                        {categories.map(dm => (
                          <span key={dm.MaDM} onClick={() => setSelectedCategory(dm.MaDM)} style={{ cursor: 'pointer', fontWeight: selectedCategory === dm.MaDM ? 'bold' : 'normal', color: selectedCategory === dm.MaDM ? '#007bff' : '#555', borderBottom: selectedCategory === dm.MaDM ? '2px solid #007bff' : 'none', paddingBottom: '10px' }}>{dm.TenDM}</span>
                        ))}
                      </div>

                      <div className="menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {filteredMenu.map(mon => (
                          <div key={mon.MaMon} className="menu-item-card" onClick={() => handleOrderItem(mon.MaMon)} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '15px', display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer', border: '1px solid #eee', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                            <div style={{ width: '60px', height: '60px', backgroundColor: '#f0f2f5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#888' }}>
                              🍽️
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Đồ ăn</div>
                              <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px', color: '#333' }}>{mon.TenMon}</div>
                              <div style={{ fontWeight: 'bold', color: '#000', fontSize: '14px' }}>Giá: {mon.DonGia.toLocaleString('vi-VN')} VNĐ</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="order-right-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
                      <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '4px', textAlign: 'center', fontSize: '14px' }}>Thời gian đặt lịch: {timeStr.substring(0, 5)} {dateStr.substring(0, 5)}</div>
                        <div style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '4px', textAlign: 'center', fontSize: '14px' }}>Nhân viên phục vụ: --</div>
                      </div>

                      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                        {tableInvoices.length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                            <button onClick={handleCreateInvoice} style={{ padding: '8px 12px', backgroundColor: '#e6f2ff', color: '#007bff', border: '1px solid #007bff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>+ Tạo đơn mới</button>
                          </div>
                        )}
                        {tableInvoices.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <p style={{ color: '#888' }}>Bàn đang trống</p>
                            <button onClick={handleCreateInvoice} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Tạo hóa đơn mới</button>
                          </div>
                        ) : (
                          tableInvoices.map((inv, index) => {
                            const isActive = activeInvoiceId === inv.MaHD;
                            return (
                              <div key={inv.MaHD} onClick={() => setActiveInvoiceId(inv.MaHD)} style={{ marginBottom: '20px', border: isActive ? '2px solid #007bff' : '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ backgroundColor: isActive ? '#e6f2ff' : '#f9f9f9', padding: '10px 15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
                                  <span style={{ color: isActive ? '#007bff' : '#333' }}>Đơn #{index + 1} {isActive && '(Đang chọn)'}</span>
                                  <div style={{ display: 'flex', gap: '15px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMoveInvoiceId(inv.MaHD); setShowMoveModal(true); }} style={{ background: 'transparent', border: 'none', color: '#007bff', cursor: 'pointer' }}>Chuyển bàn</button>
                                    <button onClick={(e) => handleDeleteInvoice(e, inv.MaHD)} style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer' }}>Xóa</button>
                                  </div>
                                </div>
                                <div style={{ padding: '10px' }}>
                                  {inv.Items.map((mon, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #eee' }}>
                                      <div style={{ flex: 1, fontSize: '14px' }}>{mon.TenMon}</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button onClick={(e) => { e.stopPropagation(); handleDecreaseItem(mon.MaMon, inv.MaHD); }} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>-</button>
                                        <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{mon.SoLuong}</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleOrderItem(mon.MaMon); }} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>+</button>
                                      </div>
                                      <div style={{ width: '80px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>{mon.ThanhTien.toLocaleString('vi-VN')}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderTop: '1px solid #eee' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#555' }}>
                          <span>Tổng hóa đơn</span>
                          <span style={{ fontWeight: 'bold', color: '#333' }}>{tableInvoices.find(i => i.MaHD === activeInvoiceId)?.Items.reduce((sum, item) => sum + item.ThanhTien, 0).toLocaleString('vi-VN') || 0} VNĐ</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#555' }}>
                          <span>Chiết khấu</span>
                          <span style={{ color: '#dc3545' }}>-0 VNĐ</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>
                          <span>Thành tiền</span>
                          <span style={{ color: '#007bff' }}>{tableInvoices.find(i => i.MaHD === activeInvoiceId)?.Items.reduce((sum, item) => sum + item.ThanhTien, 0).toLocaleString('vi-VN') || 0} VNĐ</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => activeInvoiceId && setShowCheckoutModal(true)} style={{ flex: 1, padding: '15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Thanh toán</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'REPORT' && (
          <div style={{ padding: '20px', backgroundColor: '#f4f6f8', height: '100%' }}>
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h2 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px', marginBottom: '20px' }}>BÁO CÁO PHƯƠNG THỨC THANH TOÁN</h2>
              {revenueData.length === 0 ? <p>Chưa có dữ liệu.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                      <th style={{ padding: '15px', borderBottom: '2px solid #ddd' }}>Ngày Bán</th><th style={{ padding: '15px', borderBottom: '2px solid #ddd' }}>Phương Thức</th><th style={{ padding: '15px', borderBottom: '2px solid #ddd', textAlign: 'center' }}>Số Lượng Đơn</th><th style={{ padding: '15px', borderBottom: '2px solid #ddd', textAlign: 'right' }}>Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '15px', fontWeight: 'bold' }}>{row.Ngay}</td>
                        <td style={{ padding: '15px' }}>{row.PhuongThucTT === 'Chuyển khoản' ? '💳 Chuyển khoản' : '💵 Tiền mặt'}</td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>{row.SoHoaDon} đơn</td>
                        <td style={{ padding: '15px', textAlign: 'right', color: 'red', fontWeight: 'bold' }}>{row.TongDoanhThu.toLocaleString('vi-VN')} đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>

      {showMoveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginTop: 0 }}>🔄 Chuyển / Gộp Bàn</h3>
            <p>Từ bàn: <strong>{selectedTableTitle}</strong></p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Chọn bàn đích:</label>
              <select value={targetTableId} onChange={(e) => setTargetTableId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">-- Click để chọn --</option>
                {tables.filter(t => t.MaBan !== selectedTableId).map(t => (
                  <option key={t.MaBan} value={t.MaBan}>{t.TenBan} {t.TrangThai !== 'Trống' ? '(Đang có khách -> Gộp)' : '(Trống -> Chuyển)'}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowMoveModal(false)} className="btn-secondary">Hủy</button>
              <button onClick={handleMoveMerge} className="btn-primary">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SỬA VỊ TRÍ */}
      {showEditTableModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>Sửa vị trí</h3>
              <button onClick={() => setShowEditTableModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            </div>
            <div className="form-group" style={{ marginBottom: '30px' }}>
              <label style={{ color: '#dc3545', display: 'flex', gap: '5px', alignItems: 'center' }}><span style={{ color: 'red' }}>*</span> Tên vị trí</label>
              <input type="text" value={editTableData.TenBan} onChange={e => setEditTableData({ ...editTableData, TenBan: e.target.value })} style={{ padding: '12px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => { setShowEditTableModal(false); handleDeleteTable(null, editTableData.MaBan); }} style={{ flex: 1, padding: '12px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Xoá vị trí</button>
              <button onClick={handleUpdateTable} style={{ flex: 1, padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Lưu thông tin</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO KHU VỰC */}
      {showAreaModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>+ Tạo Khu Vực Mới</h3>
            <div className="form-group">
              <label>Tên Khu Vực</label>
              <input type="text" value={newArea.TenKV} onChange={e => setNewArea({ ...newArea, TenKV: e.target.value })} placeholder="VD: Sân vườn" />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowAreaModal(false)} className="btn-secondary">Hủy</button>
              <button onClick={handleCreateArea} className="btn-primary">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM BÀN */}
      {showTableModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>+ Thêm Bàn Mới</h3>
            <div className="form-group">
              <label>Tên Bàn</label>
              <input type="text" value={newTable.TenBan} onChange={e => setNewTable({ ...newTable, TenBan: e.target.value })} placeholder="VD: Bàn 1" />
            </div>
            <div className="form-group">
              <label>Thuộc Khu Vực</label>
              <select value={newTable.MaKV} onChange={e => setNewTable({ ...newTable, MaKV: e.target.value })}>
                <option value="">-- Chọn khu vực --</option>
                {areasList.map(area => (
                  <option key={area.MaKV} value={area.MaKV}>{area.TenKV}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowTableModal(false)} className="btn-secondary">Hủy</button>
              <button onClick={handleCreateTable} className="btn-primary">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THANH TOÁN */}
      {showCheckoutModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>Thanh toán hóa đơn</h3>
              <button onClick={() => setShowCheckoutModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => setCheckoutMethod('Chuyển khoản')} style={{ flex: 1, padding: '10px', fontWeight: 'bold', border: checkoutMethod === 'Chuyển khoản' ? '2px solid #007bff' : '1px solid #ccc', background: checkoutMethod === 'Chuyển khoản' ? '#e6f2ff' : 'white', color: checkoutMethod === 'Chuyển khoản' ? '#007bff' : '#555', borderRadius: '6px', cursor: 'pointer' }}>💳 Chuyển khoản</button>
              <button onClick={() => setCheckoutMethod('Tiền mặt')} style={{ flex: 1, padding: '10px', fontWeight: 'bold', border: checkoutMethod === 'Tiền mặt' ? '2px solid #007bff' : '1px solid #ccc', background: checkoutMethod === 'Tiền mặt' ? '#e6f2ff' : 'white', color: checkoutMethod === 'Tiền mặt' ? '#007bff' : '#555', borderRadius: '6px', cursor: 'pointer' }}>💵 Tiền mặt</button>
            </div>

            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#333' }}>Mã HĐ: {activeInvoiceId}</div>
                <div style={{ fontSize: '13px', color: '#777', marginTop: '5px' }}>Thời gian: {timeStr.substring(0, 5)} - {dateStr}</div>
              </div>

              {checkoutMethod === 'Chuyển khoản' && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                  <div style={{ width: '150px', height: '150px', backgroundColor: 'white', border: '1px solid #ddd', padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/QR.png" alt="QR Code" style={{ width: '100%', height: '100%' }} />
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                  <span>Tổng tiền hàng:</span>
                  <span>{tableInvoices.find(i => i.MaHD === activeInvoiceId)?.Items.reduce((sum, item) => sum + item.ThanhTien, 0).toLocaleString('vi-VN') || 0} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
                  <span>Khách cần trả:</span>
                  <span>{tableInvoices.find(i => i.MaHD === activeInvoiceId)?.Items.reduce((sum, item) => sum + item.ThanhTien, 0).toLocaleString('vi-VN') || 0} đ</span>
                </div>
              </div>
            </div>

            <button onClick={() => { handleCheckout(activeInvoiceId, checkoutMethod); setShowCheckoutModal(false); }} style={{ width: '100%', padding: '15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Xác nhận thanh toán</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;

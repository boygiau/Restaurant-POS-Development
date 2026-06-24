import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from './api';
import { useAuth } from './AuthContext';
import KitchenQueue from './components/KitchenQueue';
import MenuManager from './components/Admin/MenuManager';
import StaffManager from './components/Admin/StaffManager';
import ThuChi from './components/ThuChi';
import Invoices from './components/Invoices';
import {
  FiGrid, FiCoffee, FiBookOpen, FiUsers, FiBarChart2,
  FiLogOut, FiBell, FiEdit2, FiPlus, FiArrowLeft, FiPrinter, FiX,
  FiCreditCard, FiDollarSign, FiTrendingUp, FiScissors, FiRepeat, FiTrash2, FiFileText,
} from 'react-icons/fi';
import './App.css';

const W = {
  primary: '#8B5E3C',
  light: '#F5EDE3',
  border: '#D4B89A',
  text: '#4A2C0A',
  subtext: '#8C6A4A',
  bg: '#FAF4EE',
  occupied: '#E8956D',
};

function App() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const canSell = hasRole('Phục vụ', 'Thu ngân');
  const [activeTab, setActiveTab] = useState(user?.VaiTro === 'Bếp' ? 'KITCHEN' : 'POS');

  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [overview, setOverview] = useState(null);
  const [reportRange, setReportRange] = useState({ tu: '', den: '' });
  const [employeeData, setEmployeeData] = useState([]);
  const [areasList, setAreasList] = useState([]);

  const [showAreaModal, setShowAreaModal] = useState(false);
  const [newArea, setNewArea] = useState({ MaKV: '', TenKV: '' });

  const [showTableModal, setShowTableModal] = useState(false);
  const [newTable, setNewTable] = useState({ MaBan: '', TenBan: '', MaKV: '' });

  const [showEditAreaModal, setShowEditAreaModal] = useState(false);
  const [editAreaData, setEditAreaData] = useState({ MaKV: '', TenKV: '' });

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

  // Tách hóa đơn (Phase 4)
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitSourceId, setSplitSourceId] = useState(null);
  const [splitQty, setSplitQty] = useState({});

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
  const [chietKhau, setChietKhau] = useState(0);
  const [thueVAT, setThueVAT] = useState(0);

  const [currentTime, setCurrentTime] = useState(new Date());

  const receiptRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = currentTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dayStr = currentTime.toLocaleDateString('vi-VN', { weekday: 'long' });

  const fetchTables = () => api.get('/api/tables').then(res => setTables(res.data)).catch(() => { });
  const fetchMenu = () => api.get('/api/menu').then(res => setMenu(res.data)).catch(() => { });
  const fetchCategories = () => api.get('/api/categories').then(res => setCategories(res.data)).catch(() => { });
  const fetchOverview = (range = reportRange) => {
    const params = {};
    if (range.tu) params.tu = range.tu;
    if (range.den) params.den = range.den;
    return api.get('/api/reports/overview', { params }).then(res => setOverview(res.data)).catch(() => setOverview(null));
  };
  const fetchEmployee = () => api.get('/api/reports/employee').then(res => setEmployeeData(res.data)).catch(() => setEmployeeData([]));
  const fetchAreas = () => api.get('/api/areas').then(res => setAreasList(res.data)).catch(() => setAreasList([{ MaKV: 'KV1', TenKV: 'Trong nhà' }]));
  const fetchInvoices = (maBan) => {
    api.get(`/api/invoices/${maBan}`).then(res => {
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
    if (canSell) { fetchTables(); fetchMenu(); fetchCategories(); fetchAreas(); }
  }, [canSell]);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'REPORT') { fetchOverview(); fetchEmployee(); }
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
    api.post(`/api/invoice/create/${selectedTableId}`)
      .then(res => {
        fetchTables();
        fetchInvoices(selectedTableId);
        setActiveInvoiceId(res.data.MaHD);
      });
  };

  const handleMoveMerge = () => {
    if (!targetTableId) return alert("Vui lòng chọn bàn đích!");
    api.post('/api/tables/move_merge', { MaHD: activeMoveInvoiceId, BanCu: selectedTableId, BanMoi: targetTableId })
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
    api.post('/api/areas', payload).then(() => {
      alert("Tạo khu vực thành công!");
      setShowAreaModal(false);
      setNewArea({ MaKV: '', TenKV: '' });
      fetchAreas();
    }).catch((err) => alert("Lỗi: " + (err.response?.data?.error || err.message)));
  };

  const handleUpdateArea = () => {
    if (!editAreaData.TenKV) return alert("Vui lòng nhập tên khu vực!");
    api.put(`/api/areas/${editAreaData.MaKV}`, { TenKV: editAreaData.TenKV })
      .then(() => { alert("Cập nhật khu vực thành công!"); setShowEditAreaModal(false); fetchAreas(); })
      .catch((err) => alert("Lỗi: " + (err.response?.data?.error || err.message)));
  };

  const handleDeleteArea = (makv) => {
    if (!window.confirm("Bạn có chắc muốn xóa khu vực này?")) return;
    api.delete(`/api/areas/${makv}`)
      .then(() => { setShowEditAreaModal(false); fetchAreas(); })
      .catch((err) => alert("Lỗi: " + (err.response?.data?.error || err.message)));
  };

  const handleCreateTable = () => {
    if (!newTable.TenBan || !newTable.MaKV) return alert("Vui lòng nhập tên bàn và chọn khu vực!");
    const generatedMaBan = "B" + Date.now().toString(36).toUpperCase();
    const payload = { MaBan: generatedMaBan, TenBan: newTable.TenBan, MaKV: newTable.MaKV };
    api.post('/api/tables', payload).then(() => {
      alert("Thêm bàn thành công!");
      setShowTableModal(false);
      setNewTable({ MaBan: '', TenBan: '', MaKV: '' });
      fetchTables();
    }).catch((err) => alert("Lỗi: " + (err.response?.data?.error || err.message)));
  };

  const handleOrderItem = (maMon) => {
    if (!selectedTableId) return;
    if (!activeInvoiceId) {
      api.post(`/api/invoice/create/${selectedTableId}`)
        .then(res => {
          const newId = res.data.MaHD;
          setActiveInvoiceId(newId);
          return api.post(`/api/order`, { MaHD: newId, MaMon: maMon });
        }).then(() => { fetchTables(); fetchInvoices(selectedTableId); });
    } else {
      api.post(`/api/order`, { MaHD: activeInvoiceId, MaMon: maMon })
        .then(() => { fetchTables(); fetchInvoices(selectedTableId); });
    }
  };

  const handleDecreaseItem = (maMon, maHd) => {
    api.post(`/api/order/decrease`, { MaHD: maHd, MaMon: maMon })
      .then(() => { fetchTables(); fetchInvoices(selectedTableId); });
  };

  const handleCheckout = (maHd, phuongThuc) => {
    api.post(`/api/checkout/${maHd}`, { PhuongThucTT: phuongThuc, ChietKhau: chietKhau, ThueVAT: thueVAT })
      .then(() => {
        alert(`Thanh toán thành công!`);
        setChietKhau(0); setThueVAT(0);
        fetchTables();
        fetchInvoices(selectedTableId);
      })
      .catch(err => alert("Lỗi: " + (err.response?.data?.error || err.message)));
  };

  const handleUpdateTable = () => {
    if (!editTableData.TenBan) return alert("Vui lòng nhập tên bàn!");
    api.put(`/api/tables/${editTableData.MaBan}`, { TenBan: editTableData.TenBan })
      .then(() => { alert("Cập nhật thành công!"); setShowEditTableModal(false); fetchTables(); })
      .catch((err) => alert("Lỗi: " + (err.response?.data?.error || err.message)));
  };

  const handleDeleteTable = (e, maBan) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Bạn có chắc muốn xóa bàn này?")) return;
    api.delete(`/api/tables/${maBan}`)
      .then(() => fetchTables())
      .catch(err => alert("Lỗi: " + (err.response?.data?.error || err.message)));
  };

  const handleDeleteInvoice = (e, maHd) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc muốn xóa đơn này? Thao tác không thể hoàn tác!")) return;
    api.delete(`/api/invoices/${maHd}`)
      .then(() => { fetchTables(); fetchInvoices(selectedTableId); })
      .catch(err => alert("Lỗi: " + (err.response?.data?.error || err.message)));
  };

  const openSplit = (maHd) => {
    setSplitSourceId(maHd);
    setSplitQty({});
    setShowSplitModal(true);
  };

  const handleSplit = () => {
    const items = Object.entries(splitQty)
      .map(([MaMon, SoLuong]) => ({ MaMon, SoLuong: Number(SoLuong) }))
      .filter(it => it.SoLuong > 0);
    if (items.length === 0) return alert("Chọn ít nhất 1 món để tách!");
    api.post('/api/invoice/split', { MaHD: splitSourceId, Items: items })
      .then(() => { setShowSplitModal(false); fetchTables(); fetchInvoices(selectedTableId); })
      .catch(err => alert("Lỗi: " + (err.response?.data?.error || err.message)));
  };

  const filteredMenu = selectedCategory === 'ALL' ? menu : menu.filter(mon => mon.MaDM === selectedCategory);

  const activeInvoice = tableInvoices.find(i => i.MaHD === activeInvoiceId);
  const subtotal = activeInvoice?.Items.reduce((sum, item) => sum + item.ThanhTien, 0) || 0;
  const splitSource = tableInvoices.find(i => i.MaHD === splitSourceId);
  const discountAmount = Math.round(subtotal * (chietKhau / 100));
  const vatAmount = Math.round((subtotal - discountAmount) * (thueVAT / 100));
  const grandTotal = subtotal - discountAmount + vatAmount;

  const navItems = [
    { key: 'POS', icon: FiGrid, label: 'Quản lý vị trí', show: canSell },
    { key: 'KITCHEN', icon: FiCoffee, label: 'Dịch vụ đang chờ', show: canSell || hasRole('Bếp') },
    { key: 'MENU', icon: FiBookOpen, label: 'Sản phẩm dịch vụ', show: canSell },
    { key: 'STAFF', icon: FiUsers, label: 'Nhân viên', show: canSell },
    { key: 'ORDERS', icon: FiFileText, label: 'Hóa đơn', show: canSell },
    { key: 'THUCHI', icon: FiDollarSign, label: 'Thu chi', show: canSell },
    { key: 'REPORT', icon: FiBarChart2, label: 'Báo cáo', show: hasRole() },
  ].filter(item => item.show);

  const headerTitle = {
    POS: 'QUẢN LÝ VỊ TRÍ', KITCHEN: 'DỊCH VỤ ĐANG CHỜ', MENU: 'SẢN PHẨM DỊCH VỤ',
    STAFF: 'QUẢN LÝ NHÂN VIÊN', ORDERS: 'HÓA ĐƠN', THUCHI: 'SỔ THU CHI', REPORT: 'BÁO CÁO TỔNG HỢP',
  }[activeTab] || '';

  return (
    <div className="app-container">

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="logo">
          <span style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg, #C49A6C, #8B5E3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '17px' }}>F</span>
          <span>Foody</span>
        </div>

        <div className="time-box">
          <h2>{timeStr}</h2>
          <p>{dayStr}, {dateStr}</p>
        </div>

        <div className="nav-menu">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => handleTabChange(item.key)}
              >
                <Icon size={22} style={{ marginBottom: '6px' }} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button className="nav-item" onClick={handleLogout} style={{ marginTop: 'auto', width: '100%', color: '#E8956D', borderColor: 'rgba(232,149,109,0.3)' }}>
            <FiLogOut size={22} style={{ marginBottom: '6px' }} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <h1 className="header-title">{headerTitle}</h1>
          <div className="header-right">
            <span style={{ fontWeight: 600, color: W.text }}>{user?.TenNV}</span>
            <span style={{ background: W.light, color: W.primary, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, border: `1px solid ${W.border}` }}>{user?.VaiTro}</span>
            <button className="icon-btn"><FiBell size={17} /></button>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5E3C, #6B4226)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px', boxShadow: '0 2px 8px rgba(139,94,60,0.4)' }}>
              {(user?.TenNV || 'AD').split(' ').pop().charAt(0)}
            </div>
          </div>
        </div>

        {activeTab === 'KITCHEN' && <KitchenQueue />}
        {activeTab === 'MENU' && <MenuManager />}
        {activeTab === 'STAFF' && <StaffManager />}
        {activeTab === 'THUCHI' && <ThuChi />}
        {activeTab === 'ORDERS' && <Invoices />}

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
                <span className="summary-tag">Đang phục vụ {tables.filter(t => (t.TienTamTinh || 0) > 0).length} bàn</span>
              </div>
            </div>

            <div className="filter-bar">
              <div className="filters">
                <button className="filter-chip active">Tất cả</button>
                {areasList.map(area => (
                  <button key={area.MaKV} className="filter-chip">{area.TenKV}</button>
                ))}
              </div>
              {hasRole() && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-primary" onClick={() => setShowTableModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FiPlus size={15} /> Thêm bàn</button>
                  <button className="btn-primary" onClick={() => setShowAreaModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FiPlus size={15} /> Tạo khu vực</button>
                </div>
              )}
            </div>

            <div className="workspace">
              <div className="tables-grid">
                {areasList.map(area => {
                  const areaTables = tables.filter(t => t.MaKV === area.MaKV || (!t.MaKV && area.TenKV === 'Trong nhà'));
                  return (
                    <div key={area.MaKV} className="area-group">
                      <div className="area-title">
                        {area.TenKV}
                        {hasRole() && (
                          <FiEdit2
                            className="edit-icon"
                            size={13}
                            onClick={() => { setEditAreaData({ MaKV: area.MaKV, TenKV: area.TenKV }); setShowEditAreaModal(true); }}
                          />
                        )}
                      </div>
                      <div className="table-cards">
                        {areaTables.map(ban => (
                          <div key={ban.MaBan} className="table-wrapper">
                            <div className="chairs-row">
                              <div className="chair"></div>
                              <div className="chair"></div>
                            </div>
                            <div
                              className={`table-card ${selectedTableId === ban.MaBan ? 'active' : ''} ${(ban.TienTamTinh || 0) > 0 ? 'occupied' : ''}`}
                              onClick={() => handleTableClick(ban.MaBan, ban.TenBan)}
                              style={{ position: 'relative' }}
                            >
                              <div className="table-name">
                                {ban.TenBan}
                                {hasRole() && (
                                  <FiEdit2
                                    className="edit-icon"
                                    size={13}
                                    onClick={(e) => { e.stopPropagation(); setEditTableData({ MaBan: ban.MaBan, TenBan: ban.TenBan }); setShowEditTableModal(true); }}
                                  />
                                )}
                              </div>
                              <div className="table-status" style={{ marginTop: '5px', fontWeight: 'bold' }}>
                                {(ban.TienTamTinh || 0) > 0 ? `${ban.TienTamTinh.toLocaleString('vi-VN')} đ` : 'Trống'}
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
                  <div className="order-header" style={{ padding: '15px 20px', borderBottom: `1px solid ${W.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                    <button onClick={() => setSelectedTableId(null)} style={{ background: W.light, color: W.primary, border: `1px solid ${W.border}`, padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiArrowLeft size={16} /> <span>Quay lại</span>
                    </button>
                    <div style={{ textAlign: 'center' }}>
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>Vị trí {selectedTableTitle}</h3>
                    </div>
                    <div></div>
                  </div>

                  <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    <div className="order-left-pane" style={{ flex: 2, padding: '20px', borderRight: '1px solid #eee', overflowY: 'auto', backgroundColor: '#fafbfc' }}>
                      <div className="menu-categories" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', flexWrap: 'wrap' }}>
                        <span onClick={() => setSelectedCategory('ALL')} style={{ cursor: 'pointer', fontWeight: selectedCategory === 'ALL' ? 'bold' : 'normal', color: selectedCategory === 'ALL' ? W.primary : '#555' }}>Tất cả</span>
                        {categories.map(dm => (
                          <span key={dm.MaDM} onClick={() => setSelectedCategory(dm.MaDM)} style={{ cursor: 'pointer', fontWeight: selectedCategory === dm.MaDM ? 'bold' : 'normal', color: selectedCategory === dm.MaDM ? W.primary : '#555' }}>{dm.TenDM}</span>
                        ))}
                      </div>

                      <div className="menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {filteredMenu.map(mon => (
                          <div key={mon.MaMon} className="menu-item-card" onClick={() => handleOrderItem(mon.MaMon)} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '15px', display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer', border: '1px solid #eee' }}>
                            <div style={{ width: '60px', height: '60px', backgroundColor: W.light, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: W.primary }}><FiCoffee size={26} /></div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px', color: '#333' }}>{mon.TenMon}</div>
                              <div style={{ fontWeight: 'bold', color: '#000', fontSize: '14px' }}>Giá: {mon.DonGia.toLocaleString('vi-VN')} VNĐ</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="order-right-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                        {tableInvoices.length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                            <button onClick={handleCreateInvoice} style={{ padding: '8px 12px', backgroundColor: W.light, color: W.primary, border: `1px solid ${W.primary}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>+ Tạo đơn mới</button>
                          </div>
                        )}
                        {tableInvoices.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <p style={{ color: '#888' }}>Bàn đang trống</p>
                            <button onClick={handleCreateInvoice} style={{ padding: '10px 20px', backgroundColor: W.primary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Tạo hóa đơn mới</button>
                          </div>
                        ) : (
                          tableInvoices.map((inv, index) => {
                            const isActive = activeInvoiceId === inv.MaHD;
                            return (
                              <div key={inv.MaHD} onClick={() => setActiveInvoiceId(inv.MaHD)} style={{ marginBottom: '20px', border: isActive ? `2px solid ${W.primary}` : '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ backgroundColor: isActive ? W.light : '#f9f9f9', padding: '10px 15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${W.border}` }}>
                                  <span style={{ color: isActive ? W.primary : '#333' }}>Đơn #{index + 1} {isActive && '(Đang chọn)'}</span>
                                  <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); openSplit(inv.MaHD); }} style={{ background: 'transparent', border: 'none', color: '#fd7e14', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiScissors size={13} /> Tách bill</button>
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMoveInvoiceId(inv.MaHD); setShowMoveModal(true); }} style={{ background: 'transparent', border: 'none', color: W.primary, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiRepeat size={13} /> Chuyển bàn</button>
                                    <button onClick={(e) => handleDeleteInvoice(e, inv.MaHD)} style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiTrash2 size={13} /> Xóa</button>
                                  </div>
                                </div>
                                <div style={{ padding: '10px' }}>
                                  {inv.Items.map((mon, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #eee' }}>
                                      <div style={{ flex: 1, fontSize: '14px' }}>
                                        {mon.TenMon}
                                        <span style={{ fontSize: '11px', marginLeft: '6px', color: mon.TrangThaiMon === 'Xong' ? '#28a745' : '#ff9800' }}>● {mon.TrangThaiMon}</span>
                                      </div>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>
                          <span>Tạm tính</span>
                          <span style={{ color: '#007bff' }}>{subtotal.toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => { if (activeInvoiceId && hasRole('Thu ngân')) { setChietKhau(0); setThueVAT(0); setShowCheckoutModal(true); } }}
                            disabled={!hasRole('Thu ngân')}
                            style={{ flex: 1, padding: '15px', backgroundColor: hasRole('Thu ngân') ? W.primary : '#ccc', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: hasRole('Thu ngân') ? 'pointer' : 'not-allowed', fontSize: '16px' }}
                          >
                            {hasRole('Thu ngân') ? 'Thanh toán' : 'Chỉ Thu ngân được thanh toán'}
                          </button>
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
          <div style={{ padding: '20px', backgroundColor: W.bg, height: '100%', overflowY: 'auto' }}>
            {!overview ? <p style={{ color: W.subtext }}>Đang tải dữ liệu...</p> : (() => {
              const methodIcon = (m) => (m === 'Chuyển khoản' ? <FiCreditCard size={22} color={W.primary} /> : <FiDollarSign size={22} color={W.primary} />);
              const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
              const reportCard = (title, value, Icon, color) => (
                <div style={{ flex: 1, minWidth: '200px', background: '#fff', border: `1px solid ${W.border}`, borderRadius: '12px', padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(139,94,60,0.08)' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: W.subtext, marginBottom: '6px' }}>{title}</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: color || W.text }}>{value}</div>
                  </div>
                  <span style={{ width: '46px', height: '46px', borderRadius: '50%', background: W.light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={22} color={W.primary} /></span>
                </div>
              );
              const byMethod = {};
              overview.TheoPhuongThuc.forEach(m => { byMethod[m.PhuongThucTT] = m.DoanhThu; });
              const dateInput = { padding: '9px 12px', border: `1px solid ${W.border}`, borderRadius: '8px', fontSize: '13px', color: W.text, background: '#fff', outline: 'none' };
              const applyRange = (r) => { setReportRange(r); fetchOverview(r); };

              return (
                <>
                  {/* Lọc theo khoảng thời gian */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <span style={{ fontSize: '13px', color: W.subtext, fontWeight: 600 }}>Khoảng thời gian:</span>
                    <input type="date" value={reportRange.tu} onChange={(e) => applyRange({ ...reportRange, tu: e.target.value })} style={dateInput} />
                    <span style={{ color: W.subtext }}>→</span>
                    <input type="date" value={reportRange.den} onChange={(e) => applyRange({ ...reportRange, den: e.target.value })} style={dateInput} />
                    {(reportRange.tu || reportRange.den) && (
                      <button onClick={() => applyRange({ tu: '', den: '' })} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>Tất cả</button>
                    )}
                  </div>

                  {/* Thẻ tổng hợp */}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {reportCard('Tổng doanh thu', fmt(overview.TongDoanhThu) + ' đ', FiTrendingUp, W.primary)}
                    {reportCard('Số hóa đơn', overview.SoHoaDon + ' đơn', FiBookOpen)}
                    {reportCard('Tiền mặt', fmt(byMethod['Tiền mặt']) + ' đ', FiDollarSign)}
                    {reportCard('Chuyển khoản', fmt(byMethod['Chuyển khoản']) + ' đ', FiCreditCard)}
                  </div>

                  {/* Khung giờ cao điểm */}
                  <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginBottom: '20px', border: `1px solid ${W.border}` }}>
                    <h2 style={{ margin: '0 0 16px', fontSize: '17px', color: W.text, display: 'flex', alignItems: 'center', gap: '8px' }}><FiTrendingUp size={20} color={W.primary} /> Khung giờ cao điểm (số đơn theo giờ)</h2>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={overview.TheoGio}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EEE3D5" />
                        <XAxis dataKey="Gio" tick={{ fontSize: 11, fill: W.subtext }} interval={1} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: W.subtext }} />
                        <Tooltip formatter={(v, name) => name === 'Doanh thu' ? fmt(v) + ' đ' : v + ' đơn'} />
                        <Bar dataKey="SoHoaDon" name="Số đơn" fill={W.primary} radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bán chạy + Phương thức TT */}
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <div style={{ flex: 1, minWidth: '340px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: `1px solid ${W.border}` }}>
                      <h2 style={{ margin: '0 0 16px', fontSize: '17px', color: W.text }}>Sản phẩm bán chạy</h2>
                      {overview.BanChay.length === 0 ? <p style={{ color: W.subtext }}>Chưa có dữ liệu.</p> : (() => {
                        const maxQty = Math.max(...overview.BanChay.map(r => r.SoLuong), 1);
                        const rankColor = ['#C8961E', '#9AA0A6', '#B0763C'];
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {overview.BanChay.map((r, i) => (
                              <div key={i}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: rankColor[i] || W.subtext, color: '#fff', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                                    <span style={{ fontWeight: 700, color: W.text }}>{r.TenMon}</span>
                                    <span style={{ fontSize: '12px', color: W.subtext }}>· {r.Loai}</span>
                                  </span>
                                  <span style={{ fontWeight: 700, color: W.text }}>{r.SoLuong} <span style={{ fontSize: '12px', fontWeight: 400, color: W.subtext }}>phần</span></span>
                                </div>
                                <div style={{ background: W.light, borderRadius: '20px', height: '12px', overflow: 'hidden' }}>
                                  <div style={{ width: `${(r.SoLuong / maxQty) * 100}%`, height: '100%', background: `linear-gradient(90deg, #C49A6C, ${W.primary})`, borderRadius: '20px', transition: 'width .3s' }} />
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: W.primary, fontWeight: 700, marginTop: '4px' }}>{fmt(r.DoanhThu)} đ</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ flex: 1, minWidth: '300px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: `1px solid ${W.border}` }}>
                      <h2 style={{ margin: '0 0 16px', fontSize: '17px', color: W.text }}>Phương thức thanh toán</h2>
                      {overview.TheoPhuongThuc.length === 0 ? <p style={{ color: W.subtext }}>Chưa có dữ liệu.</p> : overview.TheoPhuongThuc.map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #F0E6D8' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color: W.text, fontWeight: 600 }}>{methodIcon(m.PhuongThucTT)} {m.PhuongThucTT}</span>
                          <span style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 800, color: W.primary }}>{fmt(m.DoanhThu)} đ</span>
                            <span style={{ display: 'block', fontSize: '12px', color: W.subtext }}>{m.SoHoaDon} đơn</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hiệu suất nhân viên */}
                  <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: `1px solid ${W.border}` }}>
                    <h2 style={{ margin: '0 0 16px', fontSize: '17px', color: W.text, display: 'flex', alignItems: 'center', gap: '8px' }}><FiUsers size={20} color={W.primary} /> Hiệu suất nhân viên</h2>
                    {employeeData.length === 0 ? <p style={{ color: W.subtext }}>Chưa có dữ liệu.</p> : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead><tr style={{ background: W.light, textAlign: 'left' }}>
                          <th style={{ padding: '12px' }}>Nhân viên</th><th style={{ padding: '12px', textAlign: 'center' }}>Số đơn xử lý</th><th style={{ padding: '12px', textAlign: 'right' }}>Doanh thu mang lại</th>
                        </tr></thead>
                        <tbody>
                          {employeeData.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #F0E6D8' }}>
                              <td style={{ padding: '12px', fontWeight: 600, color: W.text }}>{row.TenNV}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>{row.SoHoaDon} đơn</td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: W.primary }}>{fmt(row.DoanhThu)} đ</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

      </div>

      {showMoveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FiRepeat size={18} /> Chuyển / Gộp Bàn</h3>
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

      {/* MODAL TÁCH BILL */}
      {showSplitModal && splitSource && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '450px' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FiScissors size={18} /> Tách hóa đơn</h3>
            <p style={{ color: '#888', fontSize: '14px' }}>Chọn số lượng từng món để tách sang hóa đơn mới:</p>
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
              {splitSource.Items.map(mon => (
                <div key={mon.MaMon} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #eee' }}>
                  <span style={{ flex: 1 }}>{mon.TenMon} (có {mon.SoLuong})</span>
                  <input
                    type="number" min="0" max={mon.SoLuong}
                    value={splitQty[mon.MaMon] || 0}
                    onChange={(e) => setSplitQty({ ...splitQty, [mon.MaMon]: Math.min(mon.SoLuong, Math.max(0, Number(e.target.value))) })}
                    style={{ width: '70px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSplitModal(false)} className="btn-secondary">Hủy</button>
              <button onClick={handleSplit} className="btn-primary">Tách bill</button>
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
              <button onClick={() => setShowEditTableModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', display: 'inline-flex' }}><FiX size={20} /></button>
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

      {/* MODAL SỬA KHU VỰC */}
      {showEditAreaModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>Sửa khu vực</h3>
              <button onClick={() => setShowEditAreaModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', display: 'inline-flex' }}><FiX size={20} /></button>
            </div>
            <div className="form-group" style={{ marginBottom: '30px' }}>
              <label style={{ display: 'flex', gap: '5px', alignItems: 'center' }}><span style={{ color: 'red' }}>*</span> Tên khu vực</label>
              <input type="text" value={editAreaData.TenKV} onChange={e => setEditAreaData({ ...editAreaData, TenKV: e.target.value })} style={{ padding: '12px', fontSize: '16px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={() => handleDeleteArea(editAreaData.MaKV)} style={{ flex: 1, padding: '12px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Xoá khu vực</button>
              <button onClick={handleUpdateArea} className="btn-primary" style={{ flex: 1, padding: '12px' }}>Lưu thông tin</button>
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
              <button onClick={() => setShowCheckoutModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', display: 'inline-flex' }}><FiX size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => setCheckoutMethod('Chuyển khoản')} style={{ flex: 1, padding: '10px', fontWeight: 'bold', border: checkoutMethod === 'Chuyển khoản' ? `2px solid ${W.primary}` : '1px solid #ccc', background: checkoutMethod === 'Chuyển khoản' ? W.light : 'white', color: checkoutMethod === 'Chuyển khoản' ? W.primary : '#555', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FiCreditCard size={16} /> Chuyển khoản</button>
              <button onClick={() => setCheckoutMethod('Tiền mặt')} style={{ flex: 1, padding: '10px', fontWeight: 'bold', border: checkoutMethod === 'Tiền mặt' ? `2px solid ${W.primary}` : '1px solid #ccc', background: checkoutMethod === 'Tiền mặt' ? W.light : 'white', color: checkoutMethod === 'Tiền mặt' ? W.primary : '#555', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><FiDollarSign size={16} /> Tiền mặt</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#555' }}>Chiết khấu (%)</label>
                <input type="number" min="0" max="100" value={chietKhau} onChange={(e) => setChietKhau(Math.max(0, Math.min(100, Number(e.target.value))))} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', color: '#555' }}>VAT (%)</label>
                <input type="number" min="0" max="100" value={thueVAT} onChange={(e) => setThueVAT(Math.max(0, Math.min(100, Number(e.target.value))))} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Biên lai để in (react-to-print) */}
            <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <div ref={receiptRef} style={{ padding: '10px' }}>
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0 }}>Foody POS</h3>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Mã HĐ: {activeInvoiceId}</div>
                  <div style={{ fontSize: '13px', color: '#777' }}>Vị trí: {selectedTableTitle} · {timeStr.substring(0, 5)} {dateStr}</div>
                </div>
                {checkoutMethod === 'Chuyển khoản' && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                    <img src="/QR.png" alt="QR Code" style={{ width: '120px', height: '120px' }} />
                  </div>
                )}
                {activeInvoice?.Items.map((mon, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '2px 0' }}>
                    <span>{mon.TenMon} x{mon.SoLuong}</span>
                    <span>{mon.ThanhTien.toLocaleString('vi-VN')}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px dashed #ccc', marginTop: '10px', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span>Tạm tính:</span><span>{subtotal.toLocaleString('vi-VN')} đ</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#dc3545' }}><span>Chiết khấu ({chietKhau}%):</span><span>-{discountAmount.toLocaleString('vi-VN')} đ</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span>VAT ({thueVAT}%):</span><span>+{vatAmount.toLocaleString('vi-VN')} đ</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: W.primary, marginTop: '8px' }}><span>Khách cần trả:</span><span>{grandTotal.toLocaleString('vi-VN')} đ</span></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handlePrint} style={{ padding: '15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FiPrinter size={16} /> In biên lai</button>
              <button onClick={() => { handleCheckout(activeInvoiceId, checkoutMethod); setShowCheckoutModal(false); }} style={{ flex: 1, padding: '15px', backgroundColor: W.primary, color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>Xác nhận thanh toán</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;

import { useState, useEffect, useCallback } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiX, FiSearch, FiCoffee } from 'react-icons/fi';
import api from '../../api';
import { useAuth } from '../../AuthContext';

const BLANK = { MaMon: '', TenMon: '', DonGia: '', MaDM: '', TrangThai: 'Còn hàng' };

const WOOD = {
  primary: '#8B5E3C',
  light: '#F5EDE3',
  border: '#D4B89A',
  text: '#4A2C0A',
  subtext: '#8C6A4A',
  bg: '#FAF4EE',
  green: '#27AE60',
  red: '#C0392B',
};

// Công tắc bật/tắt (toggle) đơn giản
function Toggle({ on, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      style={{ width: '46px', height: '26px', borderRadius: '13px', background: on ? WOOD.primary : '#ccc', border: 'none', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

export default function MenuManager() {
  const { hasRole } = useAuth();
  const isManager = hasRole();   // chỉ Quản lý mới được thêm/sửa/xóa

  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ MaDM: '', TenDM: '' });

  const fetchAll = useCallback(() => {
    api.get('/api/admin/menu').then((r) => setMenu(r.data)).catch(() => {});
    api.get('/api/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => { setForm(BLANK); setEditing(false); setError(''); setShowModal(true); };
  const openEdit = (m) => { setForm({ MaMon: m.MaMon, TenMon: m.TenMon, DonGia: m.DonGia, MaDM: m.MaDM || '', TrangThai: m.TrangThai || 'Còn hàng' }); setEditing(true); setError(''); setShowModal(true); };

  const saveMenu = () => {
    if (!editing && !form.MaMon.trim()) { setError('Vui lòng nhập mã hàng hoá'); return; }
    if (!form.TenMon.trim()) { setError('Vui lòng nhập tên SP/DV'); return; }
    if (!form.MaDM) { setError('Vui lòng chọn danh mục'); return; }
    if (!Number(form.DonGia) || Number(form.DonGia) <= 0) { setError('Vui lòng nhập giá hợp lệ'); return; }
    const payload = { ...form, DonGia: Number(form.DonGia) };
    const req = editing ? api.put(`/api/admin/menu/${form.MaMon}`, payload) : api.post('/api/admin/menu', payload);
    req.then(() => { setShowModal(false); fetchAll(); })
      .catch((e) => setError(e.response?.data?.error || 'Lỗi lưu món'));
  };

  const deleteMenu = (e, mamon) => {
    e.stopPropagation();
    if (!window.confirm('Xóa món này?')) return;
    api.delete(`/api/admin/menu/${mamon}`).then(fetchAll)
      .catch((er) => alert(er.response?.data?.error || 'Lỗi xóa'));
  };

  const addCategory = () => {
    if (!newCat.MaDM.trim() || !newCat.TenDM.trim()) return alert('Nhập mã & tên danh mục');
    api.post('/api/admin/categories', newCat)
      .then(() => { setNewCat({ MaDM: '', TenDM: '' }); fetchAll(); })
      .catch((e) => alert(e.response?.data?.error || 'Lỗi thêm danh mục'));
  };

  const deleteCategory = (madm) => {
    if (!window.confirm('Xóa danh mục này?')) return;
    api.delete(`/api/admin/categories/${madm}`).then(fetchAll)
      .catch((e) => alert(e.response?.data?.error || 'Lỗi xóa danh mục'));
  };

  const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');

  const filtered = menu.filter((m) =>
    (filterCat === 'ALL' || m.MaDM === filterCat) &&
    (m.TenMon || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div style={{ padding: '20px', background: WOOD.bg, height: '100%', overflowY: 'auto' }}>
      {/* Thanh tìm kiếm */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <FiSearch size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: WOOD.subtext }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm SP Dịch vụ"
          style={{ width: '100%', padding: '13px 14px 13px 44px', border: `1px solid ${WOOD.border}`, borderRadius: '10px', fontSize: '15px', color: WOOD.text, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Bộ lọc danh mục + nút thao tác */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`filter-chip ${filterCat === 'ALL' ? 'active' : ''}`} onClick={() => setFilterCat('ALL')}>Tất cả</button>
          {categories.map((c) => (
            <button key={c.MaDM} className={`filter-chip ${filterCat === c.MaDM ? 'active' : ''}`} onClick={() => setFilterCat(c.MaDM)}>{c.TenDM}</button>
          ))}
        </div>
        {isManager && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setShowCatModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FiPlus size={15} /> Danh mục</button>
            <button className="btn-primary" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><FiPlus size={16} /> Thêm món</button>
          </div>
        )}
      </div>

      {/* Lưới sản phẩm */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: WOOD.subtext }}>Không có sản phẩm nào.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {filtered.map((m) => {
            const conHang = m.TrangThai === 'Còn hàng';
            return (
              <div key={m.MaMon} onClick={isManager ? () => openEdit(m) : undefined}
                style={{ background: '#fff', border: `1px solid ${WOOD.border}`, borderRadius: '12px', padding: '14px', cursor: isManager ? 'pointer' : 'default', position: 'relative', boxShadow: '0 2px 8px rgba(139,94,60,0.08)', transition: 'transform .15s, box-shadow .15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(139,94,60,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(139,94,60,0.08)'; }}>
                {/* Thao tác — chỉ Quản lý */}
                {isManager && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} title="Sửa" style={{ background: '#fff', border: `1px solid ${WOOD.border}`, color: WOOD.primary, borderRadius: '6px', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FiEdit2 size={14} /></button>
                    <button onClick={(e) => deleteMenu(e, m.MaMon)} title="Xóa" style={{ background: '#fff', border: '1px solid #F1B0A8', color: WOOD.red, borderRadius: '6px', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FiTrash2 size={14} /></button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: WOOD.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WOOD.primary, flexShrink: 0 }}>
                    <FiCoffee size={26} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'inline-block', background: WOOD.light, color: WOOD.subtext, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                      {m.TenDM || m.MaDM || 'Khác'}
                    </span>
                    <div style={{ fontWeight: 700, color: WOOD.text, fontSize: '14px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.TenMon}</div>
                    <div style={{ fontWeight: 700, color: WOOD.primary, fontSize: '14px' }}>Giá: {fmt(m.DonGia)}đ</div>
                    {!conHang && <div style={{ fontSize: '12px', color: WOOD.red, marginTop: '2px', fontWeight: 600 }}>● Ngừng bán</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm/Sửa món */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '460px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${WOOD.border}`, paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, color: WOOD.text }}>{editing ? 'Sửa món' : 'Thêm món'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'inline-flex' }}><FiX size={20} /></button>
            </div>

            {error && <div style={{ background: '#FDEDEC', color: WOOD.red, padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

            <div className="form-group">
              <label>Mã hàng hoá</label>
              <input type="text" value={form.MaMon} disabled={editing} placeholder="Nhập mã hàng hoá"
                onChange={(e) => setForm({ ...form, MaMon: e.target.value })}
                style={editing ? { background: '#f3f3f3', color: WOOD.subtext } : undefined} />
            </div>

            <div className="form-group">
              <label><span style={{ color: 'red' }}>*</span> Tên SP/DV</label>
              <input type="text" value={form.TenMon} placeholder="Nhập tên SP/DV"
                onChange={(e) => setForm({ ...form, TenMon: e.target.value })} />
            </div>

            <div className="form-group">
              <label><span style={{ color: 'red' }}>*</span> Danh mục</label>
              <select value={form.MaDM} onChange={(e) => setForm({ ...form, MaDM: e.target.value })}>
                <option value="">Chọn danh mục</option>
                {categories.map((c) => <option key={c.MaDM} value={c.MaDM}>{c.TenDM}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label><span style={{ color: 'red' }}>*</span> Giá SP/DV (VNĐ)</label>
              <input type="number" min="0" value={form.DonGia} placeholder="Nhập giá SP/DV"
                onChange={(e) => setForm({ ...form, DonGia: e.target.value })} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 18px' }}>
              <span style={{ fontWeight: 600, color: WOOD.text }}>Hết hàng</span>
              <Toggle on={form.TrangThai === 'Ngừng bán'} onChange={(v) => setForm({ ...form, TrangThai: v ? 'Ngừng bán' : 'Còn hàng' })} />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Đóng</button>
              <button onClick={saveMenu} className="btn-primary">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Danh mục */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${WOOD.border}`, paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, color: WOOD.text }}>Quản lý danh mục</h3>
              <button onClick={() => setShowCatModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'inline-flex' }}><FiX size={20} /></button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input style={{ flex: '0 0 90px', padding: '10px', border: `1px solid ${WOOD.border}`, borderRadius: '7px', boxSizing: 'border-box' }} placeholder="Mã DM" value={newCat.MaDM} onChange={(e) => setNewCat({ ...newCat, MaDM: e.target.value })} />
              <input style={{ flex: 1, padding: '10px', border: `1px solid ${WOOD.border}`, borderRadius: '7px', boxSizing: 'border-box' }} placeholder="Tên danh mục" value={newCat.TenDM} onChange={(e) => setNewCat({ ...newCat, TenDM: e.target.value })} />
              <button onClick={addCategory} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiPlus size={15} /></button>
            </div>

            <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
              {categories.map((c) => (
                <div key={c.MaDM} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F0E6D8' }}>
                  <span style={{ color: WOOD.text }}><strong style={{ color: WOOD.subtext, fontSize: '12px', marginRight: '8px' }}>{c.MaDM}</strong>{c.TenDM}</span>
                  <button onClick={() => deleteCategory(c.MaDM)} style={{ background: 'none', border: 'none', color: WOOD.red, cursor: 'pointer', display: 'inline-flex' }} title="Xóa"><FiTrash2 size={15} /></button>
                </div>
              ))}
              {categories.length === 0 && <p style={{ color: WOOD.subtext, textAlign: 'center', padding: '20px' }}>Chưa có danh mục.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

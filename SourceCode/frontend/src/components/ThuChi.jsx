import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiPlus, FiX, FiArrowDownCircle, FiArrowUpCircle, FiInbox, FiTrash2 } from 'react-icons/fi';
import api from '../api';
import { useAuth } from '../AuthContext';

const WOOD = {
  primary: '#8B5E3C',
  primaryDark: '#6B4226',
  light: '#F5EDE3',
  border: '#D4B89A',
  text: '#4A2C0A',
  subtext: '#8C6A4A',
  bg: '#FAF4EE',
  green: '#27AE60',
  red: '#C0392B',
};

const BLANK = { LoaiPhieu: 'Thu', KhoanMuc: '', SoTien: '', NoiDung: '' };
const FILTER_BLANK = { loai: 'ALL', nguoiLap: 'ALL', tuNgay: '', denNgay: '' };

export default function ThuChi() {
  const { hasRole } = useAuth();
  const isManager = hasRole();

  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState(FILTER_BLANK);

  const fetchData = useCallback(() => {
    api.get('/api/thuchi')
      .then((r) => setItems(r.data.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setForm(BLANK); setError(''); setShowModal(true); };

  const handleSave = () => {
    const soTien = Number(form.SoTien);
    if (!soTien || soTien <= 0) { setError('Vui lòng nhập số tiền hợp lệ'); return; }
    const lyDo = [form.KhoanMuc.trim(), form.NoiDung.trim()].filter(Boolean).join(' - ');
    setSaving(true);
    setError('');
    api.post('/api/thuchi', { LoaiPhieu: form.LoaiPhieu, SoTien: soTien, LyDo: lyDo })
      .then(() => { setShowModal(false); fetchData(); })
      .catch((e) => setError(e.response?.data?.error || 'Lỗi tạo phiếu'))
      .finally(() => setSaving(false));
  };

  const handleDelete = (maphieu) => {
    if (!window.confirm('Bạn có chắc muốn xóa phiếu này?')) return;
    api.delete(`/api/thuchi/${maphieu}`)
      .then(fetchData)
      .catch((e) => alert(e.response?.data?.error || 'Lỗi xóa phiếu'));
  };

  const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN');
  const fmtDate = (s) => (s ? new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
  const dayKey = (s) => (s ? new Date(s).toISOString().slice(0, 10) : '');

  // Danh sách người tạo (để lọc)
  const creators = useMemo(() => {
    const map = new Map();
    items.forEach((it) => { if (it.NguoiLap) map.set(it.NguoiLap, it.TenNV || it.NguoiLap); });
    return [...map.entries()].map(([MaNV, TenNV]) => ({ MaNV, TenNV }));
  }, [items]);

  // Lọc theo loại / người tạo / khoảng ngày
  const filtered = useMemo(() => items.filter((it) => {
    if (filters.loai !== 'ALL' && it.LoaiPhieu !== filters.loai) return false;
    if (filters.nguoiLap !== 'ALL' && it.NguoiLap !== filters.nguoiLap) return false;
    const d = dayKey(it.ThoiGian);
    if (filters.tuNgay && d < filters.tuNgay) return false;
    if (filters.denNgay && d > filters.denNgay) return false;
    return true;
  }), [items, filters]);

  const tongThu = filtered.filter((i) => i.LoaiPhieu === 'Thu').reduce((s, i) => s + (i.SoTien || 0), 0);
  const tongChi = filtered.filter((i) => i.LoaiPhieu === 'Chi').reduce((s, i) => s + (i.SoTien || 0), 0);

  const card = (title, value, color, Icon) => (
    <div style={{ flex: 1, background: '#fff', border: `1px solid ${WOOD.border}`, borderRadius: '12px', padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(139,94,60,0.08)' }}>
      <div>
        <div style={{ fontSize: '14px', color: WOOD.subtext, marginBottom: '6px' }}>{title}</div>
        <div style={{ fontSize: '26px', fontWeight: 800, color }}>{fmtMoney(value)} <span style={{ fontSize: '14px', fontWeight: 600 }}>đ</span></div>
      </div>
      <span style={{ width: '48px', height: '48px', borderRadius: '50%', background: color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={24} color={color} />
      </span>
    </div>
  );

  const selectStyle = { padding: '9px 12px', border: `1px solid ${WOOD.border}`, borderRadius: '8px', fontSize: '13px', color: WOOD.text, background: '#fff', outline: 'none' };

  return (
    <div style={{ padding: '24px', background: WOOD.bg, height: '100%', overflowY: 'auto' }}>
      {/* Mô tả mục đích */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: WOOD.text }}>Sổ Thu / Chi</h2>
        <p style={{ margin: 0, fontSize: '13px', color: WOOD.subtext }}>
          Ghi các khoản tiền phát sinh ngoài bán hàng — <strong>Thu</strong>: tiền tip, khách trả thiếu… · <strong>Chi</strong>: chi phí lặt vặt.
          Các khoản này <strong>không tính vào doanh thu</strong> ở báo cáo.
        </p>
      </div>

      {/* Bộ lọc */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
        <select style={selectStyle} value={filters.loai} onChange={(e) => setFilters({ ...filters, loai: e.target.value })}>
          <option value="ALL">Tất cả loại phiếu</option>
          <option value="Thu">Phiếu thu</option>
          <option value="Chi">Phiếu chi</option>
        </select>
        <select style={selectStyle} value={filters.nguoiLap} onChange={(e) => setFilters({ ...filters, nguoiLap: e.target.value })}>
          <option value="ALL">Tất cả người tạo</option>
          {creators.map((c) => <option key={c.MaNV} value={c.MaNV}>{c.TenNV}</option>)}
        </select>
        <input type="date" style={selectStyle} value={filters.tuNgay} onChange={(e) => setFilters({ ...filters, tuNgay: e.target.value })} />
        <span style={{ color: WOOD.subtext }}>→</span>
        <input type="date" style={selectStyle} value={filters.denNgay} onChange={(e) => setFilters({ ...filters, denNgay: e.target.value })} />
        {(filters.loai !== 'ALL' || filters.nguoiLap !== 'ALL' || filters.tuNgay || filters.denNgay) && (
          <button onClick={() => setFilters(FILTER_BLANK)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>Xóa lọc</button>
        )}
      </div>

      {/* Thẻ tổng thu / tổng chi */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
        {card('Tổng thu', tongThu, WOOD.green, FiArrowDownCircle)}
        {card('Tổng chi', tongChi, WOOD.red, FiArrowUpCircle)}
      </div>

      {/* Sổ thu chi */}
      <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${WOOD.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(139,94,60,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${WOOD.border}` }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: WOOD.text }}>Danh sách phiếu</h2>
          <button onClick={openCreate} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FiPlus size={16} /> Tạo phiếu thu/chi
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: WOOD.light, textAlign: 'left' }}>
              {['Loại phiếu', 'Mã phiếu', 'Người tạo phiếu', 'Khoản mục', 'Ngày tạo', 'Số tiền'].map((h, i) => (
                <th key={h} style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 700, color: WOOD.text, textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
              ))}
              {isManager && <th style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 700, color: WOOD.text, textAlign: 'center' }}>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => {
              const isThu = it.LoaiPhieu === 'Thu';
              const color = isThu ? WOOD.green : WOOD.red;
              return (
                <tr key={it.MaPhieu} style={{ borderBottom: '1px solid #F0E6D8' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: color + '1A', color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                      Phiếu {it.LoaiPhieu.toLowerCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 700, color: WOOD.subtext }}>#{it.MaPhieu}</td>
                  <td style={{ padding: '14px 18px', fontSize: '14px', color: WOOD.text }}>{it.TenNV || it.NguoiLap || '—'}</td>
                  <td style={{ padding: '14px 18px', fontSize: '14px', color: WOOD.text }}>{it.LyDo || '—'}</td>
                  <td style={{ padding: '14px 18px', fontSize: '13px', color: WOOD.subtext }}>{fmtDate(it.ThoiGian)}</td>
                  <td style={{ padding: '14px 18px', fontSize: '14px', fontWeight: 700, textAlign: 'right', color }}>
                    {isThu ? '+' : '-'}{fmtMoney(it.SoTien)} đ
                  </td>
                  {isManager && (
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(it.MaPhieu)} title="Xóa phiếu" style={{ background: 'none', border: 'none', color: WOOD.red, cursor: 'pointer', display: 'inline-flex' }}>
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: WOOD.subtext }}>
            <FiInbox size={40} color={WOOD.border} />
            <div style={{ marginTop: '10px' }}>Trống</div>
          </div>
        )}
      </div>

      {/* Modal tạo phiếu */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${WOOD.border}`, paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, color: WOOD.text }}>Tạo phiếu thu/chi</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'inline-flex' }}><FiX size={20} /></button>
            </div>

            {error && <div style={{ background: '#FDEDEC', color: WOOD.red, padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

            <div className="form-group">
              <label><span style={{ color: 'red' }}>*</span> Loại phiếu</label>
              <select value={form.LoaiPhieu} onChange={(e) => setForm({ ...form, LoaiPhieu: e.target.value })}>
                <option value="Thu">Phiếu thu (tiền tip, khách trả thiếu…)</option>
                <option value="Chi">Phiếu chi (chi phí lặt vặt)</option>
              </select>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: WOOD.subtext }}>
                Khoản này không tính vào doanh thu bán hàng.
              </p>
            </div>

            <div className="form-group">
              <label>Khoản mục</label>
              <input type="text" value={form.KhoanMuc} onChange={(e) => setForm({ ...form, KhoanMuc: e.target.value })}
                placeholder={form.LoaiPhieu === 'Thu' ? 'VD: Tiền tip, Khách trả thiếu...' : 'VD: Mua đá, Tiền điện, Sửa chữa...'} />
            </div>

            <div className="form-group">
              <label><span style={{ color: 'red' }}>*</span> Số tiền (VNĐ)</label>
              <input type="number" min="0" value={form.SoTien} onChange={(e) => setForm({ ...form, SoTien: e.target.value })} placeholder="Nhập số tiền" />
            </div>

            <div className="form-group">
              <label>Nội dung</label>
              <textarea value={form.NoiDung} onChange={(e) => setForm({ ...form, NoiDung: e.target.value })} placeholder="Nhập nội dung" rows={3} style={{ width: '100%', padding: '10px', border: `1px solid ${WOOD.border}`, borderRadius: '7px', fontSize: '14px', color: WOOD.text, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Huỷ</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

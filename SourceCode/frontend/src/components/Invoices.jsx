import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiInbox, FiCreditCard, FiDollarSign } from 'react-icons/fi';
import api from '../api';

const WOOD = {
  primary: '#8B5E3C',
  light: '#F5EDE3',
  border: '#D4B89A',
  text: '#4A2C0A',
  subtext: '#8C6A4A',
  bg: '#FAF4EE',
  green: '#27AE60',
};

const FILTER_BLANK = { nhanVien: 'ALL', viTri: 'ALL', pttt: 'ALL', tu: '', den: '' };

export default function Invoices() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState(FILTER_BLANK);

  const fetchOrders = useCallback(() => {
    api.get('/api/orders').then((r) => setOrders(r.data)).catch(() => setOrders([]));
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
  const fmtDT = (s) => (s ? new Date(s.replace(' ', 'T')).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
  const dayKey = (s) => (s ? s.slice(0, 10) : '');

  const nhanViens = useMemo(() => [...new Set(orders.map((o) => o.TenNV).filter(Boolean))], [orders]);
  const viTris = useMemo(() => [...new Set(orders.map((o) => o.TenBan).filter(Boolean))], [orders]);

  const filtered = useMemo(() => orders.filter((o) => {
    if (filters.nhanVien !== 'ALL' && o.TenNV !== filters.nhanVien) return false;
    if (filters.viTri !== 'ALL' && o.TenBan !== filters.viTri) return false;
    if (filters.pttt !== 'ALL' && o.PhuongThucTT !== filters.pttt) return false;
    const d = dayKey(o.ThoiGianThanhToan);
    if (filters.tu && d < filters.tu) return false;
    if (filters.den && d > filters.den) return false;
    return true;
  }), [orders, filters]);

  const tongTien = filtered.reduce((s, o) => s + (o.TongTien || 0), 0);

  const selectStyle = { padding: '9px 12px', border: `1px solid ${WOOD.border}`, borderRadius: '8px', fontSize: '13px', color: WOOD.text, background: '#fff', outline: 'none' };
  const hasFilter = filters.nhanVien !== 'ALL' || filters.viTri !== 'ALL' || filters.pttt !== 'ALL' || filters.tu || filters.den;

  return (
    <div style={{ padding: '24px', background: WOOD.bg, height: '100%', overflowY: 'auto' }}>
      {/* Bộ lọc */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
        <select style={selectStyle} value={filters.viTri} onChange={(e) => setFilters({ ...filters, viTri: e.target.value })}>
          <option value="ALL">Tất cả vị trí</option>
          {viTris.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select style={selectStyle} value={filters.nhanVien} onChange={(e) => setFilters({ ...filters, nhanVien: e.target.value })}>
          <option value="ALL">Tất cả nhân viên</option>
          {nhanViens.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select style={selectStyle} value={filters.pttt} onChange={(e) => setFilters({ ...filters, pttt: e.target.value })}>
          <option value="ALL">Tất cả thanh toán</option>
          <option value="Tiền mặt">Tiền mặt</option>
          <option value="Chuyển khoản">Chuyển khoản</option>
        </select>
        <input type="date" style={selectStyle} value={filters.tu} onChange={(e) => setFilters({ ...filters, tu: e.target.value })} />
        <span style={{ color: WOOD.subtext }}>→</span>
        <input type="date" style={selectStyle} value={filters.den} onChange={(e) => setFilters({ ...filters, den: e.target.value })} />
        {hasFilter && <button onClick={() => setFilters(FILTER_BLANK)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>Xóa bộ lọc</button>}
      </div>

      {/* Tổng tiền */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', border: `1px solid ${WOOD.border}`, borderRadius: '12px', padding: '16px 22px', boxShadow: '0 2px 10px rgba(139,94,60,0.08)' }}>
          <div style={{ fontSize: '13px', color: WOOD.subtext, marginBottom: '4px' }}>Tổng tiền ({filtered.length} hóa đơn)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: WOOD.primary }}>{fmt(tongTien)} đ</div>
        </div>
      </div>

      {/* Bảng hóa đơn */}
      <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${WOOD.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(139,94,60,0.1)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: WOOD.light, textAlign: 'left' }}>
                {['#', 'Mã đơn hàng', 'Nhân viên', 'Số SP/DV', 'Thời gian tạo', 'Thời gian thanh toán', 'Tổng tiền', 'Vị trí', 'PT thanh toán', 'Trạng thái'].map((h, i) => (
                  <th key={h} style={{ padding: '13px 16px', fontSize: '13px', fontWeight: 700, color: WOOD.text, textAlign: i === 3 || i === 6 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, idx) => (
                <tr key={o.MaHD} style={{ borderBottom: '1px solid #F0E6D8' }}>
                  <td style={{ padding: '13px 16px', color: WOOD.subtext }}>{idx + 1}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: WOOD.text }}>#{o.MaHD}</td>
                  <td style={{ padding: '13px 16px', color: WOOD.text }}>{o.TenNV}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 600 }}>{o.SoLuong}</td>
                  <td style={{ padding: '13px 16px', color: WOOD.subtext, whiteSpace: 'nowrap' }}>{fmtDT(o.ThoiGianMo)}</td>
                  <td style={{ padding: '13px 16px', color: WOOD.subtext, whiteSpace: 'nowrap' }}>{fmtDT(o.ThoiGianThanhToan)}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: WOOD.primary, whiteSpace: 'nowrap' }}>{fmt(o.TongTien)} đ</td>
                  <td style={{ padding: '13px 16px', color: WOOD.text }}>{o.TenBan}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: WOOD.text, whiteSpace: 'nowrap' }}>
                      {o.PhuongThucTT === 'Chuyển khoản' ? <FiCreditCard size={14} color={WOOD.primary} /> : <FiDollarSign size={14} color={WOOD.primary} />} {o.PhuongThucTT}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ background: WOOD.green + '1A', color: WOOD.green, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{o.TrangThaiHD}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: WOOD.subtext }}>
            <FiInbox size={40} color={WOOD.border} />
            <div style={{ marginTop: '10px' }}>Trống</div>
          </div>
        )}
      </div>
    </div>
  );
}

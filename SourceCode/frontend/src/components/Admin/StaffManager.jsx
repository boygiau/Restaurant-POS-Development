import { useState, useEffect } from 'react';
import { FiUsers, FiPlus, FiKey, FiEdit2, FiX } from 'react-icons/fi';
import api from '../../api';
import { useAuth } from '../../AuthContext';

const ROLES = ['Quản lý', 'Thu ngân', 'Phục vụ', 'Bếp'];

const WOOD = {
  primary: '#8B5E3C',
  primaryHover: '#7A5235',
  light: '#F5EDE3',
  border: '#D4B89A',
  text: '#4A2C0A',
  subtext: '#8C6A4A',
  accent: '#C49A6C',
  danger: '#C0392B',
  success: '#27AE60',
};

export default function StaffManager() {
  const { hasRole } = useAuth();
  const isManager = hasRole();   // chỉ Quản lý mới thêm/sửa/xóa & xem lương

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create new
  const [pwTarget, setPwTarget] = useState(null);
  const [form, setForm] = useState({ MaNV: '', TenNV: '', VaiTro: 'Phục vụ', TenDangNhap: '', MatKhau: '', MucLuong: 5000000 });
  const [newPw, setNewPw] = useState('');
  const [error, setError] = useState('');

  const fetchStaff = () => {
    setLoading(true);
    api.get('/api/staff').then(r => setStaff(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, []);

  const openCreate = () => {
    setForm({ MaNV: '', TenNV: '', VaiTro: 'Phục vụ', TenDangNhap: '', MatKhau: '', MucLuong: 5000000 });
    setEditTarget(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (s) => {
    setForm({ MaNV: s.MaNV, TenNV: s.TenNV, VaiTro: s.VaiTro, TenDangNhap: s.TenDangNhap || '', MatKhau: '', MucLuong: s.MucLuong });
    setEditTarget(s.MaNV);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      if (editTarget) {
        await api.put(`/api/staff/${editTarget}`, { TenNV: form.TenNV, VaiTro: form.VaiTro, MucLuong: form.MucLuong });
      } else {
        await api.post('/api/staff', form);
      }
      setShowModal(false);
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi không xác định');
    }
  };

  const handleDelete = async (manv, name) => {
    if (!window.confirm(`Xóa nhân viên "${name}"? Thao tác không thể hoàn tác!`)) return;
    try {
      await api.delete(`/api/staff/${manv}`);
      fetchStaff();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleChangePw = async () => {
    if (!newPw || newPw.length < 6) return alert('Mật khẩu phải có ít nhất 6 ký tự!');
    try {
      await api.put(`/api/staff/${pwTarget}/password`, { MatKhau: newPw });
      alert('Đã đổi mật khẩu thành công!');
      setShowPwModal(false);
      setNewPw('');
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const roleColor = (vaitro) => {
    const map = { 'Quản lý': '#8B5E3C', 'Thu ngân': '#2980B9', 'Phục vụ': '#27AE60', 'Bếp': '#E67E22' };
    return map[vaitro] || '#888';
  };

  return (
    <div style={{ padding: '24px', background: '#FAF4EE', minHeight: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: WOOD.text, fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}><FiUsers /> {isManager ? 'Quản lý Nhân viên' : 'Danh sách Nhân viên'}</h2>
          <p style={{ margin: '4px 0 0', color: WOOD.subtext, fontSize: '14px' }}>{isManager ? 'Tạo và quản lý tài khoản nhân viên' : 'Danh sách nhân viên (chỉ xem)'}</p>
        </div>
        {isManager && (
          <button
            onClick={openCreate}
            style={{ background: WOOD.primary, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiPlus size={16} /> Thêm Nhân viên
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: WOOD.subtext }}>Đang tải...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${WOOD.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(139,94,60,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: WOOD.light }}>
                {['Mã NV', 'Họ và tên', 'Vai trò', 'Tên đăng nhập', ...(isManager ? ['Lương cơ bản', 'Thao tác'] : [])].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: WOOD.text, borderBottom: `2px solid ${WOOD.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s, idx) => (
                <tr key={s.MaNV} style={{ borderBottom: `1px solid #F0E6D8`, background: idx % 2 === 0 ? 'white' : '#FDFAF7', transition: 'background 0.15s' }}>
                  <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: WOOD.subtext }}>{s.MaNV}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: WOOD.text }}>{s.TenNV}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: roleColor(s.VaiTro) + '22', color: roleColor(s.VaiTro), padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                      {s.VaiTro}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: s.TenDangNhap ? WOOD.text : '#bbb', fontFamily: 'monospace' }}>
                    {s.TenDangNhap || '(chưa có)'}
                  </td>
                  {isManager && (
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: WOOD.subtext }}>
                      {(s.MucLuong || 0).toLocaleString('vi-VN')} đ
                    </td>
                  )}
                  {isManager && (
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEdit(s)} style={{ padding: '6px 12px', background: WOOD.light, color: WOOD.primary, border: `1px solid ${WOOD.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Sửa</button>
                        {s.TenDangNhap && (
                          <button onClick={() => { setPwTarget(s.MaNV); setNewPw(''); setShowPwModal(true); }} style={{ padding: '6px 12px', background: WOOD.light, color: WOOD.primary, border: `1px solid ${WOOD.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiKey size={13} /> Đổi MK</button>
                        )}
                        <button onClick={() => handleDelete(s.MaNV, s.TenNV)} style={{ padding: '6px 12px', background: '#FDEDEC', color: WOOD.danger, border: '1px solid #F1948A', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>Xóa</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: WOOD.subtext }}>Chưa có nhân viên nào.</div>
          )}
        </div>
      )}

      {/* Modal Tạo/Sửa nhân viên */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `2px solid ${WOOD.border}`, paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, color: WOOD.text, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>{editTarget ? <><FiEdit2 size={17} /> Sửa nhân viên</> : <><FiPlus size={17} /> Thêm nhân viên mới</>}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'inline-flex' }}><FiX size={20} /></button>
            </div>

            {error && <div style={{ background: '#FDEDEC', color: '#C0392B', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: WOOD.subtext, marginBottom: '5px' }}>Mã NV <span style={{ color: 'red' }}>*</span></label>
                <input value={form.MaNV} onChange={e => setForm({ ...form, MaNV: e.target.value })} disabled={!!editTarget}
                  style={{ width: '100%', padding: '10px', border: `1px solid ${WOOD.border}`, borderRadius: '7px', boxSizing: 'border-box', background: editTarget ? '#f5f5f5' : 'white', fontSize: '14px' }} placeholder="VD: NV05" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: WOOD.subtext, marginBottom: '5px' }}>Vai trò <span style={{ color: 'red' }}>*</span></label>
                <select value={form.VaiTro} onChange={e => setForm({ ...form, VaiTro: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: `1px solid ${WOOD.border}`, borderRadius: '7px', boxSizing: 'border-box', fontSize: '14px', background: 'white' }}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: WOOD.subtext, marginBottom: '5px' }}>Họ và tên <span style={{ color: 'red' }}>*</span></label>
                <input value={form.TenNV} onChange={e => setForm({ ...form, TenNV: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: `1px solid ${WOOD.border}`, borderRadius: '7px', boxSizing: 'border-box', fontSize: '14px' }} placeholder="VD: Nguyễn Văn A" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: WOOD.subtext, marginBottom: '5px' }}>Tên đăng nhập {!editTarget && <span style={{ color: 'red' }}>*</span>}</label>
                <input value={form.TenDangNhap} onChange={e => setForm({ ...form, TenDangNhap: e.target.value })} disabled={!!editTarget}
                  style={{ width: '100%', padding: '10px', border: `1px solid ${WOOD.border}`, borderRadius: '7px', boxSizing: 'border-box', background: editTarget ? '#f5f5f5' : 'white', fontSize: '14px' }} placeholder="VD: nhanvien1" />
              </div>
              {!editTarget && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: WOOD.subtext, marginBottom: '5px' }}>Mật khẩu <span style={{ color: 'red' }}>*</span></label>
                  <input type="password" value={form.MatKhau} onChange={e => setForm({ ...form, MatKhau: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: `1px solid ${WOOD.border}`, borderRadius: '7px', boxSizing: 'border-box', fontSize: '14px' }} placeholder="Tối thiểu 6 ký tự" />
                </div>
              )}
              <div style={{ gridColumn: editTarget ? '1/-1' : '1/2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: WOOD.subtext, marginBottom: '5px' }}>Lương cơ bản (đ)</label>
                <input type="number" value={form.MucLuong} onChange={e => setForm({ ...form, MucLuong: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', border: `1px solid ${WOOD.border}`, borderRadius: '7px', boxSizing: 'border-box', fontSize: '14px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: WOOD.light, color: WOOD.text, border: `1px solid ${WOOD.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Hủy</button>
              <button onClick={handleSave} style={{ flex: 2, padding: '12px', background: WOOD.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '15px' }}>
                {editTarget ? 'Lưu thay đổi' : 'Tạo nhân viên'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi mật khẩu */}
      {showPwModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 20px', color: WOOD.text, display: 'flex', alignItems: 'center', gap: '8px' }}><FiKey size={17} /> Đặt lại mật khẩu</h3>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: WOOD.subtext, marginBottom: '8px' }}>Mật khẩu mới</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoFocus
              style={{ width: '100%', padding: '12px', border: `1px solid ${WOOD.border}`, borderRadius: '8px', boxSizing: 'border-box', fontSize: '14px', marginBottom: '20px' }} placeholder="Tối thiểu 6 ký tự" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPwModal(false)} style={{ flex: 1, padding: '12px', background: WOOD.light, color: WOOD.text, border: `1px solid ${WOOD.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Hủy</button>
              <button onClick={handleChangePw} style={{ flex: 2, padding: '12px', background: '#2980B9', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

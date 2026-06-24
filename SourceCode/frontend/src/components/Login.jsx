import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff, FiZap, FiClock, FiBarChart2, FiPackage } from 'react-icons/fi';
import { useAuth } from '../AuthContext';

// Tông màu nâu gỗ (Warm Wood) — đồng bộ với App.css
const W = {
  primary: '#8B5E3C',
  primaryDark: '#6B4226',
  accent: '#C49A6C',
  light: '#F5EDE3',
  border: '#D4B89A',
  text: '#4A2C0A',
  subtext: '#8C6A4A',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ TenDangNhap: '', MatKhau: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.TenDangNhap.trim(), form.MatKhau);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const inputWrap = { position: 'relative' };
  const iconStyle = { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: W.subtext };
  const inputStyle = {
    width: '100%', padding: '14px 14px 14px 44px',
    border: `1.5px solid ${W.border}`, borderRadius: '10px',
    fontSize: '15px', color: W.text, background: 'white',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: '#fff',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* ===== Cột trái: Form đăng nhập ===== */}
      <div style={{
        flex: '0 0 50%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: '40px 24px', position: 'relative',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '40px', height: '40px', borderRadius: '11px',
                background: `linear-gradient(135deg, ${W.accent}, ${W.primary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 900, fontSize: '20px',
              }}>F</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: W.primary, letterSpacing: '0.5px' }}>Foody</span>
            </div>
          </div>

          <h2 style={{ textAlign: 'center', margin: '0 0 6px', fontSize: '30px', fontWeight: 800, color: W.text }}>
            Đăng nhập
          </h2>
          <p style={{ textAlign: 'center', margin: '0 0 32px', fontSize: '14px', color: W.subtext }}>
            Vui lòng điền thông tin để đăng nhập.
          </p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: '#FDEDEC', color: '#C0392B', padding: '12px 16px',
                borderRadius: '10px', marginBottom: '20px', fontSize: '14px',
                border: '1px solid #F1948A',
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', fontWeight: 700, color: W.text }}>
                Tên đăng nhập
              </label>
              <div style={inputWrap}>
                <FiUser size={18} style={iconStyle} />
                <input
                  id="username"
                  type="text"
                  value={form.TenDangNhap}
                  onChange={(e) => setForm({ ...form, TenDangNhap: e.target.value })}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = W.primary}
                  onBlur={e => e.target.style.borderColor = W.border}
                  placeholder="Tên đăng nhập"
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', fontWeight: 700, color: W.text }}>
                Mật khẩu
              </label>
              <div style={inputWrap}>
                <FiLock size={18} style={iconStyle} />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.MatKhau}
                  onChange={(e) => setForm({ ...form, MatKhau: e.target.value })}
                  style={{ ...inputStyle, paddingRight: '44px' }}
                  onFocus={e => e.target.style.borderColor = W.primary}
                  onBlur={e => e.target.style.borderColor = W.border}
                  placeholder="Mật khẩu"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: W.subtext, display: 'inline-flex' }}
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => alert('Vui lòng liên hệ Quản lý để đặt lại mật khẩu.')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: W.primary, fontWeight: 600, fontSize: '14px', padding: 0 }}
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '15px',
                background: loading ? W.accent : `linear-gradient(135deg, ${W.primary}, ${W.primaryDark})`,
                color: 'white', border: 'none', borderRadius: '10px',
                fontWeight: 800, fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: `0 4px 16px rgba(139,94,60,0.35)`, transition: 'all 0.2s',
              }}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '24px', left: 0, right: 0, textAlign: 'center', fontSize: '13px', color: W.subtext }}>
          Hotline hỗ trợ: <strong style={{ color: W.primary }}>1900 1981</strong>
          <span style={{ margin: '0 8px' }}>·</span>
          Copyright © {new Date().getFullYear()} Foody. All Rights Reserved
        </div>
      </div>

      {/* ===== Cột phải: Panel giới thiệu ===== */}
      <div style={{
        flex: '0 0 50%',
        background: `linear-gradient(135deg, ${W.primary} 0%, ${W.primaryDark} 100%)`,
        color: W.light,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 56px',
      }}>
        <h1 style={{ fontSize: '38px', fontWeight: 900, margin: '0 0 18px', lineHeight: 1.2, color: '#fff' }}>
          Giải pháp Quản lý<br />bán hàng tổng thể
        </h1>
        <p style={{ fontSize: '17px', color: W.light, opacity: 0.9, margin: '0 0 40px', lineHeight: 1.6, maxWidth: '460px' }}>
          Không chỉ là phần mềm quản lý bán hàng, chúng tôi cung cấp cho bạn
          một giải pháp kinh doanh toàn diện.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '420px' }}>
          {[
            { Icon: FiZap, text: 'Xử lý đơn hàng nhanh chóng' },
            { Icon: FiClock, text: 'Kết nối bếp theo thời gian thực' },
            { Icon: FiBarChart2, text: 'Báo cáo doanh thu chi tiết' },
            { Icon: FiPackage, text: 'Quản lý kho nguyên liệu' },
          ].map(({ Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{
                width: '42px', height: '42px', borderRadius: '11px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={20} color="#fff" />
              </span>
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#fff' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

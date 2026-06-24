import { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiCheckCircle, FiClock, FiInbox } from 'react-icons/fi';
import api from '../api';

const WOOD = {
  primary: '#8B5E3C',
  light: '#F5EDE3',
  border: '#D4B89A',
  text: '#4A2C0A',
  subtext: '#8C6A4A',
  bg: '#FAF4EE',
  green: '#27AE60',
  orange: '#E08E2B',
};

export default function KitchenQueue() {
  const [items, setItems] = useState([]);

  const fetchQueue = useCallback(() => {
    api.get('/api/kitchen/queue').then((res) => setItems(res.data)).catch(() => {});
  }, []);

  // Polling 5 giây (đồng bộ gần thời gian thực giữa Order và Bếp)
  useEffect(() => {
    fetchQueue();
    const timer = setInterval(fetchQueue, 5000);
    return () => clearInterval(timer);
  }, [fetchQueue]);

  const markDone = (item) => {
    api
      .post('/api/kitchen/update_status', { MaHD: item.MaHD, MaMon: item.MaMon, TrangThaiMon: 'Xong' })
      .then(fetchQueue)
      .catch((err) => alert(err.response?.data?.error || 'Lỗi cập nhật'));
  };

  const fmtTime = (s) => (s ? new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

  const badge = (text, color, Icon) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: color + '1A', color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
      <Icon size={13} /> {text}
    </span>
  );

  const choXuLy = items.filter((i) => i.TrangThaiMon !== 'Xong').length;

  return (
    <div style={{ padding: '24px', background: WOOD.bg, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: WOOD.text, fontSize: '20px', fontWeight: 800 }}>Dịch vụ đang chờ</h2>
        <span style={{ background: WOOD.light, color: WOOD.primary, padding: '8px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '14px', border: `1px solid ${WOOD.border}` }}>
          {choXuLy} món đang chế biến
        </span>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: `1px solid ${WOOD.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(139,94,60,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: WOOD.light, textAlign: 'left' }}>
              {['Tên món', 'Loại', 'Bàn', 'Thời gian tạo', 'Trạng thái hoàn thành', 'Thanh toán'].map((h, i) => (
                <th key={h} style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 700, color: WOOD.text, textAlign: i >= 4 ? 'center' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const done = it.TrangThaiMon === 'Xong';
              const paid = it.TrangThaiHD === 'Đã thanh toán';
              return (
                <tr key={`${it.MaHD}-${it.MaMon}`} style={{ borderBottom: '1px solid #F0E6D8' }}>
                  <td style={{ padding: '14px 18px', fontSize: '15px', fontWeight: 700, color: WOOD.text }}>
                    {it.TenMon} <span style={{ color: WOOD.primary, fontWeight: 700 }}>× {it.SoLuong}</span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '14px', color: WOOD.subtext }}>{it.Loai || '—'}</td>
                  <td style={{ padding: '14px 18px', fontSize: '14px', color: WOOD.text }}>{it.TenBan}</td>
                  <td style={{ padding: '14px 18px', fontSize: '13px', color: WOOD.subtext }}>{fmtTime(it.ThoiGianGoi)}</td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    {done ? (
                      badge('Đã hoàn thành', WOOD.green, FiCheckCircle)
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        {badge('Đang chế biến', WOOD.orange, FiClock)}
                        <button
                          onClick={() => markDone(it)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: WOOD.green, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
                        >
                          <FiCheck size={15} /> Hoàn thành
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    {paid
                      ? badge('Đã thanh toán', WOOD.green, FiCheckCircle)
                      : badge('Chưa thanh toán', WOOD.orange, FiClock)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: WOOD.subtext }}>
            <FiInbox size={40} color={WOOD.border} />
            <div style={{ marginTop: '10px' }}>Không có món nào đang chờ</div>
          </div>
        )}
      </div>
    </div>
  );
}

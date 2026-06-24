import axios from 'axios';

// Một axios instance dùng chung cho toàn app.
// Tự đính kèm JWT token và tự đăng xuất khi token hết hạn (401).
const api = axios.create({
  baseURL: 'http://127.0.0.1:5000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Tránh vòng lặp nếu đang ở trang login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

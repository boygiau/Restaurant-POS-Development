# 🍽️ POS Restaurant Management System
> Phần mềm Point-of-Sale (POS) hỗ trợ quản lý bán hàng và đối soát lương nhân sự cho mô hình dịch vụ F&B.

![React](https://img.shields.io/badge/Frontend-ReactJS-blue?logo=react)
![Python](https://img.shields.io/badge/Backend-Python-green?logo=python)
![MySQL](https://img.shields.io/badge/Database-MySQL-orange?logo=mysql)

## 📖 Tổng quan dự án (Project Overview)
Dự án được xây dựng nhằm cung cấp một giải pháp quản trị tập trung, tự động hóa quy trình vận hành và tối ưu hóa quản lý nhân sự cho các hệ thống nhà hàng quy mô lớn chạy theo chuỗi. Hệ thống giúp ban quản lý dễ dàng kiểm soát chất lượng dịch vụ và mọi hoạt động tại các chi nhánh theo thời gian thực.

## 🎓 Thông tin học thuật (Academic Information)
- **Học viện:** HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG
- **Môn học:** THỰC TẬP CƠ SỞ
- **Giảng viên hướng dẫn:** Kim Ngọc Bách
- **Sinh viên thực hiện:** Nguyễn Minh Tuấn Kiệt
- **Mã sinh viên:** B23DCCE060
- **Lớp:** D23CQCE06-B

## ✨ Các tính năng chính (Key Features)

### 👨‍🍳 Dành cho Nhân viên & Bếp
- **Quản lý gọi món (Order Management):** Sơ đồ bàn trực quan, giao diện e-menu, gọi món và thêm ghi chú đặc biệt.
- **Phân tách định danh (Split-Seat Ordering):** Gắn thẻ định danh khách hàng trên cùng một bàn để dễ dàng tách hóa đơn.
- **Tiếp nhận luồng công việc (Order Queue):** Màn hình hiển thị danh sách món cần chế biến theo nguyên tắc FIFO tại bếp.

### 💳 Dành cho Thu ngân
- **Xử lý thanh toán phức hợp:** Hỗ trợ gộp hóa đơn (Merge Bill) hoặc tách hóa đơn (Split Bill).
- **Giao dịch & In ấn:** Tự động tính tổng tiền, thuế VAT, chiết khấu và in biên lai.

### 📊 Dành cho Quản lý
- **Quản lý thực đơn & Kho bãi:** Thêm/sửa/xóa món ăn, thiết lập định mức nguyên liệu và tự động trừ kho.
- **Quản lý hệ thống:** Phân quyền theo vai trò (Role-Based Access Control) cho nhân viên.
- **Báo cáo thống kê:** Biểu đồ doanh thu, hiệu suất làm việc của nhân viên.

## 🛠️ Công nghệ sử dụng (Tech Stack)
- **Frontend:** JavaScript, ReactJS (Single Page Application).
- **Backend:** Python (FastAPI / Django) với cơ chế giao tiếp thời gian thực WebSockets.
- **Cơ sở dữ liệu:** MySQL.

## 🚀 Hướng dẫn cài đặt (Installation & Setup)

### Yêu cầu hệ thống (Prerequisites)
- Node.js & npm
- Python 3.x
- MySQL Server

### 1. Cài đặt Cơ sở dữ liệu
1. Mở MySQL Workbench hoặc công cụ quản lý cơ sở dữ liệu.
2. Tạo một database mới (ví dụ: `restaurant_pos`).
3. Chạy file script SQL (nếu có) trong thư mục `database/` để khởi tạo các bảng.

### 2. Cài đặt Backend (Python)
```bash
# Di chuyển vào thư mục backend
cd backend

# Tạo môi trường ảo (Virtual Environment)
python -m venv venv
source venv/bin/activate  # Trên Windows dùng: venv\Scripts\activate

# Cài đặt

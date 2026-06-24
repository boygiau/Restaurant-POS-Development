-- =====================================================================
--  ShiftPOS - Khởi tạo CSDL (schema + dữ liệu mẫu)
--  Thứ tự: Chạy file này TRƯỚC, sau đó chạy ChucNang.sql
-- =====================================================================
DROP DATABASE IF EXISTS ShiftPOS;
CREATE DATABASE ShiftPOS CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ShiftPOS;

-- =====================================================================
-- 1. PHÂN HỆ KHÔNG GIAN
-- =====================================================================
CREATE TABLE KHUVUC (
    MaKV   VARCHAR(10) PRIMARY KEY,
    TenKV  VARCHAR(50)
);

CREATE TABLE BAN (
    MaBan    VARCHAR(10) PRIMARY KEY,
    TenBan   VARCHAR(50),
    TrangThai VARCHAR(50) DEFAULT 'Trống',
    MaKV     VARCHAR(10),
    FOREIGN KEY (MaKV) REFERENCES KHUVUC(MaKV)
);

-- =====================================================================
-- 2. PHÂN HỆ SẢN PHẨM & DỊCH VỤ
-- =====================================================================
CREATE TABLE DANHMUC (
    MaDM  VARCHAR(10) PRIMARY KEY,
    TenDM VARCHAR(100)
);

CREATE TABLE MONAN (
    MaMon    VARCHAR(10) PRIMARY KEY,
    TenMon   VARCHAR(100),
    DonGia   INT,
    TrangThai VARCHAR(50) DEFAULT 'Còn hàng',
    MaDM     VARCHAR(10),
    FOREIGN KEY (MaDM) REFERENCES DANHMUC(MaDM)
);

-- =====================================================================
-- 3. PHÂN HỆ NHÂN SỰ & TÀI KHOẢN (RBAC)
-- =====================================================================
CREATE TABLE NHANVIEN (
    MaNV     VARCHAR(10) PRIMARY KEY,
    TenNV    VARCHAR(50),
    VaiTro   VARCHAR(50),            -- 'Quản lý' | 'Thu ngân' | 'Phục vụ' | 'Bếp'
    MucLuong INT DEFAULT 5000000
);

CREATE TABLE TAIKHOAN (
    TenDangNhap VARCHAR(50) PRIMARY KEY,
    MatKhau     VARCHAR(255),        -- hash Werkzeug (scrypt / pbkdf2:sha256)
    MaNV        VARCHAR(10) UNIQUE,
    FOREIGN KEY (MaNV) REFERENCES NHANVIEN(MaNV)
);

-- =====================================================================
-- 4. PHÂN HỆ BÁN HÀNG & THU CHI
-- =====================================================================
CREATE TABLE HOADON (
    MaHD        INT AUTO_INCREMENT PRIMARY KEY,
    ThoiGianMo  DATETIME DEFAULT CURRENT_TIMESTAMP,
    ThoiGianDong DATETIME NULL,
    TrangThaiHD VARCHAR(50) DEFAULT 'Chưa thanh toán',
    PhuongThucTT VARCHAR(50) DEFAULT 'Tiền mặt',
    ChietKhau   DECIMAL(5,2) DEFAULT 0,   -- % chiết khấu (Phase 4)
    ThueVAT     DECIMAL(5,2) DEFAULT 0,   -- % VAT        (Phase 4)
    MaBan       VARCHAR(10),
    MaNV        VARCHAR(10),
    FOREIGN KEY (MaBan) REFERENCES BAN(MaBan),
    FOREIGN KEY (MaNV)  REFERENCES NHANVIEN(MaNV)
);

CREATE TABLE CHITIET_HD (
    MaHD        INT,
    MaMon       VARCHAR(10),
    SoLuong     INT,
    DonGiaLucBan INT,
    GhiChu      VARCHAR(100),
    TrangThaiMon VARCHAR(30) DEFAULT 'Chờ chế biến',  -- Phase 2: FIFO Bếp
    ThoiGianGoi  DATETIME DEFAULT CURRENT_TIMESTAMP,   -- Phase 2: sắp xếp FIFO
    PRIMARY KEY (MaHD, MaMon),
    FOREIGN KEY (MaHD)  REFERENCES HOADON(MaHD),
    FOREIGN KEY (MaMon) REFERENCES MONAN(MaMon)
);

CREATE TABLE THUCHI (
    MaPhieu  INT AUTO_INCREMENT PRIMARY KEY,
    LoaiPhieu VARCHAR(20),
    SoTien   INT,
    LyDo     VARCHAR(255),
    ThoiGian DATETIME DEFAULT CURRENT_TIMESTAMP,
    NguoiLap VARCHAR(10),
    FOREIGN KEY (NguoiLap) REFERENCES NHANVIEN(MaNV)
);

-- =====================================================================
-- DỮ LIỆU MẪU
-- =====================================================================

-- Khu vực & Bàn
INSERT INTO KHUVUC (MaKV, TenKV) VALUES
('KV1', 'Trong nhà'),
('KV2', 'Sân vườn');

INSERT INTO BAN (MaBan, TenBan, TrangThai, MaKV) VALUES
('B1', 'Bàn 1', 'Trống', 'KV1'),
('B2', 'Bàn 2', 'Trống', 'KV1'),
('B3', 'Bàn 3', 'Trống', 'KV2');

-- Danh mục & Món ăn
INSERT INTO DANHMUC (MaDM, TenDM) VALUES
('DM1', 'Đồ ăn'),
('DM2', 'Đồ uống'),
('DM3', 'Món gọi thêm');

INSERT INTO MONAN (MaMon, TenMon, DonGia, TrangThai, MaDM) VALUES
('M1',  'Cafe Đen Đá',                   25000, 'Còn hàng', 'DM2'),
('M2',  'Bạc Xỉu',                       30000, 'Còn hàng', 'DM2'),
('M3',  'Trà Đào Cam Sả',                35000, 'Còn hàng', 'DM2'),
('M4',  'Cacao Sữa',                     30000, 'Còn hàng', 'DM2'),
('M5',  'Trà Sâm Dứa',                    5000, 'Còn hàng', 'DM2'),
('M6',  'Bún Cá Niêu Gạo Lứt',           55000, 'Còn hàng', 'DM1'),
('M7',  'Bún Nghệ Cá Sá Sùng',           55000, 'Còn hàng', 'DM1'),
('M8',  'Miến Khoai Lang Cá Tầm',        65000, 'Còn hàng', 'DM1'),
('M9',  'Bún Cá Niêu Gạo Lứt Đặc Biệt', 85000, 'Còn hàng', 'DM1'),
('M10', 'Chả Mọc Cá',                   25000, 'Còn hàng', 'DM3'),
('M11', 'Bún Nghệ Cá Sá Sùng Đặc Biệt', 85000, 'Còn hàng', 'DM1');

-- Nhân viên quản lý (chỉ tạo 1 nhân viên chủ - admin)
-- Các nhân viên khác sẽ được tạo bởi admin qua giao diện quản lý
INSERT INTO NHANVIEN (MaNV, TenNV, VaiTro, MucLuong) VALUES
('NV01', 'Quản lý', 'Quản lý', 15000000);

-- Tài khoản admin duy nhất
-- Mật khẩu: zxcvbnm123
-- Hash được tạo bằng: werkzeug.security.generate_password_hash('zxcvbnm123')
INSERT INTO TAIKHOAN (TenDangNhap, MatKhau, MaNV) VALUES
('admin', 'scrypt:32768:8:1$gyVUxhmXY5oIYcli$6f4600225b34d84f92c191fd1870990db1622d46f69d4f2d762f7c7ef01870e378edfc4a56f9626cb8671ac1b9071097f42cc9dc6b192697b2e473eb04b0f717', 'NV01');

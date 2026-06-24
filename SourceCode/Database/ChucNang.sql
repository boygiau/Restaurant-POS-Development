-- =====================================================================
--  ShiftPOS - Functions / Procedures / Triggers / Views (BẢN RÚT GỌN)
--  Chạy file này SAU KhoiTao.sql
--  Chỉ giữ các đối tượng CHÍNH phục vụ demo & vận hành:
--    - 3 Functions, 5 Procedures, 2 Triggers, 5 Views
-- =====================================================================
USE ShiftPOS;

-- =====================================================================
-- PHẦN 1: FUNCTIONS (3)
-- =====================================================================
DELIMITER //

-- ─────────────────────────────────────────────────────────────────────
-- [F01] fn_TinhTienBan
-- Tính tổng tiền tạm tính (các hóa đơn CHƯA thanh toán) của một bàn.
-- Dùng trong: view vw_QuanLyViTri và API /api/tables (backend pos.py).
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS fn_TinhTienBan //
CREATE FUNCTION fn_TinhTienBan(p_MaBan VARCHAR(10))
RETURNS INT DETERMINISTIC
BEGIN
    DECLARE Tong INT;
    SELECT SUM(CT.SoLuong * CT.DonGiaLucBan) INTO Tong
    FROM HOADON H JOIN CHITIET_HD CT ON H.MaHD = CT.MaHD
    WHERE H.MaBan = p_MaBan AND H.TrangThaiHD = 'Chưa thanh toán';
    RETURN IFNULL(Tong, 0);
END //

-- ─────────────────────────────────────────────────────────────────────
-- [F02] fn_TinhThucThu
-- Tính tiền THỰC THU của 1 hóa đơn: SubTotal * (1 - CK%) * (1 + VAT%).
-- Khớp công thức _net trong backend reports.py.
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS fn_TinhThucThu //
CREATE FUNCTION fn_TinhThucThu(p_MaHD INT)
RETURNS INT DETERMINISTIC
BEGIN
    DECLARE v_SubTotal  INT;
    DECLARE v_ChietKhau DECIMAL(5,2);
    DECLARE v_ThueVAT   DECIMAL(5,2);

    SELECT SUM(SoLuong * DonGiaLucBan) INTO v_SubTotal
    FROM CHITIET_HD WHERE MaHD = p_MaHD;

    IF v_SubTotal IS NULL THEN
        RETURN 0;
    END IF;

    SELECT ChietKhau, ThueVAT INTO v_ChietKhau, v_ThueVAT
    FROM HOADON WHERE MaHD = p_MaHD;

    RETURN ROUND(
        v_SubTotal * (1 - IFNULL(v_ChietKhau, 0) / 100.0)
                   * (1 + IFNULL(v_ThueVAT,   0) / 100.0)
    );
END //

-- ─────────────────────────────────────────────────────────────────────
-- [F03] fn_TinhDoanhThuNhanVien
-- Tổng doanh thu (thực thu) mà 1 nhân viên mang lại (HĐ đã thanh toán).
-- ─────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS fn_TinhDoanhThuNhanVien //
CREATE FUNCTION fn_TinhDoanhThuNhanVien(p_MaNV VARCHAR(10))
RETURNS INT DETERMINISTIC
BEGIN
    DECLARE v_Total INT DEFAULT 0;
    SELECT IFNULL(SUM(fn_TinhThucThu(H.MaHD)), 0) INTO v_Total
    FROM HOADON H
    WHERE H.MaNV = p_MaNV AND H.TrangThaiHD = 'Đã thanh toán';
    RETURN v_Total;
END //


-- =====================================================================
-- PHẦN 2: PROCEDURES (5)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- [P01] sp_TaoHoaDon
-- Tạo hóa đơn mới cho 1 bàn; OUT p_MaHD trả về mã hóa đơn vừa tạo.
-- (Trigger trg_CapNhatTrangThaiBan_ThemHD sẽ tự đặt bàn 'Đang phục vụ')
-- ─────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_TaoHoaDon //
CREATE PROCEDURE sp_TaoHoaDon(
    IN  p_MaBan VARCHAR(10),
    IN  p_MaNV  VARCHAR(10),
    OUT p_MaHD  INT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM BAN WHERE MaBan = p_MaBan) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Bàn không tồn tại!';
    END IF;

    INSERT INTO HOADON (MaBan, MaNV, TrangThaiHD) VALUES (p_MaBan, p_MaNV, 'Chưa thanh toán');
    SET p_MaHD = LAST_INSERT_ID();
END //

-- ─────────────────────────────────────────────────────────────────────
-- [P02] sp_ThemMon
-- Thêm/tăng số lượng món vào 1 hóa đơn (tự lấy đơn giá hiện tại của món).
-- ─────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_ThemMon //
CREATE PROCEDURE sp_ThemMon(IN p_MaHD INT, IN p_MaMon VARCHAR(10))
BEGIN
    DECLARE v_DonGia INT;
    SELECT DonGia INTO v_DonGia FROM MONAN WHERE MaMon = p_MaMon;

    IF v_DonGia IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Món ăn không tồn tại!';
    END IF;

    INSERT INTO CHITIET_HD (MaHD, MaMon, SoLuong, DonGiaLucBan, TrangThaiMon, ThoiGianGoi)
    VALUES (p_MaHD, p_MaMon, 1, v_DonGia, 'Chờ chế biến', NOW())
    ON DUPLICATE KEY UPDATE SoLuong = SoLuong + 1,
                            TrangThaiMon = 'Chờ chế biến',
                            ThoiGianGoi = NOW();
END //

-- ─────────────────────────────────────────────────────────────────────
-- [P03] sp_ThanhToan
-- Thanh toán hóa đơn: cập nhật trạng thái, PTTT, chiết khấu, VAT.
-- (Trigger trg_DonBan_SauThanhToan tự set ThoiGianDong & dọn bàn)
-- ─────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_ThanhToan //
CREATE PROCEDURE sp_ThanhToan(
    IN p_MaHD        INT,
    IN p_PhuongThucTT VARCHAR(50),
    IN p_ChietKhau   DECIMAL(5,2),
    IN p_ThueVAT     DECIMAL(5,2)
)
BEGIN
    DECLARE v_TrangThai VARCHAR(50);
    SELECT TrangThaiHD INTO v_TrangThai FROM HOADON WHERE MaHD = p_MaHD;

    IF v_TrangThai IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Hóa đơn không tồn tại!';
    END IF;
    IF v_TrangThai = 'Đã thanh toán' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Hóa đơn này đã được thanh toán!';
    END IF;

    UPDATE HOADON
    SET TrangThaiHD = 'Đã thanh toán',
        PhuongThucTT = p_PhuongThucTT,
        ChietKhau = p_ChietKhau,
        ThueVAT = p_ThueVAT
    WHERE MaHD = p_MaHD;
END //

-- ─────────────────────────────────────────────────────────────────────
-- [P04] sp_ChuyenBan
-- Chuyển bàn: dời toàn bộ hóa đơn chưa thanh toán sang bàn mới,
-- cập nhật trạng thái 2 bàn.
-- ─────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_ChuyenBan //
CREATE PROCEDURE sp_ChuyenBan(IN p_BanCu VARCHAR(10), IN p_BanMoi VARCHAR(10))
BEGIN
    UPDATE HOADON SET MaBan = p_BanMoi
    WHERE MaBan = p_BanCu AND TrangThaiHD = 'Chưa thanh toán';
    UPDATE BAN SET TrangThai = 'Đang phục vụ' WHERE MaBan = p_BanMoi;
    UPDATE BAN SET TrangThai = 'Trống'        WHERE MaBan = p_BanCu;
END //

-- ─────────────────────────────────────────────────────────────────────
-- [P05] sp_TaoPhieuThuChi
-- Tạo phiếu Thu/Chi trong sổ thu chi; OUT p_MaPhieu trả về mã phiếu.
-- ─────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_TaoPhieuThuChi //
CREATE PROCEDURE sp_TaoPhieuThuChi(
    IN  p_LoaiPhieu VARCHAR(20),
    IN  p_SoTien    INT,
    IN  p_LyDo      VARCHAR(255),
    IN  p_NguoiLap  VARCHAR(10),
    OUT p_MaPhieu   INT
)
BEGIN
    IF p_LoaiPhieu NOT IN ('Thu', 'Chi') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Loại phiếu phải là Thu hoặc Chi!';
    END IF;
    IF p_SoTien <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Số tiền phải lớn hơn 0!';
    END IF;

    INSERT INTO THUCHI (LoaiPhieu, SoTien, LyDo, NguoiLap)
    VALUES (p_LoaiPhieu, p_SoTien, p_LyDo, p_NguoiLap);
    SET p_MaPhieu = LAST_INSERT_ID();
END //


-- =====================================================================
-- PHẦN 3: TRIGGERS (2)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- [T01] trg_DonBan_SauThanhToan  (BEFORE UPDATE ON HOADON)
-- Khi hóa đơn chuyển sang 'Đã thanh toán': tự set ThoiGianDong,
-- và nếu bàn không còn hóa đơn chưa thanh toán nào thì trả bàn về 'Trống'.
-- ─────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_DonBan_SauThanhToan //
CREATE TRIGGER trg_DonBan_SauThanhToan
BEFORE UPDATE ON HOADON
FOR EACH ROW
BEGIN
    IF NEW.TrangThaiHD = 'Đã thanh toán' AND OLD.TrangThaiHD <> 'Đã thanh toán' THEN
        SET NEW.ThoiGianDong = CURRENT_TIMESTAMP;
        IF (SELECT COUNT(*) FROM HOADON
            WHERE MaBan = NEW.MaBan
              AND TrangThaiHD = 'Chưa thanh toán'
              AND MaHD <> NEW.MaHD) = 0 THEN
            UPDATE BAN SET TrangThai = 'Trống' WHERE MaBan = NEW.MaBan;
        END IF;
    END IF;
END //

-- ─────────────────────────────────────────────────────────────────────
-- [T02] trg_CapNhatTrangThaiBan_ThemHD  (AFTER INSERT ON HOADON)
-- Khi tạo hóa đơn mới (chưa thanh toán) → tự đặt bàn sang 'Đang phục vụ'.
-- ─────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_CapNhatTrangThaiBan_ThemHD //
CREATE TRIGGER trg_CapNhatTrangThaiBan_ThemHD
AFTER INSERT ON HOADON
FOR EACH ROW
BEGIN
    IF NEW.TrangThaiHD = 'Chưa thanh toán' THEN
        UPDATE BAN SET TrangThai = 'Đang phục vụ' WHERE MaBan = NEW.MaBan;
    END IF;
END //

DELIMITER ;


-- =====================================================================
-- PHẦN 4: VIEWS (5)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- [V01] vw_QuanLyViTri
-- Dashboard bàn: mỗi bàn kèm khu vực, hóa đơn đang mở, tiền tạm tính.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_QuanLyViTri AS
SELECT
    B.MaBan, B.TenBan, B.MaKV, K.TenKV, B.TrangThai,
    H.MaHD, H.ThoiGianMo,
    fn_TinhTienBan(B.MaBan) AS TienTamTinh
FROM BAN B
LEFT JOIN KHUVUC K  ON B.MaKV = K.MaKV
LEFT JOIN HOADON H  ON B.MaBan = H.MaBan AND H.TrangThaiHD = 'Chưa thanh toán';

-- ─────────────────────────────────────────────────────────────────────
-- [V02] vw_DoanhThuTheoNgay
-- Doanh thu thực thu theo ngày (chỉ hóa đơn đã thanh toán).
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_DoanhThuTheoNgay AS
SELECT
    DATE(ThoiGianDong)              AS Ngay,
    COUNT(MaHD)                     AS SoHoaDon,
    SUM(fn_TinhThucThu(MaHD))       AS TongDoanhThu
FROM HOADON
WHERE TrangThaiHD = 'Đã thanh toán'
GROUP BY DATE(ThoiGianDong);

-- ─────────────────────────────────────────────────────────────────────
-- [V03] vw_HieuSuatNhanVien
-- Hiệu suất nhân viên: số hóa đơn xử lý & doanh thu mang lại.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_HieuSuatNhanVien AS
SELECT
    NV.MaNV, NV.TenNV, NV.VaiTro,
    COUNT(H.MaHD)                           AS SoHoaDon,
    IFNULL(SUM(fn_TinhThucThu(H.MaHD)), 0)  AS DoanhThu
FROM NHANVIEN NV
LEFT JOIN HOADON H ON NV.MaNV = H.MaNV AND H.TrangThaiHD = 'Đã thanh toán'
GROUP BY NV.MaNV, NV.TenNV, NV.VaiTro
ORDER BY DoanhThu DESC;

-- ─────────────────────────────────────────────────────────────────────
-- [V04] vw_MonBanChay
-- Món bán chạy: tổng số lượng đã bán & doanh thu (HĐ đã thanh toán).
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_MonBanChay AS
SELECT
    M.MaMon, M.TenMon, M.DonGia, D.TenDM,
    SUM(CT.SoLuong)                   AS TongSoLuongBan,
    SUM(CT.SoLuong * CT.DonGiaLucBan) AS TongDoanhThu
FROM CHITIET_HD CT
JOIN HOADON H  ON CT.MaHD = H.MaHD
JOIN MONAN M   ON CT.MaMon = M.MaMon
LEFT JOIN DANHMUC D ON M.MaDM = D.MaDM
WHERE H.TrangThaiHD = 'Đã thanh toán'
GROUP BY M.MaMon, M.TenMon, M.DonGia, D.TenDM
ORDER BY TongSoLuongBan DESC;

-- ─────────────────────────────────────────────────────────────────────
-- [V05] vw_PhieuThuChi
-- Sổ thu chi: danh sách phiếu Thu/Chi kèm tên người lập.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_PhieuThuChi AS
SELECT
    TC.MaPhieu, TC.LoaiPhieu, TC.SoTien, TC.LyDo, TC.ThoiGian,
    TC.NguoiLap, NV.TenNV AS TenNguoiLap
FROM THUCHI TC
LEFT JOIN NHANVIEN NV ON TC.NguoiLap = NV.MaNV
ORDER BY TC.ThoiGian DESC, TC.MaPhieu DESC;

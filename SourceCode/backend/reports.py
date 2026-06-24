"""Báo cáo: doanh thu theo PTTT (Phase 0), hiệu suất nhân viên & theo tháng (Phase 4)."""
from collections import defaultdict
from datetime import datetime

from flask import Blueprint, jsonify, request

from auth import require_role
from db import query

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


def _parse_date(s):
    """Đọc 'YYYY-MM-DD' -> date, lỗi thì None."""
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _in_range(dt, tu, den):
    """dt (datetime) có nằm trong [tu, den] (date, có thể None) không."""
    if dt is None:
        return False
    d = dt.date()
    if tu and d < tu:
        return False
    if den and d > den:
        return False
    return True


def _net(subtotal, chiet_khau, thue_vat):
    """Tiền thực thu = tạm tính * (1 - CK%) * (1 + VAT%).

    Ép float vì MySQL trả về Decimal (Decimal * float sẽ lỗi)."""
    return round(float(subtotal or 0) * (1 - float(chiet_khau or 0) / 100.0) * (1 + float(thue_vat or 0) / 100.0))


def _paid_invoices():
    """Hóa đơn đã thanh toán kèm tạm tính, CK, VAT, PTTT, thời gian đóng."""
    return query(
        "SELECT H.MaHD, H.MaNV, H.PhuongThucTT, H.ChietKhau, H.ThueVAT, H.ThoiGianDong, "
        "IFNULL(SUM(CT.SoLuong * CT.DonGiaLucBan), 0) AS TamTinh "
        "FROM HOADON H LEFT JOIN CHITIET_HD CT ON H.MaHD = CT.MaHD "
        "WHERE H.TrangThaiHD='Đã thanh toán' "
        "GROUP BY H.MaHD, H.MaNV, H.PhuongThucTT, H.ChietKhau, H.ThueVAT, H.ThoiGianDong"
    )


@reports_bp.route("/revenue", methods=["GET"])
@require_role()  # chỉ Quản lý
def revenue():
    """Doanh thu gom theo (Ngày, Phương thức thanh toán)."""
    agg = defaultdict(lambda: {"SoHoaDon": 0, "TongDoanhThu": 0})
    for inv in _paid_invoices():
        if not inv["ThoiGianDong"]:
            continue
        ngay = inv["ThoiGianDong"].strftime("%Y-%m-%d")
        pttt = inv["PhuongThucTT"] or "Tiền mặt"
        key = (ngay, pttt)
        agg[key]["SoHoaDon"] += 1
        agg[key]["TongDoanhThu"] += _net(inv["TamTinh"], inv["ChietKhau"], inv["ThueVAT"])
    result = [
        {"Ngay": ngay, "PhuongThucTT": pttt, "SoHoaDon": v["SoHoaDon"], "TongDoanhThu": v["TongDoanhThu"]}
        for (ngay, pttt), v in agg.items()
    ]
    result.sort(key=lambda r: (r["Ngay"], r["PhuongThucTT"]), reverse=True)
    return jsonify(result)


@reports_bp.route("/employee", methods=["GET"])
@require_role()  # chỉ Quản lý
def employee_performance():
    """Hiệu suất nhân viên: số hóa đơn xử lý và doanh thu mang lại."""
    names = {r["MaNV"]: r["TenNV"] for r in query("SELECT MaNV, TenNV FROM NHANVIEN")}
    agg = defaultdict(lambda: {"SoHoaDon": 0, "DoanhThu": 0})
    for inv in _paid_invoices():
        manv = inv["MaNV"]
        if not manv:
            continue
        agg[manv]["SoHoaDon"] += 1
        agg[manv]["DoanhThu"] += _net(inv["TamTinh"], inv["ChietKhau"], inv["ThueVAT"])
    result = [
        {"MaNV": manv, "TenNV": names.get(manv, manv), "SoHoaDon": v["SoHoaDon"], "DoanhThu": v["DoanhThu"]}
        for manv, v in agg.items()
    ]
    result.sort(key=lambda r: r["DoanhThu"], reverse=True)
    return jsonify(result)


@reports_bp.route("/monthly", methods=["GET"])
@require_role()  # chỉ Quản lý
def monthly_revenue():
    """Doanh thu theo tháng (cho biểu đồ)."""
    agg = defaultdict(int)
    for inv in _paid_invoices():
        if not inv["ThoiGianDong"]:
            continue
        thang = inv["ThoiGianDong"].strftime("%Y-%m")
        agg[thang] += _net(inv["TamTinh"], inv["ChietKhau"], inv["ThueVAT"])
    result = [{"Thang": k, "DoanhThu": v} for k, v in sorted(agg.items())]
    return jsonify(result)


@reports_bp.route("/overview", methods=["GET"])
@require_role()  # chỉ Quản lý
def overview():
    """Tổng hợp báo cáo cho 1 màn hình:
      - TongDoanhThu, SoHoaDon
      - TheoPhuongThuc: doanh thu & số đơn theo hình thức thanh toán
      - TheoGio: doanh thu & số đơn theo từng khung giờ (0-23) -> nhận biết giờ cao điểm
      - BanChay: sản phẩm bán chạy (theo số lượng)
      - ChiTietMon: chi tiết từng món đã bán (tên, loại, thời gian TT, giá, hình thức TT)

    Lọc theo khoảng ngày qua query param ?tu=YYYY-MM-DD&den=YYYY-MM-DD (tùy chọn).
    """
    tu = _parse_date(request.args.get("tu"))
    den = _parse_date(request.args.get("den"))

    # ----- Cấp hóa đơn: tổng, theo PTTT, theo giờ -----
    tong = 0
    so_hd = 0
    by_method = defaultdict(lambda: {"DoanhThu": 0, "SoHoaDon": 0})
    by_hour = {h: {"DoanhThu": 0, "SoHoaDon": 0} for h in range(24)}
    for inv in _paid_invoices():
        if not _in_range(inv["ThoiGianDong"], tu, den):
            continue
        net = _net(inv["TamTinh"], inv["ChietKhau"], inv["ThueVAT"])
        tong += net
        so_hd += 1
        pttt = inv["PhuongThucTT"] or "Tiền mặt"
        by_method[pttt]["DoanhThu"] += net
        by_method[pttt]["SoHoaDon"] += 1
        if inv["ThoiGianDong"]:
            h = inv["ThoiGianDong"].hour
            by_hour[h]["DoanhThu"] += net
            by_hour[h]["SoHoaDon"] += 1

    # ----- Cấp món: chi tiết & bán chạy -----
    lines = query(
        "SELECT H.PhuongThucTT, H.ThoiGianDong, CT.MaMon, M.TenMon, "
        "DM.TenDM AS Loai, CT.SoLuong, CT.DonGiaLucBan "
        "FROM HOADON H "
        "JOIN CHITIET_HD CT ON H.MaHD = CT.MaHD "
        "JOIN MONAN M ON CT.MaMon = M.MaMon "
        "LEFT JOIN DANHMUC DM ON M.MaDM = DM.MaDM "
        "WHERE H.TrangThaiHD='Đã thanh toán' "
        "ORDER BY H.ThoiGianDong DESC"
    )
    chi_tiet = []
    ban_chay = defaultdict(lambda: {"TenMon": "", "Loai": "—", "SoLuong": 0, "DoanhThu": 0})
    for r in lines:
        if not _in_range(r["ThoiGianDong"], tu, den):
            continue
        thanh_tien = int((r["SoLuong"] or 0) * (r["DonGiaLucBan"] or 0))
        chi_tiet.append({
            "TenMon": r["TenMon"],
            "Loai": r["Loai"] or "—",
            "ThoiGianThanhToan": r["ThoiGianDong"].strftime("%Y-%m-%d %H:%M:%S") if r["ThoiGianDong"] else None,
            "SoLuong": r["SoLuong"],
            "ThanhTien": thanh_tien,
            "PhuongThucTT": r["PhuongThucTT"] or "Tiền mặt",
        })
        b = ban_chay[r["MaMon"]]
        b["TenMon"] = r["TenMon"]
        b["Loai"] = r["Loai"] or "—"
        b["SoLuong"] += r["SoLuong"] or 0
        b["DoanhThu"] += thanh_tien

    # Chỉ tính món ăn (Đồ ăn), không tính đồ uống; lấy 3 món bán chạy nhất
    ban_chay_list = sorted(
        [x for x in ban_chay.values() if x["Loai"] == "Đồ ăn"],
        key=lambda x: x["SoLuong"],
        reverse=True,
    )[:3]

    return jsonify({
        "TongDoanhThu": tong,
        "SoHoaDon": so_hd,
        "TheoPhuongThuc": [{"PhuongThucTT": k, **v} for k, v in by_method.items()],
        "TheoGio": [{"Gio": f"{h:02d}:00", "DoanhThu": by_hour[h]["DoanhThu"], "SoHoaDon": by_hour[h]["SoHoaDon"]} for h in range(24)],
        "BanChay": ban_chay_list,
        "ChiTietMon": chi_tiet[:200],
    })

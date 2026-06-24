"""Phase 0 - Các API nền tảng cho màn hình POS (quản lý vị trí, đặt món, thanh toán).

Khớp đúng các endpoint mà frontend (App.jsx) đang gọi.
"""
from flask import Blueprint, request, jsonify, g

from auth import require_role
from db import query, query_one, execute

pos_bp = Blueprint("pos", __name__, url_prefix="/api")

# Vai trò được phép thao tác nghiệp vụ bán hàng (Quản lý luôn được phép - xem require_role)
SALES_ROLES = ("Thu ngân", "Phục vụ")
CASHIER_ROLES = ("Thu ngân",)


def _current_manv():
    user = getattr(g, "current_user", None)
    return user.get("MaNV") if user else None


def _refresh_table_status(maban):
    """Cập nhật trạng thái bàn dựa trên số hóa đơn chưa thanh toán."""
    row = query_one(
        "SELECT COUNT(*) AS c FROM HOADON WHERE MaBan=%s AND TrangThaiHD='Chưa thanh toán'",
        (maban,),
    )
    new_status = "Đang phục vụ" if row and row["c"] > 0 else "Trống"
    execute("UPDATE BAN SET TrangThai=%s WHERE MaBan=%s", (new_status, maban))


# ---------------------------------------------------------------- Danh mục dữ liệu
@pos_bp.route("/areas", methods=["GET"])
@require_role(*SALES_ROLES)
def get_areas():
    return jsonify(query("SELECT MaKV, TenKV FROM KHUVUC ORDER BY MaKV"))


@pos_bp.route("/areas", methods=["POST"])
@require_role()  # Chỉ Quản lý được tạo khu vực
def create_area():
    data = request.get_json(silent=True) or {}
    makv, tenkv = data.get("MaKV"), data.get("TenKV")
    if not makv or not tenkv:
        return jsonify({"error": "Thiếu MaKV hoặc TenKV"}), 400
    if query_one("SELECT 1 FROM KHUVUC WHERE MaKV=%s", (makv,)):
        return jsonify({"error": "Mã khu vực đã tồn tại"}), 409
    execute("INSERT INTO KHUVUC (MaKV, TenKV) VALUES (%s, %s)", (makv, tenkv))
    return jsonify({"message": "Tạo khu vực thành công", "MaKV": makv}), 201


@pos_bp.route("/areas/<makv>", methods=["PUT"])
@require_role()  # Chỉ Quản lý được sửa khu vực
def update_area(makv):
    data = request.get_json(silent=True) or {}
    tenkv = data.get("TenKV")
    if not tenkv:
        return jsonify({"error": "Thiếu TenKV"}), 400
    if not query_one("SELECT 1 FROM KHUVUC WHERE MaKV=%s", (makv,)):
        return jsonify({"error": "Không tìm thấy khu vực"}), 404
    execute("UPDATE KHUVUC SET TenKV=%s WHERE MaKV=%s", (tenkv, makv))
    return jsonify({"message": "Cập nhật khu vực thành công"})


@pos_bp.route("/areas/<makv>", methods=["DELETE"])
@require_role()  # Chỉ Quản lý được xóa khu vực
def delete_area(makv):
    if not query_one("SELECT 1 FROM KHUVUC WHERE MaKV=%s", (makv,)):
        return jsonify({"error": "Không tìm thấy khu vực"}), 404
    if query_one("SELECT 1 FROM BAN WHERE MaKV=%s", (makv,)):
        return jsonify({"error": "Khu vực vẫn còn bàn, không thể xóa"}), 409
    execute("DELETE FROM KHUVUC WHERE MaKV=%s", (makv,))
    return jsonify({"message": "Đã xóa khu vực"})


@pos_bp.route("/categories", methods=["GET"])
@require_role(*SALES_ROLES)
def get_categories():
    return jsonify(query("SELECT MaDM, TenDM FROM DANHMUC ORDER BY MaDM"))


@pos_bp.route("/menu", methods=["GET"])
@require_role(*SALES_ROLES)
def get_menu():
    return jsonify(
        query(
            "SELECT MaMon, TenMon, DonGia, TrangThai, MaDM FROM MONAN "
            "WHERE TrangThai='Còn hàng' ORDER BY MaMon"
        )
    )


# ---------------------------------------------------------------- Bàn
@pos_bp.route("/tables", methods=["GET"])
@require_role(*SALES_ROLES)
def get_tables():
    # Lấy trực tiếp từ BAN để giữ cột MaKV (view vw_QuanLyViTri không trả MaKV)
    try:
        rows = query(
            "SELECT B.MaBan, B.TenBan, B.TrangThai, B.MaKV, "
            "IFNULL(fn_TinhTienBan(B.MaBan), 0) AS TienTamTinh "
            "FROM BAN B ORDER BY B.MaBan"
        )
    except Exception:
        # Fallback: trả dữ liệu bàn mà không tính tiền tạm tính (tránh crash khi DB lỗi)
        rows = query(
            "SELECT B.MaBan, B.TenBan, B.TrangThai, B.MaKV, "
            "IFNULL((SELECT SUM(CT.SoLuong * CT.DonGiaLucBan) "
            "FROM HOADON H JOIN CHITIET_HD CT ON H.MaHD=CT.MaHD "
            "WHERE H.MaBan=B.MaBan AND H.TrangThaiHD='Chưa thanh toán'), 0) AS TienTamTinh "
            "FROM BAN B ORDER BY B.MaBan"
        )
    return jsonify(rows)


@pos_bp.route("/tables", methods=["POST"])
@require_role()  # Chỉ Quản lý được thêm bàn
def create_table():
    data = request.get_json(silent=True) or {}
    maban, tenban, makv = data.get("MaBan"), data.get("TenBan"), data.get("MaKV")
    if not maban or not tenban or not makv:
        return jsonify({"error": "Thiếu MaBan, TenBan hoặc MaKV"}), 400
    if query_one("SELECT 1 FROM BAN WHERE MaBan=%s", (maban,)):
        return jsonify({"error": "Mã bàn đã tồn tại"}), 409
    execute(
        "INSERT INTO BAN (MaBan, TenBan, TrangThai, MaKV) VALUES (%s, %s, 'Trống', %s)",
        (maban, tenban, makv),
    )
    return jsonify({"message": "Thêm bàn thành công", "MaBan": maban}), 201


@pos_bp.route("/tables/<maban>", methods=["PUT"])
@require_role()  # Chỉ Quản lý được sửa bàn
def update_table(maban):
    data = request.get_json(silent=True) or {}
    tenban = data.get("TenBan")
    if not tenban:
        return jsonify({"error": "Thiếu TenBan"}), 400
    if not query_one("SELECT 1 FROM BAN WHERE MaBan=%s", (maban,)):
        return jsonify({"error": "Không tìm thấy bàn"}), 404
    execute("UPDATE BAN SET TenBan=%s WHERE MaBan=%s", (tenban, maban))
    return jsonify({"message": "Cập nhật thành công"})


@pos_bp.route("/tables/<maban>", methods=["DELETE"])
@require_role()  # Chỉ Quản lý được xóa bàn
def delete_table(maban):
    if query_one(
        "SELECT 1 FROM HOADON WHERE MaBan=%s AND TrangThaiHD='Chưa thanh toán'", (maban,)
    ):
        return jsonify({"error": "Bàn đang có hóa đơn chưa thanh toán, không thể xóa"}), 409
    execute("DELETE FROM BAN WHERE MaBan=%s", (maban,))
    return jsonify({"message": "Đã xóa bàn"})


@pos_bp.route("/tables/move_merge", methods=["POST"])
@require_role(*SALES_ROLES)
def move_merge():
    data = request.get_json(silent=True) or {}
    mahd, ban_cu, ban_moi = data.get("MaHD"), data.get("BanCu"), data.get("BanMoi")
    if not ban_cu or not ban_moi:
        return jsonify({"error": "Thiếu thông tin bàn"}), 400

    target = query_one("SELECT TrangThai FROM BAN WHERE MaBan=%s", (ban_moi,))
    if not target:
        return jsonify({"error": "Không tìm thấy bàn đích"}), 404
    is_merge = target["TrangThai"] != "Trống"

    if mahd:  # Chuyển/gộp một hóa đơn cụ thể
        execute(
            "UPDATE HOADON SET MaBan=%s WHERE MaHD=%s AND TrangThaiHD='Chưa thanh toán'",
            (ban_moi, mahd),
        )
    else:  # Chuyển toàn bộ hóa đơn của bàn cũ
        execute(
            "UPDATE HOADON SET MaBan=%s WHERE MaBan=%s AND TrangThaiHD='Chưa thanh toán'",
            (ban_moi, ban_cu),
        )
    _refresh_table_status(ban_moi)
    _refresh_table_status(ban_cu)
    msg = "Gộp bàn thành công" if is_merge else "Chuyển bàn thành công"
    return jsonify({"message": msg})


# ---------------------------------------------------------------- Hóa đơn & đặt món
def _invoice_items(mahd):
    return query(
        "SELECT CT.MaMon, M.TenMon, CT.SoLuong, CT.DonGiaLucBan AS DonGia, "
        "(CT.SoLuong * CT.DonGiaLucBan) AS ThanhTien, CT.TrangThaiMon "
        "FROM CHITIET_HD CT JOIN MONAN M ON CT.MaMon = M.MaMon "
        "WHERE CT.MaHD=%s ORDER BY CT.ThoiGianGoi",
        (mahd,),
    )


@pos_bp.route("/invoices/<maban>", methods=["GET"])
@require_role(*SALES_ROLES)
def get_invoices(maban):
    invoices = query(
        "SELECT MaHD, ThoiGianMo, ChietKhau, ThueVAT FROM HOADON "
        "WHERE MaBan=%s AND TrangThaiHD='Chưa thanh toán' ORDER BY MaHD",
        (maban,),
    )
    for inv in invoices:
        inv["Items"] = _invoice_items(inv["MaHD"])
    return jsonify(invoices)


@pos_bp.route("/orders", methods=["GET"])
@require_role(*SALES_ROLES)
def list_paid_orders():
    """Danh sách hóa đơn ĐÃ thanh toán (màn Hóa đơn): mỗi dòng 1 hóa đơn."""
    rows = query(
        "SELECT H.MaHD, H.MaNV, NV.TenNV, H.MaBan, B.TenBan, H.PhuongThucTT, "
        "H.ChietKhau, H.ThueVAT, H.ThoiGianMo, H.ThoiGianDong, H.TrangThaiHD, "
        "IFNULL(SUM(CT.SoLuong * CT.DonGiaLucBan),0) AS TamTinh, "
        "IFNULL(SUM(CT.SoLuong),0) AS SoLuong, COUNT(CT.MaMon) AS SoMon "
        "FROM HOADON H "
        "LEFT JOIN NHANVIEN NV ON H.MaNV=NV.MaNV "
        "LEFT JOIN BAN B ON H.MaBan=B.MaBan "
        "LEFT JOIN CHITIET_HD CT ON H.MaHD=CT.MaHD "
        "WHERE H.TrangThaiHD='Đã thanh toán' "
        "GROUP BY H.MaHD, H.MaNV, NV.TenNV, H.MaBan, B.TenBan, H.PhuongThucTT, "
        "H.ChietKhau, H.ThueVAT, H.ThoiGianMo, H.ThoiGianDong, H.TrangThaiHD "
        "ORDER BY H.ThoiGianDong DESC"
    )
    result = []
    for r in rows:
        tam = float(r["TamTinh"] or 0)
        ck = float(r["ChietKhau"] or 0)
        vat = float(r["ThueVAT"] or 0)
        net = round(tam * (1 - ck / 100.0) * (1 + vat / 100.0))
        result.append({
            "MaHD": r["MaHD"],
            "TenNV": r["TenNV"] or r["MaNV"] or "—",
            "TenBan": r["TenBan"] or "—",
            "PhuongThucTT": r["PhuongThucTT"] or "Tiền mặt",
            "ThoiGianMo": r["ThoiGianMo"].strftime("%Y-%m-%d %H:%M:%S") if r["ThoiGianMo"] else None,
            "ThoiGianThanhToan": r["ThoiGianDong"].strftime("%Y-%m-%d %H:%M:%S") if r["ThoiGianDong"] else None,
            "TongTien": net,
            "SoLuong": int(r["SoLuong"] or 0),
            "SoMon": int(r["SoMon"] or 0),
            "TrangThaiHD": r["TrangThaiHD"],
        })
    return jsonify(result)


@pos_bp.route("/invoice/create/<maban>", methods=["POST"])
@require_role(*SALES_ROLES)
def create_invoice(maban):
    if not query_one("SELECT 1 FROM BAN WHERE MaBan=%s", (maban,)):
        return jsonify({"error": "Không tìm thấy bàn"}), 404
    mahd = execute(
        "INSERT INTO HOADON (MaBan, MaNV, TrangThaiHD) VALUES (%s, %s, 'Chưa thanh toán')",
        (maban, _current_manv()),
    )
    execute("UPDATE BAN SET TrangThai='Đang phục vụ' WHERE MaBan=%s", (maban,))
    return jsonify({"MaHD": mahd}), 201


@pos_bp.route("/invoices/<int:mahd>", methods=["DELETE"])
@require_role(*SALES_ROLES)
def delete_invoice(mahd):
    inv = query_one("SELECT MaBan FROM HOADON WHERE MaHD=%s", (mahd,))
    if not inv:
        return jsonify({"error": "Không tìm thấy hóa đơn"}), 404
    if query_one("SELECT TrangThaiHD FROM HOADON WHERE MaHD=%s", (mahd,))["TrangThaiHD"] == "Đã thanh toán":
        return jsonify({"error": "Không thể xóa hóa đơn đã thanh toán"}), 409
    execute("DELETE FROM CHITIET_HD WHERE MaHD=%s", (mahd,))
    execute("DELETE FROM HOADON WHERE MaHD=%s", (mahd,))
    _refresh_table_status(inv["MaBan"])
    return jsonify({"message": "Đã xóa hóa đơn"})


@pos_bp.route("/order", methods=["POST"])
@require_role(*SALES_ROLES)
def add_order():
    data = request.get_json(silent=True) or {}
    mahd, mamon = data.get("MaHD"), data.get("MaMon")
    if not mahd or not mamon:
        return jsonify({"error": "Thiếu MaHD hoặc MaMon"}), 400
    mon = query_one("SELECT DonGia FROM MONAN WHERE MaMon=%s", (mamon,))
    if not mon:
        return jsonify({"error": "Không tìm thấy món"}), 404
    execute(
        "INSERT INTO CHITIET_HD (MaHD, MaMon, SoLuong, DonGiaLucBan, TrangThaiMon, ThoiGianGoi) "
        "VALUES (%s, %s, 1, %s, 'Chờ chế biến', NOW()) "
        "ON DUPLICATE KEY UPDATE SoLuong = SoLuong + 1, "
        "TrangThaiMon='Chờ chế biến', ThoiGianGoi=NOW()",
        (mahd, mamon, mon["DonGia"]),
    )
    return jsonify({"message": "Đã thêm món"})


@pos_bp.route("/order/decrease", methods=["POST"])
@require_role(*SALES_ROLES)
def decrease_order():
    data = request.get_json(silent=True) or {}
    mahd, mamon = data.get("MaHD"), data.get("MaMon")
    if not mahd or not mamon:
        return jsonify({"error": "Thiếu MaHD hoặc MaMon"}), 400
    row = query_one(
        "SELECT SoLuong FROM CHITIET_HD WHERE MaHD=%s AND MaMon=%s", (mahd, mamon)
    )
    if not row:
        return jsonify({"error": "Món không có trong hóa đơn"}), 404
    if row["SoLuong"] <= 1:
        execute("DELETE FROM CHITIET_HD WHERE MaHD=%s AND MaMon=%s", (mahd, mamon))
    else:
        execute(
            "UPDATE CHITIET_HD SET SoLuong = SoLuong - 1 WHERE MaHD=%s AND MaMon=%s",
            (mahd, mamon),
        )
    return jsonify({"message": "Đã giảm số lượng"})


# ---------------------------------------------------------------- Tách hóa đơn (Phase 4)
@pos_bp.route("/invoice/split", methods=["POST"])
@require_role(*SALES_ROLES)
def split_invoice():
    """Tách một số món (kèm số lượng) sang một hóa đơn mới trên cùng bàn."""
    data = request.get_json(silent=True) or {}
    mahd = data.get("MaHD")
    items = data.get("Items") or []  # [{MaMon, SoLuong}]
    src = query_one("SELECT MaBan, TrangThaiHD FROM HOADON WHERE MaHD=%s", (mahd,))
    if not src:
        return jsonify({"error": "Không tìm thấy hóa đơn nguồn"}), 404
    if src["TrangThaiHD"] == "Đã thanh toán":
        return jsonify({"error": "Hóa đơn đã thanh toán"}), 409
    if not items:
        return jsonify({"error": "Chưa chọn món để tách"}), 400

    new_hd = execute(
        "INSERT INTO HOADON (MaBan, MaNV, TrangThaiHD) VALUES (%s, %s, 'Chưa thanh toán')",
        (src["MaBan"], _current_manv()),
    )
    for it in items:
        mamon = it.get("MaMon")
        qty = int(it.get("SoLuong", 0) or 0)
        if qty <= 0:
            continue
        line = query_one(
            "SELECT SoLuong, DonGiaLucBan, TrangThaiMon, ThoiGianGoi "
            "FROM CHITIET_HD WHERE MaHD=%s AND MaMon=%s",
            (mahd, mamon),
        )
        if not line:
            continue
        move_qty = min(qty, line["SoLuong"])
        # Thêm vào hóa đơn mới (giữ giá lúc bán & trạng thái chế biến)
        execute(
            "INSERT INTO CHITIET_HD (MaHD, MaMon, SoLuong, DonGiaLucBan, TrangThaiMon, ThoiGianGoi) "
            "VALUES (%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE SoLuong = SoLuong + %s",
            (new_hd, mamon, move_qty, line["DonGiaLucBan"], line["TrangThaiMon"],
             line["ThoiGianGoi"], move_qty),
        )
        # Trừ ở hóa đơn nguồn
        if move_qty >= line["SoLuong"]:
            execute("DELETE FROM CHITIET_HD WHERE MaHD=%s AND MaMon=%s", (mahd, mamon))
        else:
            execute(
                "UPDATE CHITIET_HD SET SoLuong = SoLuong - %s WHERE MaHD=%s AND MaMon=%s",
                (move_qty, mahd, mamon),
            )
    return jsonify({"message": "Tách hóa đơn thành công", "MaHD": new_hd}), 201


# ---------------------------------------------------------------- Thanh toán
@pos_bp.route("/checkout/<int:mahd>", methods=["POST"])
@require_role(*CASHIER_ROLES)
def checkout(mahd):
    data = request.get_json(silent=True) or {}
    pttt = data.get("PhuongThucTT", "Tiền mặt")
    chiet_khau = float(data.get("ChietKhau", 0) or 0)   # phần trăm
    thue_vat = float(data.get("ThueVAT", 0) or 0)       # phần trăm

    inv = query_one("SELECT TrangThaiHD FROM HOADON WHERE MaHD=%s", (mahd,))
    if not inv:
        return jsonify({"error": "Không tìm thấy hóa đơn"}), 404
    if inv["TrangThaiHD"] == "Đã thanh toán":
        return jsonify({"error": "Hóa đơn đã được thanh toán"}), 409

    # Trigger trg_DonBan_SauThanhToan tự set ThoiGianDong và dọn bàn nếu hết đơn
    execute(
        "UPDATE HOADON SET TrangThaiHD='Đã thanh toán', PhuongThucTT=%s, "
        "ChietKhau=%s, ThueVAT=%s WHERE MaHD=%s",
        (pttt, chiet_khau, thue_vat, mahd),
    )

    return jsonify({"message": "Thanh toán thành công"})

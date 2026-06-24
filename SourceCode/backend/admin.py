"""Phase 3 - Quản lý Thực đơn & Danh mục (chỉ Quản lý)."""
from flask import Blueprint, request, jsonify

from auth import require_role
from db import query, query_one, execute

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


# ---------------------------------------------------------------- Danh mục
@admin_bp.route("/categories", methods=["POST"])
@require_role()
def create_category():
    d = request.get_json(silent=True) or {}
    madm, tendm = d.get("MaDM"), d.get("TenDM")
    if not madm or not tendm:
        return jsonify({"error": "Thiếu MaDM hoặc TenDM"}), 400
    if query_one("SELECT 1 FROM DANHMUC WHERE MaDM=%s", (madm,)):
        return jsonify({"error": "Mã danh mục đã tồn tại"}), 409
    execute("INSERT INTO DANHMUC (MaDM, TenDM) VALUES (%s,%s)", (madm, tendm))
    return jsonify({"message": "Đã thêm danh mục"}), 201


@admin_bp.route("/categories/<madm>", methods=["PUT"])
@require_role()
def update_category(madm):
    d = request.get_json(silent=True) or {}
    if not query_one("SELECT 1 FROM DANHMUC WHERE MaDM=%s", (madm,)):
        return jsonify({"error": "Không tìm thấy danh mục"}), 404
    execute("UPDATE DANHMUC SET TenDM=%s WHERE MaDM=%s", (d.get("TenDM"), madm))
    return jsonify({"message": "Đã cập nhật danh mục"})


@admin_bp.route("/categories/<madm>", methods=["DELETE"])
@require_role()
def delete_category(madm):
    if query_one("SELECT 1 FROM MONAN WHERE MaDM=%s", (madm,)):
        return jsonify({"error": "Danh mục còn món ăn, không thể xóa"}), 409
    execute("DELETE FROM DANHMUC WHERE MaDM=%s", (madm,))
    return jsonify({"message": "Đã xóa danh mục"})


# ---------------------------------------------------------------- Món ăn
@admin_bp.route("/menu", methods=["GET"])
@require_role("Phục vụ", "Thu ngân", "Bếp")  # mọi vai trò xem được; chỉ Quản lý sửa
def list_menu_all():
    """Toàn bộ món (kể cả ngừng bán) cho trang quản lý."""
    return jsonify(
        query(
            "SELECT M.MaMon, M.TenMon, M.DonGia, M.TrangThai, M.MaDM, D.TenDM "
            "FROM MONAN M LEFT JOIN DANHMUC D ON M.MaDM=D.MaDM ORDER BY M.MaMon"
        )
    )


@admin_bp.route("/menu", methods=["POST"])
@require_role()
def create_menu():
    d = request.get_json(silent=True) or {}
    mamon, tenmon = d.get("MaMon"), d.get("TenMon")
    if not mamon or not tenmon:
        return jsonify({"error": "Thiếu MaMon hoặc TenMon"}), 400
    if query_one("SELECT 1 FROM MONAN WHERE MaMon=%s", (mamon,)):
        return jsonify({"error": "Mã món đã tồn tại"}), 409
    execute(
        "INSERT INTO MONAN (MaMon, TenMon, DonGia, TrangThai, MaDM) VALUES (%s,%s,%s,%s,%s)",
        (mamon, tenmon, int(d.get("DonGia", 0) or 0), d.get("TrangThai", "Còn hàng"), d.get("MaDM")),
    )
    return jsonify({"message": "Đã thêm món"}), 201


@admin_bp.route("/menu/<mamon>", methods=["PUT"])
@require_role()
def update_menu(mamon):
    d = request.get_json(silent=True) or {}
    if not query_one("SELECT 1 FROM MONAN WHERE MaMon=%s", (mamon,)):
        return jsonify({"error": "Không tìm thấy món"}), 404
    execute(
        "UPDATE MONAN SET TenMon=%s, DonGia=%s, TrangThai=%s, MaDM=%s WHERE MaMon=%s",
        (d.get("TenMon"), int(d.get("DonGia", 0) or 0), d.get("TrangThai", "Còn hàng"),
         d.get("MaDM"), mamon),
    )
    return jsonify({"message": "Đã cập nhật món"})


@admin_bp.route("/menu/<mamon>", methods=["DELETE"])
@require_role()
def delete_menu(mamon):
    if query_one("SELECT 1 FROM CHITIET_HD WHERE MaMon=%s", (mamon,)):
        # Đã từng được bán -> chỉ ngừng bán để không vỡ dữ liệu hóa đơn cũ
        execute("UPDATE MONAN SET TrangThai='Ngừng bán' WHERE MaMon=%s", (mamon,))
        return jsonify({"message": "Món đã phát sinh hóa đơn, đã chuyển sang 'Ngừng bán'"})
    execute("DELETE FROM MONAN WHERE MaMon=%s", (mamon,))
    return jsonify({"message": "Đã xóa món"})

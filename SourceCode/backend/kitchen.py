"""Phase 2 - Màn hình Bếp: hàng đợi món theo thứ tự thời gian (FIFO)."""
from flask import Blueprint, request, jsonify

from auth import require_role
from db import query, query_one, execute

kitchen_bp = Blueprint("kitchen", __name__, url_prefix="/api/kitchen")

# Bếp + nhân viên bán hàng đều xem & xác nhận món được (Quản lý luôn được phép)
KITCHEN_ROLES = ("Bếp", "Phục vụ", "Thu ngân")
VALID_STATUS = ("Chờ chế biến", "Đang chế biến", "Xong")


@kitchen_bp.route("/queue", methods=["GET"])
@require_role(*KITCHEN_ROLES)
def queue():
    """Danh sách món của các hóa đơn CHƯA thanh toán (sắp xếp FIFO).

    Trả kèm Loại (danh mục) và trạng thái thanh toán của hóa đơn để hiển thị
    đầy đủ trong màn hình bếp. Khi hóa đơn được thanh toán, món sẽ rời danh sách
    này (chuyển sang phần báo cáo)."""
    rows = query(
        "SELECT CT.MaHD, CT.MaMon, M.TenMon, DM.TenDM AS Loai, CT.SoLuong, "
        "CT.TrangThaiMon, CT.ThoiGianGoi, H.MaBan, B.TenBan, H.TrangThaiHD "
        "FROM CHITIET_HD CT "
        "JOIN HOADON H ON CT.MaHD = H.MaHD "
        "JOIN MONAN M ON CT.MaMon = M.MaMon "
        "LEFT JOIN DANHMUC DM ON M.MaDM = DM.MaDM "
        "JOIN BAN B ON H.MaBan = B.MaBan "
        "WHERE H.TrangThaiHD='Chưa thanh toán' "
        "ORDER BY CT.ThoiGianGoi ASC"
    )
    return jsonify(rows)


@kitchen_bp.route("/update_status", methods=["POST"])
@require_role(*KITCHEN_ROLES)
def update_status():
    data = request.get_json(silent=True) or {}
    mahd, mamon, trang_thai = data.get("MaHD"), data.get("MaMon"), data.get("TrangThaiMon")
    if not mahd or not mamon or trang_thai not in VALID_STATUS:
        return jsonify({"error": "Dữ liệu không hợp lệ"}), 400
    if not query_one(
        "SELECT 1 FROM CHITIET_HD WHERE MaHD=%s AND MaMon=%s", (mahd, mamon)
    ):
        return jsonify({"error": "Không tìm thấy món trong hóa đơn"}), 404
    execute(
        "UPDATE CHITIET_HD SET TrangThaiMon=%s WHERE MaHD=%s AND MaMon=%s",
        (trang_thai, mahd, mamon),
    )
    return jsonify({"message": "Đã cập nhật trạng thái món"})

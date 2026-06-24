"""Sổ Thu/Chi - kiểm soát tiền thu thêm hoặc chi ngoài trong ngày.

Dùng bảng THUCHI(MaPhieu, LoaiPhieu, SoTien, LyDo, ThoiGian, NguoiLap).
Cho phép Thu ngân + Phục vụ (và Quản lý) tạo/xem phiếu.

Endpoints:
  GET  /api/thuchi   -> { items: [...], TongThu, TongChi }
  POST /api/thuchi   -> tạo phiếu { LoaiPhieu: 'Thu'|'Chi', SoTien, LyDo }
"""
from flask import Blueprint, request, jsonify, g

from auth import require_role
from db import query, query_one, execute

thuchi_bp = Blueprint("thuchi", __name__, url_prefix="/api/thuchi")

# Nhân viên bán hàng đều dùng được (Quản lý luôn được phép - xem require_role)
LEDGER_ROLES = ("Thu ngân", "Phục vụ")


def _current_manv():
    user = getattr(g, "current_user", None)
    return user.get("MaNV") if user else None


@thuchi_bp.route("", methods=["GET"])
@require_role(*LEDGER_ROLES)
def list_thuchi():
    """Danh sách phiếu thu/chi kèm tên người lập và tổng thu/tổng chi."""
    rows = query(
        """SELECT TC.MaPhieu, TC.LoaiPhieu, TC.SoTien, TC.LyDo, TC.ThoiGian,
                  TC.NguoiLap, NV.TenNV
           FROM THUCHI TC
           LEFT JOIN NHANVIEN NV ON TC.NguoiLap = NV.MaNV
           ORDER BY TC.ThoiGian DESC, TC.MaPhieu DESC"""
    )
    tong_thu = sum((r["SoTien"] or 0) for r in rows if r["LoaiPhieu"] == "Thu")
    tong_chi = sum((r["SoTien"] or 0) for r in rows if r["LoaiPhieu"] == "Chi")
    return jsonify({"items": rows, "TongThu": tong_thu, "TongChi": tong_chi})


@thuchi_bp.route("", methods=["POST"])
@require_role(*LEDGER_ROLES)
def create_thuchi():
    """Tạo phiếu thu/chi. NguoiLap lấy từ token."""
    d = request.get_json(silent=True) or {}
    loai = (d.get("LoaiPhieu") or "").strip()
    lydo = (d.get("LyDo") or "").strip()
    try:
        sotien = int(d.get("SoTien") or 0)
    except (ValueError, TypeError):
        return jsonify({"error": "Số tiền không hợp lệ"}), 400

    if loai not in ("Thu", "Chi"):
        return jsonify({"error": "Loại phiếu phải là 'Thu' hoặc 'Chi'"}), 400
    if sotien <= 0:
        return jsonify({"error": "Số tiền phải lớn hơn 0"}), 400

    maphieu = execute(
        "INSERT INTO THUCHI (LoaiPhieu, SoTien, LyDo, NguoiLap) VALUES (%s,%s,%s,%s)",
        (loai, sotien, lydo, _current_manv()),
    )
    return jsonify({"message": "Tạo phiếu thành công", "MaPhieu": maphieu}), 201


@thuchi_bp.route("/<int:maphieu>", methods=["DELETE"])
@require_role()  # Chỉ Quản lý được xóa phiếu
def delete_thuchi(maphieu):
    if not query_one("SELECT 1 FROM THUCHI WHERE MaPhieu=%s", (maphieu,)):
        return jsonify({"error": "Không tìm thấy phiếu"}), 404
    execute("DELETE FROM THUCHI WHERE MaPhieu=%s", (maphieu,))
    return jsonify({"message": "Đã xóa phiếu"})

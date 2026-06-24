"""Quản lý Nhân viên & Tài khoản - chỉ dành cho Quản lý.

Endpoints:
  GET    /api/staff           - Danh sách nhân viên + tài khoản
  POST   /api/staff           - Thêm nhân viên + tạo tài khoản
  PUT    /api/staff/<manv>    - Sửa thông tin nhân viên
  DELETE /api/staff/<manv>    - Xóa nhân viên + tài khoản
  PUT    /api/staff/<manv>/password - Đổi mật khẩu tài khoản
"""
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash

from auth import require_role
from db import query, query_one, execute

staff_bp = Blueprint("staff", __name__, url_prefix="/api/staff")

VALID_ROLES = ("Quản lý", "Thu ngân", "Phục vụ", "Bếp")


@staff_bp.route("", methods=["GET"])
@require_role("Phục vụ", "Thu ngân", "Bếp")  # mọi vai trò xem được; chỉ Quản lý sửa
def list_staff():
    """Danh sách nhân viên kèm tên đăng nhập."""
    rows = query(
        """SELECT NV.MaNV, NV.TenNV, NV.VaiTro, NV.MucLuong,
                  TK.TenDangNhap
           FROM NHANVIEN NV
           LEFT JOIN TAIKHOAN TK ON NV.MaNV = TK.MaNV
           ORDER BY NV.MaNV"""
    )
    return jsonify(rows)


@staff_bp.route("", methods=["POST"])
@require_role()
def create_staff():
    """Tạo nhân viên + tài khoản cùng lúc."""
    d = request.get_json(silent=True) or {}
    manv = d.get("MaNV", "").strip()
    tennv = d.get("TenNV", "").strip()
    vaitro = d.get("VaiTro", "").strip()
    tendangnhap = d.get("TenDangNhap", "").strip()
    matkhau = d.get("MatKhau", "").strip()
    muluong = int(d.get("MucLuong", 5000000) or 5000000)

    # Validate
    if not manv or not tennv or not vaitro:
        return jsonify({"error": "Thiếu MaNV, TenNV hoặc VaiTro"}), 400
    if vaitro not in VALID_ROLES:
        return jsonify({"error": f"VaiTro không hợp lệ. Chọn: {', '.join(VALID_ROLES)}"}), 400
    if not tendangnhap or not matkhau:
        return jsonify({"error": "Thiếu TenDangNhap hoặc MatKhau"}), 400
    if len(matkhau) < 6:
        return jsonify({"error": "Mật khẩu phải có ít nhất 6 ký tự"}), 400

    if query_one("SELECT 1 FROM NHANVIEN WHERE MaNV=%s", (manv,)):
        return jsonify({"error": "Mã nhân viên đã tồn tại"}), 409
    if query_one("SELECT 1 FROM TAIKHOAN WHERE TenDangNhap=%s", (tendangnhap,)):
        return jsonify({"error": "Tên đăng nhập đã tồn tại"}), 409

    execute(
        "INSERT INTO NHANVIEN (MaNV, TenNV, VaiTro, MucLuong) VALUES (%s,%s,%s,%s)",
        (manv, tennv, vaitro, muluong),
    )
    execute(
        "INSERT INTO TAIKHOAN (TenDangNhap, MatKhau, MaNV) VALUES (%s,%s,%s)",
        (tendangnhap, generate_password_hash(matkhau), manv),
    )
    return jsonify({"message": "Tạo nhân viên thành công", "MaNV": manv}), 201


@staff_bp.route("/<manv>", methods=["PUT"])
@require_role()
def update_staff(manv):
    """Sửa thông tin nhân viên (không đổi mật khẩu ở đây)."""
    d = request.get_json(silent=True) or {}
    if not query_one("SELECT 1 FROM NHANVIEN WHERE MaNV=%s", (manv,)):
        return jsonify({"error": "Không tìm thấy nhân viên"}), 404

    tennv = d.get("TenNV")
    vaitro = d.get("VaiTro")
    muluong = d.get("MucLuong")

    if vaitro and vaitro not in VALID_ROLES:
        return jsonify({"error": f"VaiTro không hợp lệ"}), 400

    execute(
        "UPDATE NHANVIEN SET TenNV=%s, VaiTro=%s, MucLuong=%s WHERE MaNV=%s",
        (tennv, vaitro, int(muluong or 5000000), manv),
    )
    return jsonify({"message": "Cập nhật thành công"})


@staff_bp.route("/<manv>", methods=["DELETE"])
@require_role()
def delete_staff(manv):
    """Xóa tài khoản + nhân viên (chỉ khi chưa có hóa đơn liên quan)."""
    if not query_one("SELECT 1 FROM NHANVIEN WHERE MaNV=%s", (manv,)):
        return jsonify({"error": "Không tìm thấy nhân viên"}), 404
    if query_one("SELECT 1 FROM HOADON WHERE MaNV=%s", (manv,)):
        return jsonify({"error": "Nhân viên đã có hóa đơn, không thể xóa. Hãy vô hiệu hóa thay thế."}), 409

    execute("DELETE FROM TAIKHOAN WHERE MaNV=%s", (manv,))
    execute("DELETE FROM NHANVIEN WHERE MaNV=%s", (manv,))
    return jsonify({"message": "Đã xóa nhân viên"})


@staff_bp.route("/<manv>/password", methods=["PUT"])
@require_role()
def change_password(manv):
    """Quản lý đặt lại mật khẩu cho nhân viên."""
    d = request.get_json(silent=True) or {}
    new_pw = d.get("MatKhau", "").strip()
    if len(new_pw) < 6:
        return jsonify({"error": "Mật khẩu phải có ít nhất 6 ký tự"}), 400
    if not query_one("SELECT 1 FROM TAIKHOAN WHERE MaNV=%s", (manv,)):
        return jsonify({"error": "Không tìm thấy tài khoản"}), 404
    execute(
        "UPDATE TAIKHOAN SET MatKhau=%s WHERE MaNV=%s",
        (generate_password_hash(new_pw), manv),
    )
    return jsonify({"message": "Đã đổi mật khẩu thành công"})

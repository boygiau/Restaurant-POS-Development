"""Phase 1 - Xác thực & Phân quyền (RBAC).

Tái sử dụng bảng có sẵn:
  - TAIKHOAN(TenDangNhap, MatKhau, MaNV)  -> MatKhau lưu hash Werkzeug
  - NHANVIEN(MaNV, TenNV, VaiTro, ...)    -> VaiTro là vai trò phân quyền

4 vai trò: 'Quản lý', 'Thu ngân', 'Phục vụ', 'Bếp'.
"""
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash

from config import Config
from db import query_one

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def create_token(payload):
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXP_HOURS)
    return jwt.encode(data, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)


def decode_token(token):
    return jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])


def _extract_token():
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:].strip()
    return None


def require_auth(fn):
    """Yêu cầu token hợp lệ. Gắn thông tin người dùng vào flask.g.current_user."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Thiếu token xác thực"}), 401
        try:
            g.current_user = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Phiên đăng nhập đã hết hạn"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token không hợp lệ"}), 401
        return fn(*args, **kwargs)

    return wrapper


def require_role(*roles):
    """Yêu cầu người dùng đăng nhập VÀ có một trong các vai trò chỉ định.
    'Quản lý' luôn được phép (toàn quyền)."""

    def decorator(fn):
        @wraps(fn)
        @require_auth
        def wrapper(*args, **kwargs):
            vai_tro = g.current_user.get("VaiTro")
            if vai_tro != "Quản lý" and vai_tro not in roles:
                return jsonify({"error": "Bạn không có quyền truy cập chức năng này"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("TenDangNhap") or "").strip()
    password = data.get("MatKhau") or ""
    if not username or not password:
        return jsonify({"error": "Vui lòng nhập tên đăng nhập và mật khẩu"}), 400

    row = query_one(
        """SELECT TK.TenDangNhap, TK.MatKhau, NV.MaNV, NV.TenNV, NV.VaiTro
           FROM TAIKHOAN TK JOIN NHANVIEN NV ON TK.MaNV = NV.MaNV
           WHERE TK.TenDangNhap = %s""",
        (username,),
    )
    if not row or not check_password_hash(row["MatKhau"], password):
        return jsonify({"error": "Sai tên đăng nhập hoặc mật khẩu"}), 401

    token = create_token(
        {"TenDangNhap": row["TenDangNhap"], "MaNV": row["MaNV"], "VaiTro": row["VaiTro"]}
    )
    return jsonify(
        {
            "token": token,
            "user": {
                "TenDangNhap": row["TenDangNhap"],
                "MaNV": row["MaNV"],
                "TenNV": row["TenNV"],
                "VaiTro": row["VaiTro"],
            },
        }
    )


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    return jsonify(g.current_user)

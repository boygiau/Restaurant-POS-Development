"""Lớp truy cập MySQL dùng mysql-connector-python.

Mở kết nối theo từng request (lưu trong flask.g) và đóng khi request kết thúc.
Cung cấp các helper: query (SELECT nhiều dòng), query_one (1 dòng), execute (INSERT/UPDATE/DELETE),
callproc (gọi stored procedure).
"""
import mysql.connector
from flask import g
from config import Config


def get_conn():
    """Lấy kết nối MySQL cho request hiện tại (tạo mới nếu chưa có)."""
    if "db_conn" not in g:
        g.db_conn = mysql.connector.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset="utf8mb4",
            autocommit=False,
        )
    return g.db_conn


def close_conn(_exc=None):
    conn = g.pop("db_conn", None)
    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass


def query(sql, params=None):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    cur.close()
    return rows


def query_one(sql, params=None):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    cur.execute(sql, params or ())
    row = cur.fetchone()
    cur.close()
    return row


def execute(sql, params=None):
    """Chạy lệnh ghi, commit, trả về lastrowid (hữu ích cho AUTO_INCREMENT)."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(sql, params or ())
    last_id = cur.lastrowid
    cur.close()
    conn.commit()
    return last_id


def callproc(proc_name, args=()):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    cur.callproc(proc_name, args)
    rows = cur.fetchall()
    cur.close()
    conn.commit()
    return rows


def init_app(app):
    app.teardown_appcontext(close_conn)

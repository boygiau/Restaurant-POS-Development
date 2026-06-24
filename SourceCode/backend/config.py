"""Cấu hình ứng dụng. Đọc từ biến môi trường, mặc định phù hợp MySQL Workbench (root/root)."""
import os


class Config:
    # --- MySQL ---
    DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.environ.get("DB_PORT", "3306"))
    DB_USER = os.environ.get("DB_USER", "root")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "zxcvbnm123")
    DB_NAME = os.environ.get("DB_NAME", "ShiftPOS")

    # --- JWT ---
    JWT_SECRET = os.environ.get("JWT_SECRET", "shiftpos-dev-secret-change-me")
    JWT_ALGORITHM = "HS256"
    JWT_EXP_HOURS = int(os.environ.get("JWT_EXP_HOURS", "12"))

    # --- Server ---
    HOST = os.environ.get("FLASK_HOST", "127.0.0.1")
    PORT = int(os.environ.get("FLASK_PORT", "5000"))
    DEBUG = os.environ.get("FLASK_DEBUG", "1") == "1"

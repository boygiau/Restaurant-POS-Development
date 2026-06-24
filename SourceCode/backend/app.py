"""Điểm khởi chạy backend Flask cho hệ thống Restaurant POS (ShiftPOS).

Chạy:  python app.py   (mặc định http://127.0.0.1:5000)
Cấu hình DB/JWT qua biến môi trường — xem config.py.
"""
from flask import Flask, jsonify
from flask_cors import CORS

import db
from config import Config
from auth import auth_bp
from pos import pos_bp
from kitchen import kitchen_bp
from admin import admin_bp
from reports import reports_bp
from staff import staff_bp
from thuchi import thuchi_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)            # cho phép frontend (Vite dev server) gọi API
    db.init_app(app)     # đóng kết nối MySQL khi kết thúc request

    app.register_blueprint(auth_bp)
    app.register_blueprint(pos_bp)
    app.register_blueprint(kitchen_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(staff_bp)
    app.register_blueprint(thuchi_bp)

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(400)
    def bad_request(_e):
        return jsonify({"error": "Yêu cầu không hợp lệ"}), 400

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": "Không tìm thấy"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return jsonify({"error": "Phương thức không được phép"}), 405

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify({"error": "Lỗi máy chủ nội bộ"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)

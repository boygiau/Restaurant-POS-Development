# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Foody" (DB name `ShiftPOS`) is a Vietnamese-language Restaurant POS system: a **React 19 + Vite** SPA frontend, a **Python Flask** REST backend with JWT auth, and a **MySQL** database. The UI, code comments, and all database field/value names are Vietnamese — keep new strings Vietnamese to match.

## Architecture

```
SourceCode/
├── frontend/                      # React 19 + Vite SPA
│   └── src/
│       ├── main.jsx               # Entry: react-router-dom, /login vs ProtectedRoute → App
│       ├── App.jsx                # Main shell: POS + REPORT tabs, all sales modals/state
│       ├── AuthContext.jsx        # user/login/logout/hasRole, persists token+user in localStorage
│       ├── api.js                 # shared axios instance: attaches JWT, auto-logout on 401
│       └── components/
│           ├── Login.jsx
│           ├── KitchenQueue.jsx   # "Dịch vụ đang chờ" — list of dishes + done/payment status
│           ├── ThuChi.jsx         # income/expense ledger (sales roles)
│           ├── Invoices.jsx       # "Hóa đơn" — paid invoices list + filters (sales roles)
│           └── Admin/
│               ├── MenuManager.jsx    # "Sản phẩm dịch vụ" — menu grid + modal & category CRUD (Quản lý)
│               └── StaffManager.jsx   # employee + account CRUD (Quản lý)
├── backend/                       # Flask API (app factory + blueprints)
│   ├── app.py                     # create_app(): registers blueprints, CORS, /api/health
│   ├── config.py                  # DB/JWT/server config from env (defaults root/zxcvbnm123, ShiftPOS)
│   ├── db.py                      # mysql-connector-python connection-per-request (flask.g) + query/execute/callproc helpers
│   ├── database.py                # ⚠️ legacy/unused alt connection helper (hardcoded creds, lowercase `shiftpos`) — prefer db.py
│   ├── init_db.py                 # Python bootstrap: runs KhoiTao.sql + resets admin password (alt to Workbench)
│   ├── auth.py                    # JWT login/me, require_auth, require_role(*roles)
│   ├── pos.py                     # areas/tables/menu/invoices/order/checkout/move_merge/split
│   ├── kitchen.py                 # kitchen queue (dishes of unpaid invoices) + mark done
│   ├── admin.py                   # menu & category CRUD
│   ├── staff.py                   # employee + account CRUD (Quản lý)
│   ├── thuchi.py                  # income/expense ledger (sales roles)
│   ├── reports.py                 # revenue / employee / monthly / overview (peak-hour, best-sellers)
│   ├── requirements.txt           # Flask, Flask-Cors, PyJWT, Werkzeug, mysql-connector-python
│   └── venv/                      # Python virtual environment
├── Database/                      # MySQL scripts (run in MySQL Workbench)
│   ├── KhoiTao.sql                # Schema + seed (CREATE DATABASE ShiftPOS, tables, menu, accounts)
│   ├── ChucNang.sql               # Functions, procedures, triggers, views
│   └── Test_Demo.sql              # Demo/sample data for manual testing
├── Plan/implementation_plan.md    # Phased build plan
└── HUONG_DAN_CHAY.md              # Vietnamese setup/run + manual test walkthrough
```

> The legacy `Database/*.db` files were MySQL DDL despite the extension; they have been replaced by `*.sql`. The `.sql` versions also fixed the `ShiftPOS` vs `shiftpos` case mismatch that broke on case-sensitive (Linux) MySQL.

### Frontend Libraries

| Library | Usage |
|---------|-------|
| `react-icons/fi` | Feather icons — used throughout; add new icons from this set, not another library |
| `recharts` | `BarChart` / `Bar` / `XAxis` etc. — reports dashboard in `App.jsx` |
| `react-to-print` | Receipt printing via `useReactToPrint({ contentRef: receiptRef })` in `App.jsx` |
| `axios` | HTTP client — imported only via `api.js`; never import axios directly elsewhere |

### Request flow

Frontend → `api.js` axios instance (`baseURL http://127.0.0.1:5000`, injects `Bearer <token>`) → Flask blueprint route guarded by `require_role(...)` → `db.py` helper → MySQL. On any `401`, `api.js` clears localStorage and redirects to `/login`.

### Auth & RBAC

- Login `POST /api/auth/login` returns `{ token, user }`; the JWT payload carries `TenDangNhap`, `MaNV`, `VaiTro` (12h expiry).
- Backend gating: `require_role(*roles)` in [auth.py](SourceCode/backend/auth.py). **`require_role()` with no args = `Quản lý` only**; `Quản lý` always passes every guard.
- Frontend gating: `ProtectedRoute` in [main.jsx](SourceCode/frontend/src/main.jsx) blocks unauthenticated users; tab/feature visibility uses `hasRole(...)` from [AuthContext.jsx](SourceCode/frontend/src/AuthContext.jsx) (also treats `Quản lý` as all-access). `App.jsx` tab list is gated per role (e.g. `STAFF` "Nhân viên" tab is `hasRole()` = Quản lý only); the `Bếp` role defaults to the `KITCHEN` tab.
- 4 roles: `Quản lý` (full), `Thu ngân` (cashier), `Phục vụ` (waiter), `Bếp` (kitchen). Sales ops use `SALES_ROLES` (Phục vụ + Thu ngân); table/area mutation + checkout use `CASHIER_ROLES` (Thu ngân).

Seeded accounts (hashed in `KhoiTao.sql`): `admin/admin123` (Quản lý), `thungan/123456` (Thu ngân), `phucvu/123456` (Phục vụ), `bep/123456` (Bếp). **Note:** `init_db.py` overrides the admin password to `zxcvbnm123` if you bootstrap via that script instead of running the SQL as-is.

## Development Commands

### Database — run **KhoiTao.sql first, then ChucNang.sql** in MySQL Workbench
Alternatively, bootstrap from Python: `cd SourceCode\backend && .\venv\Scripts\python init_db.py` (runs `KhoiTao.sql` statement-by-statement and resets the admin password — does *not* run `ChucNang.sql`, so add functions/procedures/triggers separately).

### Backend (Flask)
```powershell
cd SourceCode\backend
.\venv\Scripts\Activate.ps1          # bash: source venv/bin/activate
pip install -r requirements.txt
python app.py                        # http://127.0.0.1:5000
```
Health check: `GET http://127.0.0.1:5000/api/health` → `{"status":"ok"}`.
Override config via env: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `JWT_SECRET`, `FLASK_HOST`, `FLASK_PORT`, `FLASK_DEBUG`.
Install a package into the venv: `.\venv\Scripts\pip install <package>`.

### Frontend (React + Vite)
```bash
cd SourceCode/frontend
npm install
npm run dev      # Vite dev server (default http://localhost:5173)
npm run build    # production build
npm run lint     # ESLint
npm run preview  # preview production build
```

There is **no automated test suite**. Verify changes manually using the walkthrough in [HUONG_DAN_CHAY.md](SourceCode/HUONG_DAN_CHAY.md) (waiter orders → kitchen prepares → cashier checks out → admin reports).

## API Endpoints

Blueprint prefixes: `pos.py` = `/api`, `auth.py` = `/api/auth`, `kitchen.py` = `/api/kitchen`, `admin.py` = `/api/admin`, `staff.py` = `/api/staff`, `thuchi.py` = `/api/thuchi`, `reports.py` = `/api/reports`. All except `/api/auth/login` and `/api/health` require a Bearer token.

| Method | Path | Role guard | Description |
|--------|------|-----------|-------------|
| POST | `/api/auth/login` | public | Login → `{token, user}` |
| GET | `/api/auth/me` | any auth | Current token payload |
| GET | `/api/areas` `/api/categories` `/api/menu` `/api/tables` | sales | Lookups (tables include provisional total) |
| POST | `/api/areas` `/api/tables` · PUT/DELETE `/api/tables/{maBan}` · PUT/DELETE `/api/areas/{maKV}` | Quản lý | Area/table create + rename/delete |
| GET | `/api/invoices/{maBan}` | sales | Open invoices for a table |
| GET | `/api/orders` | sales | Paid-invoice history (one row per invoice) for the Hóa đơn screen |
| POST | `/api/invoice/create/{maBan}` | sales | Create invoice |
| DELETE | `/api/invoices/{maHd}` | sales | Delete invoice |
| POST | `/api/order` · `/api/order/decrease` | sales | Add / decrease item `{MaHD, MaMon}` |
| POST | `/api/tables/move_merge` | sales | Move/merge invoice `{MaHD, BanCu, BanMoi}` |
| POST | `/api/invoice/split` | sales | Split items to new invoice `{MaHD, Items:[{MaMon,SoLuong}]}` |
| POST | `/api/checkout/{maHd}` | cashier | Checkout `{PhuongThucTT, ChietKhau, ThueVAT}` (last two are %) |
| GET | `/api/kitchen/queue` · POST `/api/kitchen/update_status` | Bếp | Dishes of unpaid invoices; set `TrangThaiMon` (`Chờ chế biến`/`Đang chế biến`/`Xong`) |
| GET/POST/PUT/DELETE | `/api/admin/menu[...]` · `/api/admin/categories[...]` | Quản lý | Menu & category CRUD |
| GET/POST/PUT/DELETE | `/api/staff[...]` · PUT `/api/staff/{maNV}/password` | Quản lý | Employee + account CRUD (creates `NHANVIEN`+`TAIKHOAN` together), reset password |
| GET/POST | `/api/thuchi` · DELETE `/api/thuchi/{maPhieu}` | sales (DELETE: Quản lý) | Income/expense ledger `{LoaiPhieu:'Thu'|'Chi', SoTien, LyDo}` |
| GET | `/api/reports/overview` `/api/reports/employee` | Quản lý | Dashboard (totals, peak-hour, best-sellers, payment methods) / per-employee |
| GET | `/api/reports/revenue` `/api/reports/monthly` | Quản lý | Revenue by payment method / monthly |

## Database

- DB objects (in `ChucNang.sql`): function `fn_TinhTienBan`; procedures `sp_ChuyenBan`, `sp_GopBan`; trigger `trg_DonBan_SauThanhToan` (on checkout sets `ThoiGianDong` and frees the table when no open invoices remain); views `vw_QuanLyViTri`, `vw_DoanhThuTheoNgay`, `vw_BaoCaoThuChi`.
- Core tables: `KHUVUC`, `BAN`, `DANHMUC`, `MONAN`, `NHANVIEN` (`VaiTro`, `MucLuong`), `TAIKHOAN` (`TenDangNhap`, `MatKhau VARCHAR(255)` Werkzeug hash, `MaNV`), `HOADON` (`TrangThaiHD`, `PhuongThucTT`, `ChietKhau`, `ThueVAT`, `ThoiGianMo`, `ThoiGianDong`), `CHITIET_HD` (`SoLuong`, `DonGiaLucBan`, `TrangThaiMon`, `ThoiGianGoi`), `THUCHI` (`LoaiPhieu`, `SoTien`, `LyDo`, `NguoiLap`).
- **Inventory/kho was removed** — no `NGUYENLIEU` / `KHO` / `DINHMUC_MONAN` tables.

### Vietnamese field/value reference

| Field | Meaning |
|-------|---------|
| `MaBan` / `TenBan` | Table ID / name |
| `MaKV` / `TenKV` | Area ID / name |
| `MaHD` | Invoice ID (Mã Hóa Đơn) |
| `MaMon` / `TenMon` | Menu item ID / name |
| `MaDM` / `TenDM` | Category ID / name |
| `MaNV` / `TenNV` / `VaiTro` | Employee ID / name / role |
| `DonGia` / `DonGiaLucBan` | Unit price / price captured at sale |
| `SoLuong` / `ThanhTien` / `TienTamTinh` | Quantity / line total / provisional table total |
| `ChietKhau` / `ThueVAT` | Discount % / VAT % (applied at checkout) |
| `TrangThai` (table) | `'Trống'` = empty, otherwise occupied |
| `TrangThaiHD` (invoice) | `'Chưa thanh toán'` / `'Đã thanh toán'` |
| `TrangThaiMon` (item) | `'Chờ chế biến'` / `'Đang chế biến'` / `'Xong'` |
| `PhuongThucTT` | `'Chuyển khoản'` = bank transfer, `'Tiền mặt'` = cash |

## Key Behaviors

- **UI color palette**: `App.jsx` exports a `W` constant — `primary` `#8B5E3C`, `light` `#F5EDE3`, `border` `#D4B89A`, `text` `#4A2C0A`, `subtext` `#8C6A4A`, `bg` `#FAF4EE`, `occupied` `#E8956D`. All inline styles in `App.jsx` use these; keep new UI consistent with them.
- **Client-generated IDs**: tables `"B" + Date.now().toString(36).toUpperCase()`; areas `"KV" + Date.now().toString(36).toUpperCase()`.
- **Checkout** sends `PhuongThucTT`, `ChietKhau` (%), `ThueVAT` (%). The DB trigger sets `ThoiGianDong` and frees the table. Paid invoices then surface in the Hóa đơn screen (`/api/orders`) and Báo cáo (`/api/reports/overview`).
- **Offline fallback mocks**: if a POST/DELETE fails with a network error, the frontend mutates local state so the UI still reflects the change (not persisted).
- QR payment uses `/public/QR.png` as a static placeholder image.
- `db.execute` commits and returns `lastrowid`; `db.callproc` invokes stored procedures. Connections are per-request and closed on teardown — do not cache them.

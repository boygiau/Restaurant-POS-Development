"""Script to initialize DB and set admin password."""
from werkzeug.security import generate_password_hash
import mysql.connector
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Connect without database first
conn = mysql.connector.connect(
    host='127.0.0.1', port=3306, user='root', password='zxcvbnm123', charset='utf8mb4'
)
conn.autocommit = True
cur = conn.cursor()

# Read SQL file
with open('../Database/KhoiTao.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Split statements
statements = [s.strip() for s in re.split(r';\s*\n', sql) if s.strip()]
ok = 0
for stmt in statements:
    try:
        cur.execute(stmt)
        ok += 1
    except Exception as e:
        print(f'  Skip: {e}')

print(f'Ran {ok} SQL statements OK')

# Update admin password -> zxcvbnm123
cur.execute('USE ShiftPOS')
h = generate_password_hash('zxcvbnm123')
cur.execute('UPDATE TAIKHOAN SET MatKhau=%s WHERE TenDangNhap=%s', (h, 'admin'))
print(f'  admin password set to: zxcvbnm123')

cur.execute('SELECT TenDangNhap, MaNV FROM TAIKHOAN')
rows = cur.fetchall()
print(f'Accounts ({len(rows)}):')
for row in rows:
    print(f'  {row}')

cur.close()
conn.close()
print('DONE!')

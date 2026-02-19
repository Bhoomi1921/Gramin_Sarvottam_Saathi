# Safe Return – Deployment & Integration Guide

## Directory Structure

```
project/
├── api.py              ← Flask app (production-ready)
├── wsgi.py             ← Gunicorn entry-point
├── requirements.txt
├── sheet.xlsx          ← Inmate data  (columns: "Inmate Id", "Name")
├── data/               ← Inmate photos  (001.jpg, 002.jpg …)
└── static/             ← Frontend assets (copy your HTML/JS/CSS here)
    ├── index.html
    ├── script.js       ← Updated version (real /recognize integration)
    └── style.css
```

---

## 1 · Install dependencies

```bash
pip install -r requirements.txt
```

> DeepFace will download model weights (~500 MB) on first run.

---

## 2 · Run in development

```bash
python api.py
# → http://localhost:5000
```

---

## 3 · Run with Gunicorn (production)

```bash
gunicorn wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --threads 2 \
  --worker-class gthread \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
```

> **Keep `--workers` at 1–2.**  
> DeepFace loads large TensorFlow models into RAM per worker. More workers = more RAM.

---

## 4 · Environment variables (optional overrides)

| Variable              | Default            | Description                        |
|-----------------------|--------------------|------------------------------------|
| `EXCEL_PATH`          | `./sheet.xlsx`     | Path to the inmate Excel file      |
| `DB_PATH`             | `./data`           | Folder of inmate reference photos  |
| `STATIC_DIR`          | `./static`         | Folder containing the frontend     |
| `CONFIDENCE_THRESHOLD`| `0.6`              | Min match score (0–1) to accept    |
| `ALLOWED_ORIGINS`     | `*`                | CORS allowed origins               |

Example:
```bash
export EXCEL_PATH=/opt/safe-return/sheet.xlsx
export DB_PATH=/opt/safe-return/data
gunicorn wsgi:application --bind 0.0.0.0:8000 ...
```

---

## 5 · Nginx reverse proxy (recommended)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 10M;   # allow large base64 images

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }
}
```

---

## 6 · Systemd service (auto-start on reboot)

```ini
# /etc/systemd/system/safe-return.service
[Unit]
Description=Safe Return API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/safe-return
EnvironmentFile=/opt/safe-return/.env
ExecStart=/usr/local/bin/gunicorn wsgi:application \
    --bind 0.0.0.0:8000 --workers 2 --threads 2 \
    --worker-class gthread --timeout 120
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable safe-return
sudo systemctl start safe-return
```

---

## 7 · Frontend integration (what changed in script.js)

The `runAdminRecog()` function now:

1. Opens a **camera/upload modal** instead of showing a fake random confidence.
2. Sends the captured image as base64 to `POST /recognize`.
3. Displays the real result (name, inmate ID, confidence %) from the backend.
4. Updates the admin table row to **Found / Missing** based on the API response.

To point the frontend at a different backend URL, edit this line at the top of `script.js`:
```js
const API_BASE = "";           // same origin (default)
// const API_BASE = "https://your-api.com";  // separate deployment
```

---

## 8 · Health check

```
GET /test
→ { "status": "ok", "excel_found": true, "db_found": true, ... }
```

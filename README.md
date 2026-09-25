# Gold Fx — AI Office

Gold & FX trading workspace (x-floma / BlueComp style).

## Stack
- **Frontend**: HTML + Tailwind + Lightweight Charts
- **Backend**: **Python Flask** (`server.py`)
  - Live market data (Binance + Yahoo)
  - Signal feed API
  - Static file server

## Quick start
```bash
pip install -r requirements.txt
python server.py
```

## Deploy
See **DEPLOY.md** (Render: gunicorn)

## Features
- Live Signals (post + take to journal)
- AI Chart (XAU / BTC / EUR)
- AI Analysis
- MT5 Copy UI
- Performance Journal
- Admin panel (`/admin.html`)

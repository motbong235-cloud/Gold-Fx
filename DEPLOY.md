# Gold Fx — Deploy with server.py

## Local
```bash
pip install -r requirements.txt
python server.py
```
Open http://localhost:3000

## Render Web Service
- Runtime: **Python 3**
- Build: `pip install -r requirements.txt`
- Start: `gunicorn -b 0.0.0.0:$PORT server:app`

## Flow
1. Splash → Login (X-FLOMA style)
2. Dashboard → Live Signals / AI Chart / AI Analysis / MT5
3. Admin: `/admin.html` or Post Signal button

API: `/api/health` `/api/candles` `/api/signals`

# Gold Fx — AI Office (Gold & FX)

## Features
- **Live Signals** — Post signals (Admin / Post button), users Take → Journal
- **AI Chart** — Live XAU / BTC / EUR via proxy
- **AI Analysis** — Bias & structure notes
- **MT5 · Copy** — Connect UI (bridge needs broker/VPS)
- Performance Journal, Learning Vault, Settings

## Signal Feed API
- `GET /api/signals` — list signals
- `POST /api/signals` — publish signal
- `PATCH /api/signals/:id` — update
- `DELETE /api/signals/:id` — delete

Admin UI: `/admin.html`  
Or use **Post Signal** on Dashboard.

## Deploy (Render Web Service)
```
Build: npm install
Start: npm start
```

## Local
```
npm install && npm start
```
Open http://localhost:3000

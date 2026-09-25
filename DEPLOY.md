# Gold Fx — Deploy on Render (with Real Market Data)

ឥឡូវនេះប្រើ **Web Service** (មាន Backend Proxy) ដើម្បីទាញ Gold / BTC / EUR ពិត 100%។

## របៀប Deploy

### 1. Upload ទៅ GitHub
- បង្កើត repo ថ្មី
- Upload ឯកសារទាំងអស់ក្នុង folder នេះ

### 2. បង្កើត Web Service នៅ Render
1. ចូល https://dashboard.render.com
2. New + → Web Service
3. Connect GitHub repo
4. កំណត់៖
   - Name: goldfx
   - Runtime: Node
   - Build Command: npm install
   - Start Command: npm start
   - Instance Type: Free
5. Create Web Service

រង់ចាំ 2–3 នាទី → បាន URL ដូច
https://goldfx.onrender.com

### 3. សាកល្បង
- បើក Website
- Sign In → Dashboard
- ប្តូរ Symbol: XAUUSD / BTCUSD / EURUSD
- Chart គួរបង្ហាញ • Live

## API
- GET /api/candles?symbol=XAUUSD
- GET /api/candles?symbol=BTCUSD
- GET /api/health

## Local Test
npm install
npm start
# open http://localhost:3000

## Free Plan
Cold start ~30–60s នៅពេលគ្មានអ្នកប្រើយូរ

© 2026 Gold Fx

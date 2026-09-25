/**
 * Gold Fx Market Data Proxy
 * Runs on Render as a Web Service
 * Solves CORS and provides real candles for XAU / BTC / EUR
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (the frontend)
app.use(express.static(__dirname));
app.use(express.json());

const fs = require('fs');
const SIGNALS_FILE = path.join(__dirname, 'signals.json');

function readSignals() {
  try {
    return JSON.parse(fs.readFileSync(SIGNALS_FILE, 'utf8'));
  } catch {
    return [];
  }
}
function writeSignals(list) {
  fs.writeFileSync(SIGNALS_FILE, JSON.stringify(list, null, 2));
}


// ---------- Helpers ----------
async function fetchBinance(symbol = 'BTCUSDT', interval = '15m', limit = 150) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const raw = await res.json();
  return raw.map(k => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4])
  }));
}

async function fetchYahoo(symbol, interval = '15m', range = '5d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Gold Fx/1.0)'
    }
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error('No Yahoo data');
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const data = [];
  for (let i = 0; i < ts.length; i++) {
    if (q.open?.[i] == null || q.close?.[i] == null) continue;
    data.push({
      time: ts[i],
      open: +Number(q.open[i]).toFixed(symbol.includes('EUR') ? 5 : 2),
      high: +Number(q.high[i]).toFixed(symbol.includes('EUR') ? 5 : 2),
      low: +Number(q.low[i]).toFixed(symbol.includes('EUR') ? 5 : 2),
      close: +Number(q.close[i]).toFixed(symbol.includes('EUR') ? 5 : 2)
    });
  }
  if (!data.length) throw new Error('Empty Yahoo series');
  return data;
}

// ---------- API ----------
app.get('/api/candles', async (req, res) => {
  const symbol = (req.query.symbol || 'XAUUSD').toUpperCase();
  const interval = req.query.interval || '15m';

  try {
    let data = null;
    let source = '';

    if (symbol === 'BTCUSD' || symbol === 'BTCUSDT') {
      data = await fetchBinance('BTCUSDT', interval === '1H' ? '1h' : interval === '4H' ? '4h' : interval === '1D' ? '1d' : '15m');
      source = 'binance';
    } else if (symbol === 'XAUUSD' || symbol === 'GOLD') {
      // Gold futures first, then spot
      try {
        data = await fetchYahoo('GC=F', interval === '1H' ? '1h' : interval === '1D' ? '1d' : '15m', '5d');
        source = 'yahoo-GC=F';
      } catch {
        data = await fetchYahoo('XAUUSD=X', interval === '1H' ? '1h' : '15m', '5d');
        source = 'yahoo-XAUUSD';
      }
    } else if (symbol === 'EURUSD') {
      data = await fetchYahoo('EURUSD=X', interval === '1H' ? '1h' : '15m', '5d');
      source = 'yahoo-EURUSD';
    } else {
      return res.status(400).json({ error: 'Unsupported symbol. Use XAUUSD, BTCUSD, EURUSD' });
    }

    res.json({
      symbol,
      source,
      count: data.length,
      candles: data
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Failed to fetch market data', detail: err.message });
  }
});

// Health check

// ---------- Signals API (admin feed) ----------
app.get('/api/signals', (req, res) => {
  const list = readSignals();
  const status = req.query.status;
  const filtered = status ? list.filter(s => s.status === status) : list;
  res.json({ signals: filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

app.post('/api/signals', (req, res) => {
  const body = req.body || {};
  if (!body.symbol || !body.direction || !body.entry) {
    return res.status(400).json({ error: 'symbol, direction, entry required' });
  }
  const list = readSignals();
  const signal = {
    id: 's' + Date.now(),
    symbol: String(body.symbol).toUpperCase(),
    direction: String(body.direction).toUpperCase(),
    entry: String(body.entry),
    sl: String(body.sl || ''),
    tp: String(body.tp || ''),
    rr: parseFloat(body.rr) || 0,
    confidence: parseInt(body.confidence, 10) || 50,
    status: body.status || 'active',
    notes: body.notes || '',
    createdAt: new Date().toISOString()
  };
  list.unshift(signal);
  writeSignals(list);
  res.json({ ok: true, signal });
});

app.patch('/api/signals/:id', (req, res) => {
  const list = readSignals();
  const idx = list.findIndex(s => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  list[idx] = { ...list[idx], ...req.body, id: list[idx].id };
  writeSignals(list);
  res.json({ ok: true, signal: list[idx] });
});

app.delete('/api/signals/:id', (req, res) => {
  let list = readSignals();
  list = list.filter(s => s.id !== req.params.id);
  writeSignals(list);
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Gold Fx Market Proxy' });
});

// SPA fallback - serve index for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Gold Fx running on port ${PORT}`);
});

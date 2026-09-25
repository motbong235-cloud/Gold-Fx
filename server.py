"""
Gold Fx — Python Server
Market data proxy + Signal feed + Static frontend
"""

import json
import os
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder=".", static_url_path="")
BASE = Path(__file__).resolve().parent
SIGNALS_FILE = BASE / "signals.json"
PORT = int(os.environ.get("PORT", 3000))


def read_signals():
    try:
        with open(SIGNALS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def write_signals(data):
    with open(SIGNALS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def http_get_json(url, timeout=12):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; GoldFx/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_binance(symbol="BTCUSDT", interval="15m", limit=150):
    url = (
        f"https://api.binance.com/api/v3/klines"
        f"?symbol={symbol}&interval={interval}&limit={limit}"
    )
    raw = http_get_json(url)
    return [
        {
            "time": int(k[0] // 1000),
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
        }
        for k in raw
    ]


def fetch_yahoo(symbol="GC=F", interval="15m", range_="5d"):
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{urllib.request.quote(symbol)}?interval={interval}&range={range_}"
    )
    data = http_get_json(url)
    result = (data.get("chart") or {}).get("result") or []
    if not result:
        raise ValueError("No Yahoo data")
    r0 = result[0]
    ts = r0.get("timestamp") or []
    q = ((r0.get("indicators") or {}).get("quote") or [{}])[0]
    decimals = 5 if "EUR" in symbol.upper() else 2
    out = []
    for i, t in enumerate(ts):
        o, h, l, c = q.get("open"), q.get("high"), q.get("low"), q.get("close")
        if not o or o[i] is None or c[i] is None:
            continue
        out.append(
            {
                "time": int(t),
                "open": round(float(o[i]), decimals),
                "high": round(float(h[i]), decimals),
                "low": round(float(l[i]), decimals),
                "close": round(float(c[i]), decimals),
            }
        )
    if not out:
        raise ValueError("Empty Yahoo series")
    return out


def map_interval(interval):
    i = (interval or "15m").upper()
    if i in ("1H", "60"):
        return "1h", "1h"
    if i in ("4H",):
        return "4h", "1h"
    if i in ("1D", "D"):
        return "1d", "1d"
    return "15m", "15m"


# ---------- API ----------
@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "Gold Fx Python", "ts": time.time()})


@app.get("/api/candles")
def candles():
    symbol = (request.args.get("symbol") or "XAUUSD").upper()
    interval = request.args.get("interval") or "15m"
    b_int, y_int = map_interval(interval)

    try:
        if symbol in ("BTCUSD", "BTCUSDT"):
            data = fetch_binance("BTCUSDT", b_int)
            source = "binance"
        elif symbol in ("XAUUSD", "GOLD"):
            try:
                data = fetch_yahoo("GC=F", y_int, "5d")
                source = "yahoo-GC=F"
            except Exception:
                data = fetch_yahoo("XAUUSD=X", y_int, "5d")
                source = "yahoo-XAUUSD"
        elif symbol == "EURUSD":
            data = fetch_yahoo("EURUSD=X", y_int, "5d")
            source = "yahoo-EURUSD"
        else:
            return jsonify({"error": "Unsupported symbol. Use XAUUSD, BTCUSD, EURUSD"}), 400

        return jsonify(
            {"symbol": symbol, "source": source, "count": len(data), "candles": data}
        )
    except Exception as e:
        return jsonify({"error": "Failed to fetch market data", "detail": str(e)}), 502


@app.get("/api/signals")
def list_signals():
    lst = read_signals()
    status = request.args.get("status")
    if status:
        lst = [s for s in lst if s.get("status") == status]
    lst = sorted(lst, key=lambda s: s.get("createdAt") or "", reverse=True)
    return jsonify({"signals": lst})


@app.post("/api/signals")
def create_signal():
    body = request.get_json(silent=True) or {}
    if not body.get("symbol") or not body.get("direction") or not body.get("entry"):
        return jsonify({"error": "symbol, direction, entry required"}), 400

    lst = read_signals()
    signal = {
        "id": f"s{int(time.time() * 1000)}",
        "symbol": str(body["symbol"]).upper(),
        "direction": str(body["direction"]).upper(),
        "entry": str(body["entry"]),
        "sl": str(body.get("sl") or ""),
        "tp": str(body.get("tp") or ""),
        "rr": float(body.get("rr") or 0),
        "confidence": int(body.get("confidence") or 50),
        "status": body.get("status") or "active",
        "notes": body.get("notes") or "",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    lst.insert(0, signal)
    write_signals(lst)
    return jsonify({"ok": True, "signal": signal})


@app.patch("/api/signals/<sid>")
def update_signal(sid):
    body = request.get_json(silent=True) or {}
    lst = read_signals()
    for i, s in enumerate(lst):
        if s.get("id") == sid:
            lst[i] = {**s, **body, "id": sid}
            write_signals(lst)
            return jsonify({"ok": True, "signal": lst[i]})
    return jsonify({"error": "not found"}), 404


@app.delete("/api/signals/<sid>")
def delete_signal(sid):
    lst = [s for s in read_signals() if s.get("id") != sid]
    write_signals(lst)
    return jsonify({"ok": True})


# Static files + SPA fallback
@app.route("/")
def index():
    return send_from_directory(BASE, "index.html")


@app.route("/<path:path>")
def static_proxy(path):
    target = BASE / path
    if target.is_file():
        return send_from_directory(BASE, path)
    # API 404
    if path.startswith("api/"):
        return jsonify({"error": "not found"}), 404
    return send_from_directory(BASE, "index.html")


if __name__ == "__main__":
    print(f"Gold Fx Python server on port {PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)

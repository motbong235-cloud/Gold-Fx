// Gold Fx — Core Client-side Logic
// Makes the app functional with localStorage

const GFX = {
  // ========== AUTH ==========
  isLoggedIn() {
    return !!localStorage.getItem('gfx_user');
  },
  
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('gfx_user') || 'null');
    } catch { return null; }
  },
  
  login(email, name = 'Trader') {
    const user = {
      email: email || 'trader@goldfx.app',
      name: name || email.split('@')[0],
      plan: 'Free',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('gfx_user', JSON.stringify(user));
    return user;
  },
  
  logout() {
    localStorage.removeItem('gfx_user');
    window.location.href = 'index.html';
  },
  
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },
  
  // ========== SETTINGS ==========
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem('gfx_settings') || '{}');
    } catch { return {}; }
  },
  
  saveSettings(settings) {
    const current = this.getSettings();
    localStorage.setItem('gfx_settings', JSON.stringify({ ...current, ...settings }));
  },
  
  // ========== TRADES (Performance) ==========
  getTrades() {
    try {
      return JSON.parse(localStorage.getItem('gfx_trades') || '[]');
    } catch { return []; }
  },
  
  saveTrade(trade) {
    const trades = this.getTrades();
    trade.id = Date.now().toString();
    trade.createdAt = new Date().toISOString();
    trades.unshift(trade);
    localStorage.setItem('gfx_trades', JSON.stringify(trades));
    return trade;
  },
  
  deleteTrade(id) {
    let trades = this.getTrades();
    trades = trades.filter(t => t.id !== id);
    localStorage.setItem('gfx_trades', JSON.stringify(trades));
  },
  

  // ========== SIGNALS (Live feed) ==========
  getSignals() {
    try {
      return JSON.parse(localStorage.getItem('gfx_signals') || '[]');
    } catch { return []; }
  },

  seedSignalsIfEmpty() {
    if (this.getSignals().length > 0) return;
    const now = Date.now();
    const seed = [
      { id: 's1', symbol: 'XAUUSD', direction: 'BUY', entry: '2652.40', sl: '2641.00', tp: '2675.00', rr: 2.0, confidence: 78, status: 'active', notes: 'OB + HTF demand', createdAt: new Date(now - 15*60000).toISOString() },
      { id: 's2', symbol: 'BTCUSD', direction: 'SELL', entry: '94850', sl: '95500', tp: '93200', rr: 2.5, confidence: 71, status: 'active', notes: 'Rejection at resistance', createdAt: new Date(now - 42*60000).toISOString() },
      { id: 's3', symbol: 'EURUSD', direction: 'BUY', entry: '1.08420', sl: '1.08150', tp: '1.08950', rr: 2.0, confidence: 64, status: 'closed', resultR: 1.6, notes: 'Clean break + retest', createdAt: new Date(now - 70*60000).toISOString() },
    ];
    localStorage.setItem('gfx_signals', JSON.stringify(seed));
  },

  saveSignal(sig) {
    const list = this.getSignals();
    sig.id = sig.id || ('s' + Date.now());
    sig.createdAt = sig.createdAt || new Date().toISOString();
    sig.status = sig.status || 'active';
    list.unshift(sig);
    localStorage.setItem('gfx_signals', JSON.stringify(list));
    return sig;
  },

  updateSignal(id, patch) {
    let list = this.getSignals();
    list = list.map(s => s.id === id ? { ...s, ...patch } : s);
    localStorage.setItem('gfx_signals', JSON.stringify(list));
  },

  deleteSignal(id) {
    let list = this.getSignals().filter(s => s.id !== id);
    localStorage.setItem('gfx_signals', JSON.stringify(list));
  },

  closeSignal(id, resultR) {
    this.updateSignal(id, { status: 'closed', resultR: resultR, closedAt: new Date().toISOString() });
  },

  // Calculate stats
  getStats() {
    const trades = this.getTrades();
    if (trades.length === 0) {
      return {
        total: 0, wins: 0, losses: 0, winRate: 0,
        avgRR: 0, netR: 0, profitFactor: 0,
        best: 0, worst: 0, expectancy: 0
      };
    }
    
    let wins = 0, losses = 0, totalWinR = 0, totalLossR = 0, netR = 0;
    let best = -Infinity, worst = Infinity;
    
    trades.forEach(t => {
      const r = parseFloat(t.rr) || 0;
      netR += r;
      if (r > 0) {
        wins++;
        totalWinR += r;
        if (r > best) best = r;
      } else {
        losses++;
        totalLossR += Math.abs(r);
        if (r < worst) worst = r;
      }
    });
    
    const total = trades.length;
    const winRate = total > 0 ? (wins / total * 100) : 0;
    const avgRR = total > 0 ? (netR / total) : 0;
    const profitFactor = totalLossR > 0 ? (totalWinR / totalLossR) : totalWinR;
    const expectancy = avgRR;
    
    return {
      total, wins, losses,
      winRate: +winRate.toFixed(1),
      avgRR: +avgRR.toFixed(2),
      netR: +netR.toFixed(1),
      profitFactor: +profitFactor.toFixed(2),
      best: best === -Infinity ? 0 : +best.toFixed(1),
      worst: worst === Infinity ? 0 : +worst.toFixed(1),
      expectancy: +expectancy.toFixed(2)
    };
  },
  
  // Update user display in sidebar
  updateUserUI() {
    const user = this.getUser();
    if (!user) return;
    
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = user.name;
    });
    document.querySelectorAll('[data-user-plan]').forEach(el => {
      el.textContent = user.plan + ' Plan';
    });
  }
};

// Auto-protect pages that require login (except index)
if (!window.location.pathname.endsWith('index.html') && 
    !window.location.pathname.endsWith('/') &&
    window.location.pathname !== '') {
  // Will be called after DOM loads in each page
}

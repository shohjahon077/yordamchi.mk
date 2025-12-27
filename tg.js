// public/js/smart-control.js
class SmartControlBot {
  constructor() {
    this.BOT_TOKEN = '8055090268:AAHtu9cy9lnZw_GFZqo8mc860Bj9G3H7vOU';
    this.CHAT_ID = '8136720315';
    this.visitorId = this.getVisitorId();
    this.sessionId = 'sess_' + Date.now();
    
    this.init();
  }
  
  getVisitorId() {
    let id = localStorage.getItem('visitor_id');
    if (!id) {
      id = 'vis_' + Date.now().toString(36);
      localStorage.setItem('visitor_id', id);
    }
    return id;
  }
  
  async init() {
    // Blokni tekshirish
    if (this.checkBan()) return;
    
    // Dastlabki xabar
    await this.sendWelcome();
    
    // Harakatlarni kuzatish
    this.trackActions();
    
    // Komandalarni tekshirish
    this.checkCommands();
  }
  
  checkBan() {
    const banData = localStorage.getItem(`ban_${this.visitorId}`);
    if (banData) {
      const { reason, expiry } = JSON.parse(banData);
      if (expiry > Date.now()) {
        this.showBanScreen(reason, expiry);
        return true;
      } else {
        localStorage.removeItem(`ban_${this.visitorId}`);
      }
    }
    return false;
  }
  
  async sendWelcome() {
    const ip = await this.getIP();
    const location = await this.getLocation(ip);
    
    const message = `
👤 *Yangi Visitor*
🆔 ID: \`${this.visitorId}\`
📍 URL: ${window.location.href}
📱 Qurilma: ${this.getDevice()}
🌐 IP: \`${ip}\`
🏙️ Joy: ${location}

📊 *Boshqaruv Tugmalari:*
    `.trim();
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚫 Blok', callback_data: 'ban' },
          { text: '⏰ 10 kun', callback_data: 'ban10' },
          { text: '❌ Chiqar', callback_data: 'kick' }
        ],
        [
          { text: '📝 Xabar', callback_data: 'msg' },
          { text: '⚠️ Ogoh', callback_data: 'warn' },
          { text: '✅ Tasdiq', callback_data: 'verify' }
        ],
        [
          { text: '🔍 Info', callback_data: 'info' },
          { text: '📊 Stat', callback_data: 'stats' },
          { text: '🔄 Yangila', callback_data: 'refresh' }
        ]
      ]
    };
    
    await this.sendToTelegram(message, keyboard);
  }
  
  async getIP() {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip;
    } catch {
      return 'Noma\'lum';
    }
  }
  
  async getLocation(ip) {
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await res.json();
      return data.city ? `${data.city}, ${data.country}` : 'Noma\'lum';
    } catch {
      return 'Noma\'lum';
    }
  }
  
  getDevice() {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone/i.test(ua)) return '📱 Mobil';
    if (/Tablet/i.test(ua)) return '📟 Planshet';
    return '💻 Kompyuter';
  }
  
  trackActions() {
    // Oddiy tracking
    document.addEventListener('click', () => {
      this.actionsCount = (this.actionsCount || 0) + 1;
    });
  }
  
  checkCommands() {
    setInterval(async () => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${this.BOT_TOKEN}/getUpdates?offset=-10`);
        const data = await res.json();
        
        if (data.ok) {
          data.result.forEach(update => {
            if (update.callback_query) this.handleButton(update.callback_query);
            if (update.message?.text) this.handleCommand(update.message);
          });
        }
      } catch (e) {}
    }, 3000);
  }
  
  async handleButton(callback) {
    const action = callback.data;
    
    switch(action) {
      case 'ban':
        await this.banVisitor('Administrator bloki');
        break;
      case 'ban10':
        await this.ban10Days('10 kunlik blok');
        break;
      case 'kick':
        await this.kickVisitor();
        break;
      case 'msg':
        await this.askForMessage();
        break;
      case 'warn':
        await this.sendWarning();
        break;
      case 'verify':
        await this.requestVerification();
        break;
      case 'info':
        await this.sendInfo();
        break;
      case 'stats':
        await this.sendStats();
        break;
      case 'refresh':
        await this.sendWelcome();
        break;
    }
  }
  
  async handleCommand(msg) {
    const text = msg.text;
    
    // Bloklash
    if (text === `/ban ${this.visitorId}`) {
      await this.banVisitor('Command orqali');
    }
    
    // 10 kunlik blok
    else if (text === `/ban10 ${this.visitorId}`) {
      await this.ban10Days('10 kunlik blok');
    }
    
    // Chiqarish
    else if (text === `/kick ${this.visitorId}`) {
      await this.kickVisitor();
    }
    
    // Xabar yuborish
    else if (text.startsWith(`/msg ${this.visitorId}`)) {
      const message = text.replace(`/msg ${this.visitorId}`, '').trim();
      this.showMessage(message);
    }
    
    // Blokni olish
    else if (text === `/unban ${this.visitorId}`) {
      this.unbanVisitor();
    }
    
    // Qayta kirish
    else if (text === `/allow ${this.visitorId}`) {
      this.allowReentry();
    }
  }
  
  // ========== ASOSIY FUNKSIYALAR ==========
  
  async banVisitor(reason) {
    // Bloklash
    const banData = {
      reason: reason,
      time: Date.now(),
      expiry: 0 // Doimiy
    };
    localStorage.setItem(`ban_${this.visitorId}`, JSON.stringify(banData));
    
    this.showBanScreen(reason);
    
    await this.sendToTelegram(`🚫 ${this.visitorId} bloklandi\nSabab: ${reason}`);
  }
  
  async ban10Days(reason) {
    // 10 kunlik blok
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    const banData = {
      reason: reason,
      time: Date.now(),
      expiry: Date.now() + tenDays
    };
    localStorage.setItem(`ban_${this.visitorId}`, JSON.stringify(banData));
    
    this.showBanScreen(reason + ' (10 kun)');
    
    await this.sendToTelegram(
      `⏰ ${this.visitorId} 10 kunga bloklandi\n` +
      `Tugash: ${new Date(Date.now() + tenDays).toLocaleDateString('uz-UZ')}`
    );
  }
  
  async kickVisitor() {
    // Chiqarish
    this.showKickScreen();
    
    await this.sendToTelegram(`👢 ${this.visitorId} chiqarib yuborildi`);
    
    // 10 soniyadan keyin Google'ga yo'naltirish
    setTimeout(() => {
      window.location.href = 'https://www.google.com';
    }, 10000);
  }
  
  async askForMessage() {
    await this.sendToTelegram(
      `📝 ${this.visitorId} ga xabar yuborish:\n` +
      `Format: /msg ${this.visitorId} [matn]`
    );
  }
  
  async sendWarning() {
    this.showWarning('⚠️ Administrator sizni ogohlantirmoqda!');
    
    await this.sendToTelegram(`⚠️ ${this.visitorId} ga ogohlantirish yuborildi`);
  }
  
  async requestVerification() {
    this.showVerificationForm();
    
    await this.sendToTelegram(`🔐 ${this.visitorId} ga tasdiqlash so\'rovi yuborildi`);
  }
  
  async sendInfo() {
    const ip = await this.getIP();
    const device = this.getDevice();
    
    await this.sendToTelegram(
      `📋 ${this.visitorId} ma\'lumoti:\n` +
      `🌐 IP: ${ip}\n` +
      `📱 Qurilma: ${device}\n` +
      `🔗 URL: ${window.location.href}\n` +
      `🕐 Vaqt: ${new Date().toLocaleTimeString('uz-UZ')}`
    );
  }
  
  async sendStats() {
    await this.sendToTelegram(
      `📊 ${this.visitorId} statistikasi:\n` +
      `🖱️ Clicks: ${this.actionsCount || 0}\n` +
      `🕐 Sessiya: ${Math.floor((Date.now() - this.sessionStart) / 1000)}s\n` +
      `📍 Sahifa: ${window.location.pathname}`
    );
  }
  
  unbanVisitor() {
    localStorage.removeItem(`ban_${this.visitorId}`);
    this.removeBanScreen();
    
    this.sendToTelegram(`🔓 ${this.visitorId} blokdan chiqarildi`);
  }
  
  allowReentry() {
    this.removeKickScreen();
    this.sendToTelegram(`🔄 ${this.visitorId} qayta kirishga ruxsat berildi`);
  }
  
  // ========== EKRAN KO'RSATISH ==========
  
  showBanScreen(reason) {
    document.body.innerHTML = `
      <div style="
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:#0f0c29; color:white; display:flex; flex-direction:column;
        justify-content:center; align-items:center; text-align:center;
        padding:20px; font-family:Arial; z-index:99999;
      ">
        <div style="font-size:80px">🚫</div>
        <h1 style="color:#ff6b6b">BLOKLANDINGIZ</h1>
        <p>${reason}</p>
        <div style="
          background:rgba(255,255,255,0.1); padding:20px; border-radius:10px;
          margin:20px 0; text-align:left; font-family:monospace;
        ">
          <p>ID: ${this.visitorId}</p>
          <p>Vaqt: ${new Date().toLocaleString('uz-UZ')}</p>
        </div>
        <button onclick="requestUnban()" style="
          padding:12px 24px; background:#00b4d8; color:white;
          border:none; border-radius:8px; font-size:16px; cursor:pointer;
        ">
          🔓 Blokni olish so'rovi
        </button>
      </div>
    `;
    
    window.requestUnban = async () => {
      await this.sendToTelegram(`🔓 ${this.visitorId} blok olish so'radi`);
      alert('So\'rov yuborildi!');
    };
    
    // F5 ni bloklash
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F5') e.preventDefault();
    });
  }
  
  showKickScreen() {
    document.body.innerHTML = `
      <div style="
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:linear-gradient(135deg,#ff9a00,#ff6a00); 
        color:white; display:flex; flex-direction:column;
        justify-content:center; align-items:center; text-align:center;
        padding:20px; font-family:Arial; z-index:99999;
      ">
        <div style="font-size:80px">👢</div>
        <h1>CHIQARIB YUBORILDINGIZ</h1>
        <p style="margin:20px 0">10 soniyadan keyin chiqarilasiz...</p>
        <div id="timer" style="font-size:48px; font-weight:bold">10</div>
      </div>
    `;
    
    let time = 10;
    const timer = setInterval(() => {
      time--;
      document.getElementById('timer').textContent = time;
      if (time <= 0) {
        clearInterval(timer);
        window.location.href = 'https://www.google.com';
      }
    }, 1000);
  }
  
  showMessage(text) {
    const msg = document.createElement('div');
    msg.style.cssText = `
      position:fixed; top:20px; right:20px; background:#1e40af;
      color:white; padding:15px; border-radius:10px; z-index:99999;
      max-width:300px; box-shadow:0 5px 15px rgba(0,0,0,0.3);
    `;
    msg.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px">
        <div style="font-size:24px">📨</div>
        <strong>Administrator xabari:</strong>
      </div>
      <p>${text}</p>
      <button onclick="this.parentElement.remove()" style="
        margin-top:10px; padding:5px 15px; background:white;
        color:#1e40af; border:none; border-radius:5px; cursor:pointer;
      ">
        OK
      </button>
    `;
    document.body.appendChild(msg);
  }
  
  showWarning(text) {
    const warn = document.createElement('div');
    warn.style.cssText = `
      position:fixed; top:20px; left:50%; transform:translateX(-50%);
      background:#f59e0b; color:white; padding:15px; border-radius:10px;
      z-index:99999; max-width:400px; text-align:center;
      animation:slideDown 0.5s ease;
    `;
    warn.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; justify-content:center">
        <div style="font-size:24px">⚠️</div>
        <strong>OGOHLANTIRISH</strong>
      </div>
      <p style="margin:10px 0">${text}</p>
      <button onclick="this.parentElement.remove()" style="
        padding:5px 15px; background:white; color:#f59e0b;
        border:none; border-radius:5px; cursor:pointer;
      ">
        Tushundim
      </button>
    `;
    document.body.appendChild(warn);
  }
  
  showVerificationForm() {
    const form = document.createElement('div');
    form.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.9); display:flex; justify-content:center;
      align-items:center; z-index:99999;
    `;
    form.innerHTML = `
      <div style="
        background:white; padding:30px; border-radius:15px;
        max-width:400px; width:90%;
      ">
        <h2 style="color:#333; margin-bottom:20px">🔐 Tasdiqlash</h2>
        <input type="text" placeholder="Ismingiz" id="name" style="
          width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd;
          border-radius:8px; box-sizing:border-box;
        ">
        <input type="number" placeholder="Yoshingiz" id="age" style="
          width:100%; padding:12px; margin-bottom:10px; border:1px solid #ddd;
          border-radius:8px; box-sizing:border-box;
        ">
        <textarea placeholder="Nima uchun kirdingiz?" id="reason" style="
          width:100%; padding:12px; margin-bottom:20px; border:1px solid #ddd;
          border-radius:8px; box-sizing:border-box; height:100px;
        "></textarea>
        <div style="display:flex; gap:10px">
          <button onclick="submitVerification()" style="
            flex:1; padding:12px; background:#10b981; color:white;
            border:none; border-radius:8px; cursor:pointer;
          ">
            ✅ Tasdiqlash
          </button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            flex:1; padding:12px; background:#ef4444; color:white;
            border:none; border-radius:8px; cursor:pointer;
          ">
            ❌ Bekor qilish
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(form);
    
    window.submitVerification = async () => {
      const name = document.getElementById('name').value;
      const age = document.getElementById('age').value;
      const reason = document.getElementById('reason').value;
      
      if (name && age) {
        await this.sendToTelegram(
          `✅ ${this.visitorId} tasdiqlandi:\n` +
          `👤 Ism: ${name}\n` +
          `🎂 Yosh: ${age}\n` +
          `🎯 Sabab: ${reason || 'Ko\'rsatilmagan'}`
        );
        form.remove();
        alert('Tasdiqlandi!');
      } else {
        alert('Ism va yoshni kiriting!');
      }
    };
  }
  
  removeBanScreen() {
    const banScreen = document.querySelector('div[style*="background:#0f0c29"]');
    if (banScreen) banScreen.remove();
  }
  
  removeKickScreen() {
    const kickScreen = document.querySelector('div[style*="background:linear-gradient"]');
    if (kickScreen) kickScreen.remove();
  }
  
  async sendToTelegram(text, keyboard = null) {
    try {
      const payload = {
        chat_id: this.CHAT_ID,
        text: text,
        parse_mode: 'Markdown'
      };
      
      if (keyboard) {
        payload.reply_markup = keyboard;
      }
      
      await fetch(`https://api.telegram.org/bot${this.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Xato:', error);
    }
  }
}

// Ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
  if (!window.botControl) {
    window.botControl = new SmartControlBot();
  }
});

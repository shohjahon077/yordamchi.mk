// public/js/full-monitor.js
class AdvancedVisitorMonitor {
  constructor() {
    // Telegram bot ma'lumotlari
    this.BOT_TOKEN = '8055090268:AAHtu9cy9lnZw_GFZqo8mc860Bj9G3H7vOU'; // O'z bot tokeningizni qo'ying
    this.CHAT_ID = '8136720315'; // O'z chat ID'ingizni qo'ying
    
    // Visitor ma'lumotlari
    this.visitorId = this.getVisitorId();
    this.sessionId = 'session_' + Date.now();
    this.isBanned = false;
    this.isVerified = false;
    this.userData = {};
    this.activities = [];
    this.startTime = Date.now();
    
    // Anti-bot o'zgaruvchilari
    this.mouseMoves = 0;
    this.clicks = 0;
    this.keyPresses = 0;
    this.lastActivity = Date.now();
    
    this.init();
  }
  
  getVisitorId() {
    let id = localStorage.getItem('visitor_id');
    if (!id) {
      id = 'vis_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('visitor_id', id);
    }
    return id;
  }
  
  async init() {
    console.log('🔍 Monitoring tizimi ishga tushdi...');
    
    // Dastlabki ma'lumotlarni yig'ish
    const basicInfo = await this.collectBasicInfo();
    
    // Telegramga birinchi xabar
    this.sendInitialReport(basicInfo);
    
    // Foydalanuvchi harakatlarini kuzatish
    this.startTracking();
    
    // Anti-bot tekshiruvlari
    this.startAntiBotChecks();
    
    // Telegram command'larini tinglash (polling)
    this.startCommandPolling();
    
    // Har 30 soniyada faollikni tekshirish
    setInterval(() => this.checkActivity(), 30000);
  }
  
  async collectBasicInfo() {
    const info = {
      // Asosiy ma'lumotlar
      visitorId: this.visitorId,
      url: window.location.href,
      referrer: document.referrer || 'To\'g\'ridan',
      
      // Qurilma ma'lumotlari
      device: this.getDeviceType(),
      os: this.getOS(),
      browser: this.getBrowser(),
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      userAgent: navigator.userAgent,
      
      // Vaqt ma'lumotlari
      time: new Date().toLocaleString('uz-UZ'),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Onlayn status
      online: navigator.onLine,
      cookies: navigator.cookieEnabled ? '✅' : '❌',
      
      // IP manzili
      ip: 'Yuklanmoqda...'
    };
    
    // IP olish
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      info.ip = data.ip;
      
      // Geolocation
      try {
        const geoResponse = await fetch(`https://ipapi.co/${info.ip}/json/`);
        const geoData = await geoResponse.json();
        info.location = geoData.city ? 
          `${geoData.city}, ${geoData.country_name}` : 'Noma\'lum';
        info.isp = geoData.org || 'Noma\'lum';
      } catch {
        info.location = 'Noma\'lum';
      }
    } catch {
      info.ip = 'Noma\'lum';
    }
    
    return info;
  }
  
  getDeviceType() {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) return '📱 Telefon';
    if (/Tablet/i.test(ua)) return '📟 Planshet';
    return '💻 Kompyuter';
  }
  
  getOS() {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'MacOS';
    if (/Linux/i.test(ua)) return 'Linux';
    if (/Android/i.test(ua)) return 'Android';
    if (/iOS|iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    return 'Noma\'lum';
  }
  
  getBrowser() {
    const ua = navigator.userAgent;
    if (/chrome|chromium|crios/i.test(ua)) return 'Chrome';
    if (/firefox|fxios/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
    if (/edg/i.test(ua)) return 'Edge';
    return 'Noma\'lum';
  }
  
  async sendInitialReport(info) {
    const riskLevel = this.calculateRiskLevel(info);
    
    const message = `
🎯 *YANGI VISITOR KIRDI*

👤 *ID:* \`${info.visitorId}\`
📅 *Vaqt:* ${info.time}
📍 *URL:* [Sahifa](${info.url})
🔄 *Kelgan joy:* ${info.referrer}

📱 *QURILMA:*
• Turi: ${info.device}
• OS: ${info.os}
• Browser: ${info.browser}
• Ekran: ${info.screen}
• Til: ${info.language}

🌍 *LOKATSIYA:*
• IP: \`${info.ip}\`
• Joy: ${info.location || 'Noma\'lum'}
• ISP: ${info.isp || 'Noma\'lum'}

⚙️ *TEXNIK:*
• Cookie: ${info.cookies}
• Online: ${info.online ? '✅' : '❌'}
• Timezone: ${info.timezone}

🚨 *XAVF DARAJASI:* ${riskLevel}

🎮 *BOSHQARUV:*
• \`/ban_${this.visitorId}\` - Bloklash
• \`/verify_${this.visitorId}\` - Tasdiqlash
• \`/info_${this.visitorId}\` - Batafsil
• \`/kick_${this.visitorId}\` - Chiqarib yuborish
    `.trim();
    
    await this.sendToTelegram(message);
    
    // Agar yuqori risk bo'lsa, darhol tasdiqlash so'rash
    if (riskLevel.includes('🔴') || riskLevel.includes('🟡')) {
      setTimeout(() => this.showVerificationModal(), 5000);
    }
  }
  
  calculateRiskLevel(info) {
    let score = 0;
    
    // VPN/Proxy tekshirish (soddalashtirilgan)
    if (info.isp && (
      info.isp.toLowerCase().includes('vpn') ||
      info.isp.toLowerCase().includes('proxy') ||
      info.isp.toLowerCase().includes('tor')
    )) score += 30;
    
    // No cookies
    if (info.cookies === '❌') score += 20;
    
    // Mobile emas, lekin mobil user agent
    if (info.device.includes('📱') && !/Mobile|Android|iPhone/i.test(info.userAgent)) {
      score += 15;
    }
    
    // Developer tools ochiqmi?
    const devTools = window.outerWidth - window.innerWidth > 100 ||
                     window.outerHeight - window.innerHeight > 100;
    if (devTools) score += 25;
    
    // Risk darajasi
    if (score >= 40) return '🔴 YUQORI';
    if (score >= 20) return '🟡 O\'RTA';
    return '🟢 PAST';
  }
  
  startTracking() {
    // Sichqoncha harakatlari
    document.addEventListener('mousemove', () => {
      this.mouseMoves++;
      this.lastActivity = Date.now();
      this.activities.push({
        type: 'mouse_move',
        time: Date.now()
      });
    });
    
    // Click harakatlari
    document.addEventListener('click', (e) => {
      this.clicks++;
      this.lastActivity = Date.now();
      
      this.activities.push({
        type: 'click',
        element: e.target.tagName,
        text: e.target.textContent?.substring(0, 30),
        time: Date.now()
      });
      
      // Har 10 ta click da aktivlik hisobotini yuborish
      if (this.clicks % 10 === 0) {
        this.sendActivityUpdate();
      }
    });
    
    // Klaviatura harakatlari
    document.addEventListener('keydown', (e) => {
      this.keyPresses++;
      this.lastActivity = Date.now();
      
      // Enter, Tab, Escape kabi tugmalarni kuzatish
      if (['Enter', 'Tab', 'Escape', 'F5', 'F12'].includes(e.key)) {
        this.activities.push({
          type: 'key_special',
          key: e.key,
          time: Date.now()
        });
      }
    });
    
    // Scroll harakatlari
    let scrollCount = 0;
    window.addEventListener('scroll', () => {
      scrollCount++;
      this.lastActivity = Date.now();
      
      if (scrollCount % 20 === 0) {
        this.activities.push({
          type: 'scroll',
          position: window.pageYOffset,
          time: Date.now()
        });
      }
    });
    
    // Form inputlarni kuzatish
    document.addEventListener('input', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        this.activities.push({
          type: 'input',
          field: e.target.name || e.target.id || 'noma\'lum',
          length: e.target.value.length,
          time: Date.now()
        });
      }
    });
    
    // Tab o'zgarishi
    document.addEventListener('visibilitychange', () => {
      this.activities.push({
        type: 'tab_change',
        state: document.visibilityState,
        time: Date.now()
      });
    });
    
    // Saytdan chiqish
    window.addEventListener('beforeunload', () => {
      const duration = Math.floor((Date.now() - this.startTime) / 1000);
      this.sendExitReport(duration);
    });
  }
  
  startAntiBotChecks() {
    // Tez-tez bir xil harakatlar (bot belgisi)
    setInterval(() => {
      const recentClicks = this.activities.filter(a => 
        a.type === 'click' && 
        Date.now() - a.time < 5000
      ).length;
      
      if (recentClicks > 20) { // 5 soniyada 20 marta click
        this.sendWarning('⚠️ Botga o\'xshash harakatlar aniqlandi!');
      }
    }, 10000);
    
    // Faolsizlikni tekshirish
    setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity;
      if (inactiveTime > 120000) { // 2 daqiqa
        this.sendWarning('💤 Visitor 2 daqiqa davomida faol emas');
      }
    }, 60000);
  }
  
  async sendActivityUpdate() {
    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    const pages = this.getVisitedPages();
    
    const message = `
📊 *FAOLLIK HISOBOTI*

👤 Visitor: \`${this.visitorId}\`
⏱️ Davomiylik: ${Math.floor(duration / 60)}m ${duration % 60}s
📍 Joriy sahifa: ${window.location.pathname}

📈 *STATISTIKA:*
• Clicks: ${this.clicks}
• Mouse harakatlari: ${this.mouseMoves}
• Klaviatura: ${this.keyPresses}
• Ko'rilgan sahifalar: ${pages.length}

🔄 *SONGI HARAKATLAR:*
${this.activities.slice(-3).map(a => 
  `• ${a.type} - ${new Date(a.time).toLocaleTimeString('uz-UZ')}`
).join('\n')}

${this.isVerified ? '✅ Tasdiqlangan' : '⚠️ Tasdiqlanmagan'}
    `.trim();
    
    await this.sendToTelegram(message);
  }
  
  async sendExitReport(durationSeconds) {
    const message = `
🚪 *VISITOR CHIQDI*

👤 ID: \`${this.visitorId}\`
⏱️ Umumiy vaqt: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s
📊 Faollik: 
• Clicks: ${this.clicks}
• Harakatlar: ${this.mouseMoves}
• Sahifalar: ${this.getVisitedPages().length}

${this.isVerified ? '✅ Tasdiqlangan foydalanuvchi' : '⚠️ Tasdiqlanmagan'}
${this.isBanned ? '🚫 Bloklangan' : '🟢 Normal chiqish'}
    `.trim();
    
    // Offline saqlash va keyin yuborish
    const report = {
      type: 'exit_report',
      message: message,
      timestamp: Date.now()
    };
    
    localStorage.setItem('last_exit_report', JSON.stringify(report));
    
    // Agar onlayn bo'lsa, darhol yuborish
    if (navigator.onLine) {
      await this.sendToTelegram(message);
    }
  }
  
  async sendWarning(text) {
    const message = `
🚨 *OGOHLANTIRISH*

👤 Visitor: \`${this.visitorId}\`
⚠️ Sabab: ${text}
📍 Sahifa: ${window.location.href}
🕒 Vaqt: ${new Date().toLocaleTimeString('uz-UZ')}
    `.trim();
    
    await this.sendToTelegram(message);
  }
  
  showVerificationModal() {
    if (this.isVerified || this.verificationShown) return;
    this.verificationShown = true;
    
    const modal = document.createElement('div');
    modal.id = 'verificationModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: Arial, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 40px;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        color: white;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        border: 2px solid #00b4d8;
      ">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
          <h2 style="margin: 0 0 10px 0; color: #00b4d8;">TASDIQLASH TALABI</h2>
          <p style="color: #90e0ef; margin-bottom: 30px;">
            Xavfsizlik tizimi sizni tasdiqlashni talab qilmoqda.
            Iltimos, quyidagi ma'lumotlarni to'ldiring:
          </p>
        </div>
        
        <form id="verifyForm" style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label style="display: block; margin-bottom: 8px; color: #90e0ef;">Ismingiz *</label>
            <input type="text" 
                   name="name" 
                   required 
                   placeholder="Ism Familiya"
                   style="
                     width: 100%;
                     padding: 15px;
                     background: rgba(255,255,255,0.1);
                     border: 2px solid #00b4d8;
                     border-radius: 10px;
                     color: white;
                     font-size: 16px;
                   ">
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 8px; color: #90e0ef;">Yoshingiz *</label>
            <input type="number" 
                   name="age" 
                   required 
                   min="1" 
                   max="120"
                   placeholder="Masalan: 25"
                   style="
                     width: 100%;
                     padding: 15px;
                     background: rgba(255,255,255,0.1);
                     border: 2px solid #00b4d8;
                     border-radius: 10px;
                     color: white;
                     font-size: 16px;
                   ">
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 8px; color: #90e0ef;">Maqsadingiz *</label>
            <select name="purpose" 
                    required
                    style="
                      width: 100%;
                      padding: 15px;
                      background: rgba(255,255,255,0.1);
                      border: 2px solid #00b4d8;
                      border-radius: 10px;
                      color: white;
                      font-size: 16px;
                    ">
              <option value="">Tanlang...</option>
              <option value="learn">O'rganish</option>
              <option value="work">Ish</option>
              <option value="entertainment">Ko'ngilochar</option>
              <option value="research">Tadqiqot</option>
              <option value="other">Boshqa</option>
            </select>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 8px; color: #90e0ef;">Qo'shimcha izoh</label>
            <textarea name="comment" 
                     placeholder="Nima uchun bu saytga kirdingiz?"
                     rows="3"
                     style="
                       width: 100%;
                       padding: 15px;
                       background: rgba(255,255,255,0.1);
                       border: 2px solid #00b4d8;
                       border-radius: 10px;
                       color: white;
                       font-size: 16px;
                       resize: vertical;
                     "></textarea>
          </div>
          
          <div style="
            background: rgba(0,180,216,0.2);
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #00b4d8;
            margin: 10px 0;
          ">
            <p style="margin: 0; color: #90e0ef; font-size: 14px;">
              📝 Ma'lumotlaringiz faqat xavfsizlik maqsadida ishlatiladi va 24 soatdan keyin o'chiriladi.
            </p>
          </div>
          
          <div style="display: flex; gap: 15px; margin-top: 20px;">
            <button type="submit" 
                    style="
                      flex: 1;
                      padding: 18px;
                      background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%);
                      color: white;
                      border: none;
                      border-radius: 10px;
                      font-size: 16px;
                      font-weight: bold;
                      cursor: pointer;
                      transition: all 0.3s;
                    "
                    onmouseover="this.style.transform='translateY(-2px)';"
                    onmouseout="this.style.transform='translateY(0)';">
              ✅ TASDIQLASH
            </button>
            
            <button type="button" 
                    id="cancelBtn"
                    style="
                      flex: 1;
                      padding: 18px;
                      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                      color: white;
                      border: none;
                      border-radius: 10px;
                      font-size: 16px;
                      font-weight: bold;
                      cursor: pointer;
                      transition: all 0.3s;
                    "
                    onmouseover="this.style.transform='translateY(-2px)';"
                    onmouseout="this.style.transform='translateY(0)';">
              ❌ RAD ETISH
            </button>
          </div>
        </form>
        
        <div style="text-align: center; margin-top: 30px; color: #90e0ef; font-size: 14px;">
          <p>Visitor ID: <code style="background: rgba(0,0,0,0.3); padding: 2px 5px; border-radius: 3px;">${this.visitorId}</code></p>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Form submit
    modal.querySelector('#verifyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      this.userData = {
        name: formData.get('name'),
        age: formData.get('age'),
        purpose: formData.get('purpose'),
        comment: formData.get('comment'),
        verifiedAt: new Date().toISOString()
      };
      
      this.isVerified = true;
      modal.remove();
      
      // Telegramga tasdiqlanganligi haqida xabar
      await this.sendVerificationSuccess();
      
      // Cookie saqlash
      document.cookie = `verified=true; max-age=86400; path=/`;
    });
    
    // Cancel tugmasi
    modal.querySelector('#cancelBtn').addEventListener('click', async () => {
      modal.remove();
      await this.sendVerificationRejected();
      
      // 10 soniyadan keyin yana so'rash
      setTimeout(() => {
        if (!this.isVerified) {
          this.showVerificationModal();
        }
      }, 10000);
    });
    
    // 30 soniyadan keyin avtomatik rad etish
    setTimeout(() => {
      if (!this.isVerified && document.contains(modal)) {
        modal.remove();
        this.sendVerificationTimeout();
      }
    }, 30000);
  }
  
  async sendVerificationSuccess() {
    const message = `
✅ *TASDIQLASH MUVAFFAQIYATLI*

👤 Visitor: \`${this.visitorId}\`
📅 Vaqt: ${new Date().toLocaleString('uz-UZ')}
👤 Ism: ${this.userData.name}
🎂 Yosh: ${this.userData.age}
🎯 Maqsad: ${this.userData.purpose}
💬 Izoh: ${this.userData.comment || 'Yo\'q'}

🟢 Visitor muvaffaqiyatli tasdiqlandi!
    `.trim();
    
    await this.sendToTelegram(message);
  }
  
  async sendVerificationRejected() {
    const message = `
❌ *TASDIQLASH RAD ETILDI*

👤 Visitor: \`${this.visitorId}\`
📅 Vaqt: ${new Date().toLocaleString('uz-UZ')}
⚠️ Sabab: Foydalanuvchi tasdiqlashni rad etdi

🚨 Ehtiyot bo'ling! Shubhali harakat.
/blok_${this.visitorId} - Bloklash uchun
    `.trim();
    
    await this.sendToTelegram(message);
  }
  
  async sendVerificationTimeout() {
    const message = `
⏰ *TASDIQLASH VAQTI TUGADI*

👤 Visitor: \`${this.visitorId}\`
⚠️ Sabab: 30 soniya ichida javob berilmadi

🚨 Bot yoki shubhali foydalanuvchi bo'lishi mumkin.
/blok_${this.visitorId} - Darhol bloklash
    `.trim();
    
    await this.sendToTelegram(message);
  }
  
  startCommandPolling() {
    // Har 10 soniyada telegram command'larini tekshirish
    setInterval(async () => {
      await this.checkForCommands();
    }, 10000);
  }
  
  async checkForCommands() {
    try {
      // So'nggi xabarlarni olish
      const response = await fetch(
        `https://api.telegram.org/bot${this.BOT_TOKEN}/getUpdates?offset=-10`
      );
      const data = await response.json();
      
      if (data.ok && data.result) {
        for (const update of data.result) {
          if (update.message && update.message.text) {
            const text = update.message.text;
            
            // Bloklash command'asi
            if (text.includes(`/ban_${this.visitorId}`) || 
                text.includes(`/kick_${this.visitorId}`) ||
                text.includes(`/blok_${this.visitorId}`)) {
              this.banVisitor('Administrator buyrug\'i bilan');
              break;
            }
            
            // Tasdiqlash command'asi
            if (text.includes(`/verify_${this.visitorId}`)) {
              this.showVerificationModal();
              break;
            }
            
            // IP bloklash
            if (text.includes(`/blockip_`) && text.includes(this.getCurrentIP())) {
              this.banVisitor('IP manzil bloklandi');
              break;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Command polling xatosi:', error);
    }
  }
  
  async getCurrentIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }
  
  banVisitor(reason) {
    if (this.isBanned) return;
    
    this.isBanned = true;
    localStorage.setItem('banned_visitor', 'true');
    
    // Bloklash ekrani ko'rsatish
    this.showBanScreen(reason);
    
    // Telegramga bloklanganligi haqida xabar
    this.sendBanNotification(reason);
    
    // 10 soniyadan keyin boshqa saytga yo'naltirish
    setTimeout(() => {
      window.location.href = 'https://www.google.com/search?q=xavfsiz+internet';
    }, 10000);
  }
  
  showBanScreen(reason) {
    // Hozirgi sahifani to'liq bloklash
    document.body.innerHTML = '';
    
    const banScreen = document.createElement('div');
    banScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 20px;
      font-family: Arial, sans-serif;
      z-index: 9999999;
    `;
    
    banScreen.innerHTML = `
      <div style="font-size: 120px; margin-bottom: 20px;">🚫</div>
      <h1 style="font-size: 48px; margin-bottom: 20px; color: #ff6b6b;">KIRISH BLOKLANDI</h1>
      
      <div style="
        background: rgba(255,255,255,0.1);
        padding: 30px;
        border-radius: 15px;
        max-width: 600px;
        margin-bottom: 30px;
        border-left: 5px solid #ff6b6b;
      ">
        <p style="font-size: 20px; margin-bottom: 15px;">
          ${reason}
        </p>
        
        <div style="
          background: rgba(0,0,0,0.3);
          padding: 20px;
          border-radius: 10px;
          margin-top: 20px;
          text-align: left;
        ">
          <p><strong>Visitor ID:</strong> <code>${this.visitorId}</code></p>
          <p><strong>IP Manzil:</strong> <code>${localStorage.getItem('last_ip') || 'Noma\'lum'}</code></p>
          <p><strong>Bloklangan vaqt:</strong> ${new Date().toLocaleString('uz-UZ')}</p>
          <p><strong>Sabab:</strong> Xavfsizlik qoidasini buzish</p>
        </div>
      </div>
      
      <div style="margin-top: 30px; color: #aaa; max-width: 500px;">
        <p>⚠️ Agar bu xato deb o'ylasangiz, sayt administratori bilan bog'lanishingiz mumkin.</p>
        <p style="font-size: 14px; margin-top: 20px;">
          Siz 10 soniyadan keyin Google.com sahifasiga yo'naltirilasiz...
        </p>
        <div id="countdown" style="
          font-size: 36px;
          font-weight: bold;
          color: #00b4d8;
          margin: 20px 0;
        ">10</div>
      </div>
    `;
    
    document.body.appendChild(banScreen);
    
    // Countdown timer
    let count = 10;
    const countdownEl = document.getElementById('countdown');
    const timer = setInterval(() => {
      count--;
      countdownEl.textContent = count;
      if (count <= 0) {
        clearInterval(timer);
      }
    }, 1000);
    
    // Barcha event listenerlarni o'chirish
    document.querySelectorAll('*').forEach(el => {
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
    });
  }
  
  async sendBanNotification(reason) {
    const message = `
🚫 *VISITOR BLOKLANDI*

👤 ID: \`${this.visitorId}\`
📅 Vaqt: ${new Date().toLocaleString('uz-UZ')}
📍 URL: ${window.location.href}
⚠️ Sabab: ${reason}

📊 *STATISTIKA:*
• Sessiya: ${Math.floor((Date.now() - this.startTime) / 1000)}s
• Clicks: ${this.clicks}
• Harakatlar: ${this.mouseMoves}
• Tasdiqlangan: ${this.isVerified ? '✅' : '❌'}

🛡️ Visitor muvaffaqiyatli bloklandi.
    `.trim();
    
    await this.sendToTelegram(message);
  }
  
  getVisitedPages() {
    const pages = JSON.parse(sessionStorage.getItem('visited_pages') || '[]');
    if (!pages.includes(window.location.pathname)) {
      pages.push(window.location.pathname);
      sessionStorage.setItem('visited_pages', JSON.stringify(pages));
    }
    return pages;
  }
  
  checkActivity() {
    const currentPage = window.location.pathname;
    const pages = this.getVisitedPages();
    
    // Agar 5 daqiqada 10 dan ortiq sahifaga o'tsa
    if (pages.length > 10) {
      this.sendWarning('⚠️ Juda tez sahifa o\'zgartirish (bot belgisi)');
    }
    
    // Faollik hisobotini yuborish
    if (this.activities.length > 0) {
      this.sendActivityUpdate();
    }
  }
  
  async sendToTelegram(message) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: this.CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })
        }
      );
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Telegram xatosi:', error);
      // Offline saqlash
      const failedMessages = JSON.parse(localStorage.getItem('failed_messages') || '[]');
      failedMessages.push({
        message: message,
        timestamp: Date.now()
      });
      localStorage.setItem('failed_messages', JSON.stringify(failedMessages));
    }
  }
}

// Offline xabarlarni yuborish
async function sendFailedMessages() {
  const failedMessages = JSON.parse(localStorage.getItem('failed_messages') || '[]');
  if (failedMessages.length > 0 && navigator.onLine) {
    // Bu yerda offline xabarlarni yuborish kodini qo'shish mumkin
    localStorage.removeItem('failed_messages');
  }
}

// Tizimni ishga tushirish
document.addEventListener('DOMContentLoaded', function() {
  // Faqat bir marta ishga tushirish
  if (!window.visitorMonitor) {
    window.visitorMonitor = new AdvancedVisitorMonitor();
    
    // Offline xabarlarni tekshirish
    setInterval(sendFailedMessages, 60000);
  }
});

// IP ni saqlash
fetch('https://api.ipify.org?format=json')
  .then(res => res.json())
  .then(data => {
    localStorage.setItem('last_ip', data.ip);
  })
  .catch(() => {
    localStorage.setItem('last_ip', 'unknown');
  });

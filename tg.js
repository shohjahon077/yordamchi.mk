// public/js/telegram-tracker.js
document.addEventListener('DOMContentLoaded', function() {
  // Sizning bot token va chat ID
  const BOT_TOKEN = '8055090268:AAHtu9cy9lnZw_GFZqo8mc860Bj9G3H7vOU';
  const CHAT_ID = '8136720315';
  
  // Sayt ma'lumotlari
  const pageInfo = {
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer || 'Direct',
    timestamp: new Date().toISOString(),
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    userAgent: navigator.userAgent
  };
  
  // IP olish
  fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(ipData => {
      pageInfo.ip = ipData.ip;
      
      // Telegramga xabar yuborish
      sendToTelegram(pageInfo);
    })
    .catch(() => {
      pageInfo.ip = 'Noma\'lum';
      sendToTelegram(pageInfo);
    });
  
  function sendToTelegram(data) {
    const message = `
🌐 *Yangi Tashrif*
🕐 *Vaqt:* ${new Date().toLocaleString('uz-UZ')}
📄 *Sahifa:* ${data.url}
🔗 *Path:* ${data.path}
📱 *Device:* ${getDeviceType()}
🌍 *IP:* ${data.ip}
🏳️ *Til:* ${data.language}
📊 *Ekran:* ${data.screen}
🔄 *Referrer:* ${data.referrer}
    `.trim();
    
    // Telegram API ga so'rov
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    }).catch(error => {
      console.error('Telegram xatosi:', error);
    });
  }
  
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) return '📱 Mobil';
    if (/Tablet/i.test(ua)) return '📟 Planshet';
    return '💻 Kompyuter';
  }
});

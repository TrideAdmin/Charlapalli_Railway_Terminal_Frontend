const fs = require('fs');
const path = require('path');

const emojiMap = {
  '🚂': 'train-front',
  '🗺': 'map', '🗺️': 'map',
  '♿': 'accessibility',
  '🔐': 'lock',
  '🍽': 'utensils', '🍽️': 'utensils',
  '📶': 'signal-high',
  '🛏': 'bed', '🛏️': 'bed',
  '🚻': 'users',
  '🚌': 'bus-front',
  '🔒': 'shield-check',
  '📢': 'megaphone',
  '🛵': 'bike',
  '🚗': 'car-front',
  '⚠': 'alert-triangle', '⚠️': 'alert-triangle',
  '☁': 'cloud', '☁️': 'cloud',
  '☀': 'sun', '☀️': 'sun',
  '⛅': 'cloud-sun',
  '🌫': 'cloud-fog', '🌫️': 'cloud-fog',
  '🌧': 'cloud-rain', '🌧️': 'cloud-rain',
  '❄': 'snowflake', '❄️': 'snowflake',
  '🌦': 'cloud-drizzle', '🌦️': 'cloud-drizzle',
  '⛈': 'cloud-lightning', '⛈️': 'cloud-lightning',
  '📍': 'map-pin',
  '📞': 'phone',
  '👮': 'shield',
  '🏥': 'hospital',
  '🕐': 'clock',
  '✅': 'check-circle',
  '❌': 'x-circle',
  '🛡': 'shield', '🛡️': 'shield',
  '📡': 'radio',
  '🖥': 'monitor', '🖥️': 'monitor',
  '🔌': 'plug',
  '📋': 'clipboard',
  '🏧': 'landmark',
  '🎫': 'ticket',
  '🧳': 'luggage',
  '📅': 'calendar',
  '💧': 'droplet',
  '🍔': 'sandwich',
  '🛒': 'shopping-cart',
  '🛗': 'arrow-up-down',
  '🅿': 'circle-parking', '🅿️': 'circle-parking',
  '🚕': 'car-taxi-front',
  '📦': 'package',
  '💺': 'armchair',
  '🚶': 'footprints',
  '🔍': 'search',
  '👶': 'baby',
  '🔋': 'battery',
  '🔗': 'link',
  '👩': 'user',
  '👨': 'user',
  '🔑': 'key',
  '🧭': 'compass',
  '🎯': 'target',
  '🚉': 'train-track',
  '🚪': 'door-open',
  '🔄': 'refresh-cw',
  '📹': 'video',
  '🔬': 'microscope',
  '🆘': 'life-buoy',
  '🔥': 'flame',
  '🚓': 'shield-alert',
  '🚫': 'ban',
  '📱': 'smartphone'
};

const dir = 'c:/Users/neeso/Downloads/CT_Enhanced_Decoupled/CT_Enhanced_Decoupled/frontend';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        walk(fullPath);
      }
    } else if (fullPath.endsWith('.html') || fullPath.endsWith('layout.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Special manual replacement for layout.js weather array so it doesn't break
      if (fullPath.endsWith('layout.js')) {
        content = content.replace("icon = '☁️'", "icon = 'cloud'");
        content = content.replace("icon = '☀️'", "icon = 'sun'");
        content = content.replace("icon = '⛅'", "icon = 'cloud-sun'");
        content = content.replace("icon = '🌫️'", "icon = 'cloud-fog'");
        content = content.replace("icon = '🌧️'", "icon = 'cloud-rain'");
        content = content.replace("icon = '❄️'", "icon = 'snowflake'");
        content = content.replace("icon = '🌦️'", "icon = 'cloud-drizzle'");
        content = content.replace("icon = '⛈️'", "icon = 'cloud-lightning'");
        
        content = content.replace("wi.textContent = icon", "wi.innerHTML = `<i data-lucide=\"${icon}\" style=\"width:18px;height:18px;\"></i>`; if(window.lucide) lucide.createIcons({root: wi});");
      }

      // Add script to HTML files if not present
      if (fullPath.endsWith('.html')) {
         if (!content.includes('unpkg.com/lucide')) {
             content = content.replace('</body>', '  <script src="https://unpkg.com/lucide@latest"></script>\n  <script>lucide.createIcons();</script>\n</body>');
         }
      }

      let changed = false;
      for (const [emoji, iconName] of Object.entries(emojiMap)) {
        if (content.includes(emoji)) {
          const regex = new RegExp(escapeRegExp(emoji), 'g');
          content = content.replace(regex, `<i data-lucide="${iconName}"></i>`);
          changed = true;
        }
      }

      if (changed || fullPath.endsWith('.html') || fullPath.endsWith('layout.js')) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
      }
    }
  }
}

walk(dir);
console.log('Done replacing emojis.');

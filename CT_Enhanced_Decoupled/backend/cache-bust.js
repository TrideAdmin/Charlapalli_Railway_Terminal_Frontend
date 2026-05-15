const fs = require('fs');
const path = require('path');

function updateHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      updateHtmlFiles(fullPath);
    } else if (fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('src="/js/chatbot.js')) {
        content = content.replace(/src="\/js\/chatbot\.js[^"]*"/g, 'src="/js/chatbot.js?' + Date.now() + '"');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated ' + fullPath);
      }
    }
  }
}

updateHtmlFiles(path.join(__dirname, '..', 'frontend'));

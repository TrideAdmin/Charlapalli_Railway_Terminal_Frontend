const fs = require('fs');
const path = require('path');

const emojis = new Set();
const dir = 'c:/Users/neeso/Downloads/CT_Enhanced_Decoupled/CT_Enhanced_Decoupled/frontend';

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        walk(fullPath);
      }
    } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Match all emoji ranges, including miscellaneous symbols
      const regex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/gu;
      const matches = content.match(regex);
      if (matches) {
        matches.forEach(m => emojis.add(m));
      }
    }
  }
}

walk(dir);
console.log('Found emojis:', Array.from(emojis));

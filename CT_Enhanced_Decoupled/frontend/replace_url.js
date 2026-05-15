const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/neeso/Downloads/CT_Enhanced_Decoupled/CT_Enhanced_Decoupled/frontend';
const targetString = 'https://charlapalli-railway-terminal-api.tride.live';
const replacementString = 'https://charlapalli-railway-terminal-api.tride.live';

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        walk(fullPath);
      }
    } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(targetString)) {
        content = content.split(targetString).join(replacementString);
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
      }
    }
  }
}

walk(dir);
console.log('Done replacing backend URL.');

const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');
const oldApiUrl = 'http://localhost:3001/api';
const newApiUrl = 'https://charlapalli-railway-terminal-api.tride.live/api';

function walkAndReplace(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkAndReplace(fullPath);
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(oldApiUrl)) {
                content = content.split(oldApiUrl).join(newApiUrl);
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated API link in ${fullPath}`);
            }
        }
    }
}

walkAndReplace(frontendDir);
console.log('Done replacing API links.');

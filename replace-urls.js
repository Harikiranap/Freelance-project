const fs = require('fs');
const path = require('path');

function replaceInFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInFiles(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // For socket.io: io('http://localhost:5000') -> io(import.meta.env.VITE_API_URL || 'http://localhost:5000')
            content = content.replace(/io\(['"]http:\/\/localhost:5000['"]\)/g, "io(import.meta.env.VITE_API_URL || 'http://localhost:5000')");
            
            // For axios default URL fallback
            content = content.replace(/axios\.post\(['"]http:\/\/localhost:5000/g, "axios.post(import.meta.env.VITE_API_URL + '");
            content = content.replace(/axios\.get\(['"]http:\/\/localhost:5000/g, "axios.get(import.meta.env.VITE_API_URL + '");
            content = content.replace(/axios\.put\(['"]http:\/\/localhost:5000/g, "axios.put(import.meta.env.VITE_API_URL + '");
            content = content.replace(/axios\.delete\(['"]http:\/\/localhost:5000/g, "axios.delete(import.meta.env.VITE_API_URL + '");
            content = content.replace(/axios\.patch\(['"]http:\/\/localhost:5000/g, "axios.patch(import.meta.env.VITE_API_URL + '");

            // For template literals: `http://localhost:5000/api/...` -> `${import.meta.env.VITE_API_URL}/api/...`
            content = content.replace(/`http:\/\/localhost:5000/g, "`${import.meta.env.VITE_API_URL}");
            
            // Fallback for any other lingering occurrences of http://localhost:5000 as a base URL in quotes
            // like 'http://localhost:5000/api/...' -> import.meta.env.VITE_API_URL + '/api/...'
            content = content.replace(/'http:\/\/localhost:5000([^']*)'/g, "import.meta.env.VITE_API_URL + '$1'");
            content = content.replace(/"http:\/\/localhost:5000([^"]*)"/g, 'import.meta.env.VITE_API_URL + "$1"');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    }
}

console.log('Starting replacement...');
replaceInFiles('./frontend/src');
console.log('Done.');

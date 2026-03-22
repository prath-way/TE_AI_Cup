const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Asus/OneDrive/Desktop/TE';
const files = fs.readdirSync(dir).filter(f => f.startsWith('api_response_') && f.endsWith('.json'));

console.log(`Found ${files.length} JSON files.`);

files.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        const json = JSON.parse(content);
        const size = content.length;
        const keys = Array.isArray(json) ? `Array[${json.length}]` : Object.keys(json).join(', ');
        
        console.log(`\n📄 ${file} (${size} bytes):`);
        console.log(`   Keys: ${keys.substring(0, 100)}...`);
        
        if (Array.isArray(json) && json.length > 0) {
            console.log(`   Sample: ${JSON.stringify(json[0]).substring(0, 100)}...`);
        }
    } catch (e) {
        console.log(`\n❌ Error reading ${file}: ${e.message}`);
    }
});

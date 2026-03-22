const fs = require('fs');
const data = JSON.parse(fs.readFileSync('iaa_api_candidate.json', 'utf8'));
console.log(`Total Count reported: ${data.count}`);
console.log(`Entities in file: ${data.entities.length}`);

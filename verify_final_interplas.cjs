const fs = require('fs');

try {
    const raw = fs.readFileSync('interplas_data_final.json', 'utf8');
    const data = JSON.parse(raw);
    
    console.log(`Verifying ${data.length} records...`);
    
    let hasName = 0;
    let hasStand = 0;
    
    data.forEach(item => {
        if (item.name) hasName++;
        if (item.stand) hasStand++;
    });
    
    console.log(`Has Name: ${hasName}`);
    console.log(`Has Stand: ${hasStand}`);
    
    if (data.length > 0) {
        console.log("Sample:", data[0]);
    }
    
} catch (e) {
    console.error(e);
}

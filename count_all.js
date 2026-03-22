
import fs from 'fs';

const files = [
    { name: 'Plastindia (companies_full.json)', path: 'companies_full.json' },
    { name: 'IMTEX (imtex_companies_simple.json)', path: 'imtex_companies_simple.json' },
    { name: 'PlastEurasia (plasteurasia_data.json)', path: 'plasteurasia_data.json' },
    { name: 'K-Online (k_online_data.json)', path: 'k_online_data.json' },
    { name: 'ArabPlast (arabplast_data.json)', path: 'arabplast_data.json' },
    // Checking for Chinaplas files
    { name: 'Chinaplas Final (chinaplas_exhibitors_final.json)', path: 'chinaplas_exhibitors_final.json' }
];

let grandTotal = 0;

console.log("📊 Company Data Analysis:\n");

files.forEach(file => {
    try {
        if (fs.existsSync(file.path)) {
            const data = fs.readFileSync(file.path, 'utf8');
            const json = JSON.parse(data);
            
            let count = 0;
            if (Array.isArray(json)) {
                count = json.length;
            } else if (json.data && json.data.body && json.data.body.result && json.data.body.result.items) {
                 // Handle raw API response structure if present
                 count = json.data.body.result.items.length;
            }

            console.log(`✅ ${file.name}: ${count.toLocaleString()} companies`);
            grandTotal += count;
        } else {
            console.log(`❌ ${file.name}: File not found`);
        }
    } catch (e) {
        console.log(`⚠️ ${file.name}: Error reading file - ${e.message}`);
    }
});

console.log(`\n🏆 GRAND TOTAL: ${grandTotal.toLocaleString()} companies`);

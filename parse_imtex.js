import fs from "fs";

console.log("🔄 Parsing IMTEX exhibitor data...\n");

// Read the raw data
const rawData = JSON.parse(fs.readFileSync('imtex_raw_data.json', 'utf-8'));

const companies = [];

// Skip the first entry (header row)
for (let i = 1; i < rawData.companies.length; i++) {
    const item = rawData.companies[i];
    const text = item.companyName;
    
    // Split by actual newlines (not escaped)
    const parts = text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
    
    if (parts.length >= 4) {
        const company = {
            slNo: parts[0],
            companyName: parts[1],
            hallNo: parts[2],
            stallNo: parts[3],
            country: parts[4] || '',
            website: parts[5] || ''
        };
        
        companies.push(company);
    }
}

// Save cleaned data
fs.writeFileSync('imtex_companies.json', JSON.stringify(companies, null, 2));

console.log(`✅ Parsed ${companies.length} companies`);
console.log(`📄 Saved to imtex_companies.json\n`);

// Show sample
console.log("Sample companies:");
console.log(JSON.stringify(companies.slice(0, 5), null, 2));

console.log(`\n📊 Summary:`);
console.log(`Total Companies: ${companies.length}`);
console.log(`Companies with websites: ${companies.filter(c => c.website).length}`);

// Get unique countries
const countries = [...new Set(companies.map(c => c.country).filter(c => c))];
console.log(`Countries: ${countries.length}`);
console.log(`Country list: ${countries.join(', ')}`);

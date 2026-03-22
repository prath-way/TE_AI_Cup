const fs = require('fs');

try {
    if (!fs.existsSync('interplas_full_raw.json')) {
        console.log("File interplas_full_raw.json not found yet.");
        process.exit(0);
    }
    
    const raw = fs.readFileSync('interplas_full_raw.json', 'utf8');
    const categories = JSON.parse(raw);
    
    console.log(`Loaded ${categories.length} category results.`);
    
    let allExhibitors = [];
    let samplePrinted = false;
    
    categories.forEach(cat => {
        if (cat.exhibitors && Array.isArray(cat.exhibitors)) {
            cat.exhibitors.forEach(ex => {
                if (!samplePrinted) {
                    console.log("Sample Exhibitor Keys:", Object.keys(ex));
                    console.log("Sample Exhibitor Data:", JSON.stringify(ex, null, 2));
                    samplePrinted = true;
                }
                allExhibitors.push(ex);
            });
        }
    });
    
    // Deduplicate
    const unique = new Map();
    allExhibitors.forEach(ex => {
        const id = ex.id || ex.uuid || ex.name; // Fallback
        if (!unique.has(id)) {
            unique.set(id, ex);
        }
    });
    
    console.log(`Total found: ${allExhibitors.length}`);
    console.log(`Unique exhibitors: ${unique.size}`);
    
    // Save unique
    const finalData = Array.from(unique.values());
    fs.writeFileSync('interplas_data_final.json', JSON.stringify(finalData, null, 2));
    
} catch (e) {
    console.error(e);
}

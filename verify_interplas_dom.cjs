const fs = require('fs');

try {
    if (!fs.existsSync('interplas_dom_raw.json')) {
        console.log("File interplas_dom_raw.json not found yet.");
        process.exit(0);
    }
    
    const raw = fs.readFileSync('interplas_dom_raw.json', 'utf8');
    const categories = JSON.parse(raw);
    
    console.log(`Loaded ${categories.length} category results.`);
    
    let allExhibitors = [];
    
    categories.forEach(cat => {
        if (cat.exhibitors && Array.isArray(cat.exhibitors)) {
            cat.exhibitors.forEach(ex => {
                // Add category info to exhibitor for debugging/tagging
                allExhibitors.push({
                    ...ex,
                    category: cat.category
                });
            });
        }
    });
    
    // Deduplicate by Name (since we don't have ID in DOM usually, unless we extracted link)
    const unique = new Map();
    allExhibitors.forEach(ex => {
        const key = ex.name; 
        if (!unique.has(key)) {
            unique.set(key, ex);
        } else {
            // Merge categories?
            // Optional
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

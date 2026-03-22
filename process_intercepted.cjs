const fs = require('fs');

try {
    if (!fs.existsSync('interplas_intercepted.json')) {
        console.log("No intercepted data file found.");
        process.exit(1);
    }
    
    const raw = fs.readFileSync('interplas_intercepted.json', 'utf8');
    const capturedData = JSON.parse(raw);
    
    console.log(`Processing ${capturedData.length} captured responses.`);
    
    const exhibitorsMap = new Map();
    
    capturedData.forEach((res, index) => {
        let items = [];
        // Handle varied structures
        if (Array.isArray(res.data)) {
            items = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
            items = res.data.data;
        } else if (res.data && res.data.list && Array.isArray(res.data.list)) {
             items = res.data.list;
        }
        
        console.log(`Response ${index}: Found ${items.length} items.`);
        
        items.forEach(item => {
            // Identifier: ID or Name
            const id = item.id || item.name;
            if (id && !exhibitorsMap.has(id)) {
                exhibitorsMap.set(id, {
                    name: item.name,
                    id: item.id,
                    stand: item.stand || (item.stand_number ? item.stand_number : null),
                    hall: item.hall,
                    website: item.website || item.url,
                    logo: item.logo,
                    description: item.description
                });
            }
        });
    });
    
    const finalData = Array.from(exhibitorsMap.values());
    console.log(`Total Unique Exhibitors: ${finalData.length}`);
    
    fs.writeFileSync('interplas_data_final.json', JSON.stringify(finalData, null, 2));
    console.log("Saved to interplas_data_final.json");
    
} catch (e) {
    console.error(e);
}

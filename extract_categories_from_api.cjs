const fs = require('fs');

try {
    const raw = fs.readFileSync('captured_api_1770400698938.json', 'utf8');
    const data = JSON.parse(raw);
    
    if (data.data && data.data.list && data.data.list.business_area) {
        const categories = data.data.list.business_area.map(item => ({
            id: item.id,
            name: item.name,
            parent: item.parent
        }));
        
        console.log(`Extracted ${categories.length} categories.`);
        fs.writeFileSync('categories.json', JSON.stringify(categories, null, 2));
    } else {
        console.error("Structure mismatch in captured API file.");
    }
} catch (e) {
    console.error(e);
}

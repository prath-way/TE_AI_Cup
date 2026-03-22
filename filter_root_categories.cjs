const fs = require('fs');

try {
    const raw = fs.readFileSync('categories.json', 'utf8');
    const categories = JSON.parse(raw);
    
    // Filter root categories (parent === null or undefined)
    const rootCategories = categories.filter(c => !c.parent || c.parent === null);
    
    console.log(`Found ${rootCategories.length} root categories out of ${categories.length}.`);
    rootCategories.forEach(c => console.log(` - ${c.name} (${c.id})`));
    
    fs.writeFileSync('categories_root.json', JSON.stringify(rootCategories, null, 2));
    
} catch (e) {
    console.error(e);
}

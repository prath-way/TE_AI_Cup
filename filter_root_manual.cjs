const fs = require('fs');

try {
    const raw = fs.readFileSync('categories.json', 'utf8');
    const categories = JSON.parse(raw);
    
    const knownRoots = [
        "Materials", 
        "Digital Tech", 
        "Manufacturing Technology", 
        "Electronics and Components", 
        "Services", 
        "Software"
    ];
    
    const rootCategories = categories.filter(c => knownRoots.includes(c.name));
    
    console.log(`Found ${rootCategories.length} root categories.`);
    rootCategories.forEach(c => console.log(` - ${c.name} (${c.id})`));
    
    fs.writeFileSync('categories_root.json', JSON.stringify(rootCategories, null, 2));
    
} catch (e) {
    console.error(e);
}

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    try {
        // Load categories
        const categories = JSON.parse(fs.readFileSync('categories.json', 'utf8'));
        console.log(`Loaded ${categories.length} categories.`);

        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768']
        });
        const page = await browser.newPage();
        
        console.log("Navigating to Interplas Exhibitor List...");
        await page.goto('https://interplasuk.com/newfront/marketplace/exhibitors', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        // Wait a bit for auth headers to settle
        await new Promise(r => setTimeout(r, 5000));

        console.log("Starting batch fetch in browser context...");

        // Inject categories and run fetch loop
        const allData = await page.evaluate(async (categories) => {
            const results = [];
            const eventId = 276; 
            const baseUrl = `https://api-rng.expoplatform.com/api/v1/search/exhibitors`;
            
            const delay = ms => new Promise(r => setTimeout(r, ms));
            
            for (let i = 0; i < categories.length; i++) {
                const cat = categories[i];
                // Update progress in console (visible in browser console if headful)
                console.log(`Fetching ${i+1}/${categories.length}: ${cat.name}`);
                
                try {
                    // Try page 1 with limit 200 to get max
                    const url = `${baseUrl}?event_id=${eventId}&business_area=${cat.id}&page=1&limit=200`;
                    
                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/json',
                            // Add any custom headers if found in storage? 
                            // Usually cookies are sent automatically.
                        }
                    });
                     // Log status for debugging (returned in error obj if needed)
                    
                    if (response.ok) {
                        const json = await response.json();
                        // Adjust based on actual structure. Test API error logs showed top level data array?
                        // captured_api showed "data": { ... } structure. 
                        // exhibitors endpoint usually returns { data: [...] } or { data: { data: [...] } }
                        
                        let items = [];
                        if (Array.isArray(json.data)) items = json.data;
                        else if (json.data && Array.isArray(json.data.data)) items = json.data.data;
                        
                        results.push({
                            categoryId: cat.id,
                            categoryName: cat.name,
                            exhibitors: items,
                            total: items.length
                        });
                    } else {
                        results.push({
                            categoryId: cat.id,
                            categoryName: cat.name,
                            error: `Status ${response.status}`
                        });
                    }
                } catch (e) {
                    results.push({
                        categoryId: cat.id,
                        categoryName: cat.name,
                        error: e.toString()
                    });
                }
                
                // Random delay between 500ms and 1500ms
                await delay(500 + Math.random() * 1000);
            }
            return results;
        }, categories);

        console.log(`Scraping complete. Processed ${allData.length} categories.`);
        
        // Save to file
        fs.writeFileSync('interplas_full_raw.json', JSON.stringify(allData, null, 2));
        console.log("Saved data to interplas_full_raw.json");
        
        await browser.close();
        
    } catch (e) {
        console.error("Scraper Error:", e);
    }
})();

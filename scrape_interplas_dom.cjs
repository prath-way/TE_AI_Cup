const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    try {
        const categories = JSON.parse(fs.readFileSync('categories_root.json', 'utf8'));
        console.log(`Loaded ${categories.length} categories.`);

        const browser = await puppeteer.launch({
            headless: false,
            args: ['--window-size=1366,768']
        });
        const page = await browser.newPage();
        
        console.log("Navigating...");
        await page.goto('https://interplasuk.com/newfront/marketplace/exhibitors', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        // Wait for accordion and expand
        const accordionSelector = "h5[title='Product Categories']";
        await page.waitForSelector(accordionSelector, { timeout: 15000 });
        await page.click(accordionSelector);
        
        // Wait for checkboxes
        await new Promise(r => setTimeout(r, 2000));
        
        const allData = [];
        
        for (let i = 0; i < categories.length; i++) {
        //for (let i = 0; i < 5; i++) { // Test with first 5
            const cat = categories[i];
            console.log(`Processing ${i+1}/${categories.length}: ${cat.name}`);
            
            try {
                // Find checkbox by label content
                const clicked = await page.evaluate(async (catName) => {
                    const labels = Array.from(document.querySelectorAll('.MuiCollapse-root label'));
                    const targetLabel = labels.find(l => l.innerText.trim() === catName || l.innerText.includes(catName));
                    
                    if (targetLabel) {
                        const input = targetLabel.querySelector('input');
                        if (input) {
                            if (!input.checked) input.click();
                            return true;
                        } else {
                            // Click the label itself if input not found directly
                            targetLabel.click();
                            return true;
                        }
                    }
                    return false;
                }, cat.name);
                
                if (clicked) {
                    // Wait for results to load
                    await new Promise(r => setTimeout(r, 3000));
                    
                    // Extract data
                    const exhibitors = await page.evaluate(() => {
                        const cards = document.querySelectorAll('[data-link*="/newfront/exhibitor/"], div[class*="MuiCard-root"]');
                        const data = [];
                        cards.forEach(card => {
                            const nameElem = card.querySelector('h5, h6, .MuiTypography-h6');
                            const linkElem = card.closest('a') || card.querySelector('a');
                            const locElem = card.innerText.match(/Stand\s*:\s*([A-Z0-9]+)/i);
                            
                            if (nameElem) {
                                data.push({
                                    name: nameElem.innerText.trim(),
                                    link: linkElem ? linkElem.href : null,
                                    stand: locElem ? locElem[1] : null
                                });
                            }
                        });
                        return data;
                    });
                    
                    console.log(`  Found ${exhibitors.length} exhibitors.`);
                    
                    allData.push({
                        category: cat.name,
                        categoryId: cat.id,
                        exhibitors: exhibitors
                    });
                    
                    // Unclick
                    await page.evaluate(async (catName) => {
                        const labels = Array.from(document.querySelectorAll('.MuiCollapse-root label'));
                        const targetLabel = labels.find(l => l.innerText.trim() === catName || l.innerText.includes(catName));
                         if (targetLabel) {
                            const input = targetLabel.querySelector('input');
                            if (input && input.checked) input.click();
                            else targetLabel.click();
                        }
                    }, cat.name);
                    
                    await new Promise(r => setTimeout(r, 1000)); // Wait for clear
                } else {
                    console.log(`  Category checkbox not found for ${cat.name}`);
                }
                
            } catch (e) {
                console.error(`  Error processing ${cat.name}:`, e);
            }
        }
        
        fs.writeFileSync('interplas_dom_raw.json', JSON.stringify(allData, null, 2));
        console.log("Done. Saved to interplas_dom_raw.json");
        
        await browser.close();
        
    } catch (e) {
        console.error("Critical Error:", e);
    }
})();

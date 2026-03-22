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
        
        let capturedData = [];
        
        // Setup interception listener
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('search/exhibitors') && response.request().method() === 'GET') {
                console.log(`Captured response from: ${url}`);
                try {
                    const json = await response.json();
                    if (json.data) {
                        // Determine category context (simplified: we assign to current loop, but parallel requests might mix)
                        // Best to process explicitly. 
                        // But here we just push everything.
                        console.log(`Captured ${json.data.length || (json.data.data ? json.data.data.length : 0)} items.`);
                        capturedData.push(json); // Store raw for now
                    }
                } catch (e) {
                    // ignore preflight or non-json
                }
            }
        });

        console.log("Navigating...");
        await page.goto('https://interplasuk.com/newfront/marketplace/exhibitors', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        const accordionSelector = "h5[title='Product Categories']";
        await page.waitForSelector(accordionSelector, { timeout: 15000 });
        await page.click(accordionSelector);
        await new Promise(r => setTimeout(r, 2000));

        for (const cat of categories) {
            console.log(`Processing: ${cat.name} (${cat.id})`);
            
            // Click Label to filter
            const success = await page.evaluate(async (catName) => {
                const labels = Array.from(document.querySelectorAll('.MuiCollapse-root label'));
                const targetLabel = labels.find(l => l.innerText.trim() === catName || l.innerText.includes(catName));
                if (targetLabel) {
                    if (!targetLabel.querySelector('input').checked) {
                        targetLabel.click();
                        return true;
                    }
                }
                return false;
            }, cat.name);
            
            if (success) {
                // Wait for network response (handled by listener)
                await new Promise(r => setTimeout(r, 4000));
                
                // Deselect
                 await page.evaluate(async (catName) => {
                    const labels = Array.from(document.querySelectorAll('.MuiCollapse-root label'));
                    const targetLabel = labels.find(l => l.innerText.trim() === catName || l.innerText.includes(catName));
                    if (targetLabel && targetLabel.querySelector('input').checked) {
                        targetLabel.click();
                    }
                }, cat.name);
                await new Promise(r => setTimeout(r, 2000));
            } else {
                console.log(`Label for ${cat.name} not found or already checked.`);
            }
        }
        
        console.log(`Finished. captured ${capturedData.length} JSON responses.`);
        fs.writeFileSync('interplas_intercepted.json', JSON.stringify(capturedData, null, 2));
        
        await browser.close();
        
    } catch (e) {
        console.error("Error:", e);
    }
})();

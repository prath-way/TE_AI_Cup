const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    try {
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

        // Click Accordion
        const accordionSelector = "h5[title='Product Categories']";
        await page.waitForSelector(accordionSelector, { timeout: 15000 });
        await page.click(accordionSelector);
        
        // Wait for checkboxes
        await new Promise(r => setTimeout(r, 2000));
        
        // Click "Materials" (known root)
        const catName = "Materials";
        console.log(`Clicking ${catName}...`);
        
        const clicked = await page.evaluate(async (catName) => {
            const labels = Array.from(document.querySelectorAll('.MuiCollapse-root label'));
            const targetLabel = labels.find(l => l.innerText.trim() === catName || l.innerText.includes(catName));
            
            if (targetLabel) {
                targetLabel.click();
                return true;
            }
            return false;
        }, catName);
        
        if (clicked) {
            console.log("Clicked! Waiting for results...");
            await new Promise(r => setTimeout(r, 8000)); // Long wait
            
            // Dump HTML
            const html = await page.content();
            fs.writeFileSync('interplas_dom_dump.html', html);
            console.log("Saved dump to interplas_dom_dump.html");
             
             // Try to extract card count
            const cardCount = await page.evaluate(() => {
                 return document.querySelectorAll('[data-link*="/newfront/exhibitor/"]').length;
            });
            console.log(`Dom probe found ${cardCount} cards with data-link.`);
            
        } else {
            console.log("Failed to click.");
        }
        
        await browser.close();
        
    } catch (e) {
        console.error("Error:", e);
    }
})();

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
        
        console.log("Navigating to IAA Transportation...");
        await page.goto('https://exhibitors.iaa-transportation.com/showfloor/organizations', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        // Wait for potential content
        await new Promise(r => setTimeout(r, 5000));
        
        // Dump HTML
        const html = await page.content();
        fs.writeFileSync('iaa_dump.html', html);
        console.log("Saved dump to iaa_dump.html");
        
        // Screenshot
        await page.screenshot({ path: 'iaa_screenshot.png' });
        
        await browser.close();
        
    } catch (e) {
        console.error("Error:", e);
    }
})();

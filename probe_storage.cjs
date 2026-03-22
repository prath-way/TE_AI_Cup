const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--window-size=1366,768']
    });
    const page = await browser.newPage();
    
    console.log("Navigating...");
    await page.goto('https://interplasuk.com/newfront/marketplace/exhibitors', { waitUntil: 'networkidle2' });
    
    // Wait for everything to settle
    await new Promise(r => setTimeout(r, 5000));
    
    const storage = await page.evaluate(() => {
        return {
            local: {...localStorage},
            session: {...sessionStorage},
            cookies: document.cookie
        };
    });
    
    console.log("LocalStorage keys:", Object.keys(storage.local));
    console.log("SessionStorage keys:", Object.keys(storage.session));
    
    // Look for token in values
    for (const [key, val] of Object.entries(storage.local)) {
        if (val.includes('token') || val.length > 100) {
            console.log(`Possible token in LocalStorage [${key}]:`, val.substring(0, 50) + "...");
        }
    }
    for (const [key, val] of Object.entries(storage.session)) {
        console.log(`SessionStorage [${key}]:`, val.substring(0, 50) + "...");
    }
    
    await browser.close();
})();

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--window-size=1366,768']
    });
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);
    
    page.on('request', request => {
        if (request.url().includes('api-rng.expoplatform.com/api/v1/search/exhibitors')) {
            console.log("Captured Request URL:", request.url());
            console.log("Captured Request Headers:", JSON.stringify(request.headers(), null, 2));
        }
        request.continue();
    });

    console.log("Navigating...");
    await page.goto('https://interplasuk.com/newfront/marketplace/exhibitors', { waitUntil: 'networkidle2' });
    
    // Wait for everything to settle
    await new Promise(r => setTimeout(r, 5000));
    
    // Attempt to click a category to trigger the request
    console.log("Clicking Product Categories...");
    try {
        const selector = "h5[title='Product Categories']";
        await page.waitForSelector(selector, { timeout: 10000 });
        await page.click(selector);
        
        // Wait for checkboxes to appear
        await new Promise(r => setTimeout(r, 2000));
        
        // Click the first checkbox if possible
        const cbSelector = '.MuiCollapse-root input[type="checkbox"]';
        await page.waitForSelector(cbSelector, { timeout: 5000 });
        const cbs = await page.$$(cbSelector);
        if (cbs.length > 0) {
             console.log("Clicking first category checkbox...");
             await cbs[0].click();
        }
    } catch(e) {
        console.error("Interaction error:", e);
    }

    // Wait for requests to happen
    await new Promise(r => setTimeout(r, 10000));
    
    await browser.close();
})();

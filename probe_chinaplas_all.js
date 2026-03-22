
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 Launching Broad Chinaplas Probe...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
    });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    
    page.on('request', request => {
        const type = request.resourceType();
        if (type === 'xhr' || type === 'fetch') {
            console.log(`📡 [${request.method()}] ${request.url()}`);
        }
        request.continue();
    });

    try {
        console.log("globe Navigating to Exhibitor List...");
        // Try the base URL, maybe redirection happens
        await page.goto('https://www.chinaplasonline.com/eMarketplace/allexhibitors/eng/', { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("⏳ Waiting...");
        await new Promise(r => setTimeout(r, 10000));

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

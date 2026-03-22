
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 Launching ThomasNet Interactive Scraper...");
    console.log("⚠️  PLEASE SOLVE THE CAPTCHA IN THE BROWSER WINDOW IF IT APPEARS!");

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: null
    });
    
    const page = await browser.newPage();

    try {
        const searchUrl = 'https://www.thomasnet.com/nsearch.html?cov=NA&heading=96100609&what=Plastics%3A+Injection+Molding'; 
        console.log(`Navigating to: ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 0 }); // No timeout
        
        console.log("⏳ Waiting 60 seconds for you to solve Captcha and content to load...");
        
        // Wait for specific element usually present on results page, or just time
        try {
            // Using a generic wait to allow manual interaction
             await new Promise(r => setTimeout(r, 60000));
        } catch (e) {}

        console.log("📸 Saving page content...");
        const html = await page.content();
        fs.writeFileSync('thomasnet_interactive_dump.html', html);
        console.log("💾 Saved HTML to thomasnet_interactive_dump.html");
        
        await page.screenshot({ path: 'thomasnet_interactive.png' });
        console.log("📸 Saved screenshot.");

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

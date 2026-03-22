
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

// GlobalSources is a B2B directory. Search for a category to find lists of companies.
const BASE_URL = "https://www.globalsources.com/";

async function probe() {
    console.log("🚀 Starting Global Sources Probe (Debug Mode)...");
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true, // Try headless
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        console.log("📱 Browser launched");
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log(`🌐 Navigating to ${BASE_URL}...`);
        try {
            await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log("✅ Navigation successful");
        } catch (navError) {
            console.error("⚠️ Navigation error:", navError.message);
        }
        
        const html = await page.content();
        fs.writeFileSync('globalsources_probe.html', html);
        console.log("💾 HTML saved");
        
        await page.screenshot({ path: 'globalsources_probe.png' });
        console.log("📸 Screenshot saved");

        await browser.close();
    } catch (error) {
        console.error("❌ Fatal Error:", error);
    }
}

probe();

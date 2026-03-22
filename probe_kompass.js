
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const URL = "https://in.kompass.com/searchCompanies?term=plastics"; // Searching for a common industry to get a list

async function probe() {
    console.log("🚀 Starting Kompass Probe...");
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log(`🌐 Navigating to ${URL}...`);
        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("⏳ Waiting...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const html = await page.content();
        fs.writeFileSync('kompass_probe.html', html);
        console.log("💾 HTML saved to kompass_probe.html");
        
        const screenshotPath = 'kompass_probe.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved to ${screenshotPath}`);

        await browser.close();
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (browser) await browser.close();
    }
}

probe();

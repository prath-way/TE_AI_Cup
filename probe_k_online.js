
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const BASE_URL = "https://www.k-online.com/en/Exhibitors_Products";

async function probe() {
    console.log("🚀 Starting K-Online Probe...");
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log(`🌐 Navigating to ${BASE_URL}...`);
        // Trying a likely deep link for exhibitor search
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
        
        // Wait for some content to load
        await new Promise(r => setTimeout(r, 5000));
        
        const html = await page.content();
        fs.writeFileSync('k_online_probe.html', html);
        console.log("💾 HTML saved to k_online_probe.html");
        
        await page.screenshot({ path: 'k_online_probe.png', fullPage: true });
        console.log("📸 Screenshot saved");

        await browser.close();
    } catch (error) {
        console.error("❌ Probe Error:", error.message);
        // If deep link fails, try homepage
        if (error.message.includes('Timeout') || error.message.includes('ERR_')) {
            console.log("Retrying with homepage...");
             if (browser) await browser.close();
             // Retry logic could go here or just fail and let user decide
        }
        if (browser) await browser.close();
    }
}

probe();

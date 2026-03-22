
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const BASE_URL = "https://plasteurasia.com";
// Guessing likely exhibitor list URLs to try
const CANDIDATE_URLS = [
    "https://plasteurasia.com/en/exhibitor-list",
    "https://plasteurasia.com/en/exhibitors",
    "https://plasteurasia.com/exhibitor-list",
    "https://plasteurasia.com/en/" 
];

async function probe() {
    console.log("🚀 Starting PlastEurasia Probe...");
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // Try to find a working URL
        let validUrl = BASE_URL;
        for (const url of CANDIDATE_URLS) {
            console.log(`Checking ${url}...`);
            try {
                const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                if (response.status() === 200) {
                     // specific check to see if it looks like a list
                     const content = await page.content();
                     if (content.toLowerCase().includes('exhibitor') || content.toLowerCase().includes('catalogue')) {
                         console.log(`✅ Valid looking page: ${url}`);
                         validUrl = url;
                         break;
                     }
                }
            } catch (e) {
                console.log(`❌ Failed ${url}`);
            }
        }
        
        console.log(`\n🌐 Navigating to BEST GUESS: ${validUrl} and waiting for network idle...`);
        await page.goto(validUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("⏳ Waiting extra time for dynamic content...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const html = await page.content();
        fs.writeFileSync('plasteurasia_probe.html', html);
        console.log("💾 HTML saved to plasteurasia_probe.html");
        
        await page.screenshot({ path: 'plasteurasia_probe.png', fullPage: true });
        console.log("📸 Screenshot saved");
        
        // Quick console check for links
        const linksCount = await page.evaluate(() => document.querySelectorAll('a').length);
        console.log(`Found ${linksCount} links on page.`);

        await browser.close();
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (browser) await browser.close();
    }
}

probe();

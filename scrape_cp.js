import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const URL = "https://www.chinaplasonline.com/eMarketplace/allexhibitors/eng/";

async function scrapeChina plas() {
    console.log("🚀 Starting CHINAPLAS Scraper...\\n");
    
    let browser;
    try {
        console.log("📱 Launching browser...");
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log("🌐 Navigating to CHINAPLAS exhibitor list...");
        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("⏳ Waiting for page to load...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await page.screenshot({ path: 'chinaplas_screenshot.png', fullPage: true });
        console.log("📸 Screenshot saved");
        
        const html = await page.content();
        fs.writeFileSync('chinaplas_page.html', html);
        console.log("💾 HTML saved");
        
        console.log("\\n🔍 Extracting exhibitor data...");
        
        const exhibitors = await page.evaluate(() => {
            const results = [];
            const selectors = [
                'a[href*="CompanyProfile"]',
                '.exhibitor',
                '[class*="company"]',
                'table tr'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                
                if (elements.length > 0) {
                    elements.forEach((el) => {
                        const name = el.textContent?.trim() || '';
                        const link = el.href || el.querySelector('a')?.href || '';
                        
                        if (name && name.length > 2) {
                            results.push({
                                companyName: name,
                                companyLink: link,
                                hallNo: '',
                                boothNo: ''
                            });
                        }
                    });
                    
                    if (results.length > 0) break;
                }
            }
            
            return results;
        });
        
        console.log(`\\n📊 Found ${exhibitors.length} exhibitors`);
        
        if (exhibitors.length > 0) {
            fs.writeFileSync('chinaplas_exhibitors_raw.json', JSON.stringify(exhibitors, null, 2));
            console.log("💾 Data saved");
            console.log("\\nSample:");
            console.log(JSON.stringify(exhibitors.slice(0, 3), null, 2));
        }
        
        console.log("\\n⏸️  Browser open for 20 seconds...");
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        await browser.close();
        console.log("\\n✅ Complete!");
        
    } catch (error) {
        console.error("\\n❌ Error:", error.message);
        if (browser) await browser.close();
    }
}

scrapeChina plas();

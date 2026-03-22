import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

// Add stealth plugin
puppeteer.use(StealthPlugin());

const URL = "https://www.signalhire.com/companies";

async function scrapeSignalHire() {
    console.log("🚀 Starting SignalHire Scraper...\n");
    
    let browser;
    try {
        console.log("📱 Launching browser with stealth mode...");
        browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        });
        
        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log("🌐 Navigating to SignalHire companies...");
        await page.goto(URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        console.log("⏳ Waiting for page to load...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Take screenshot
        await page.screenshot({ path: 'signalhire_screenshot.png', fullPage: true });
        console.log("📸 Screenshot saved");
        
        // Save HTML
        const html = await page.content();
        fs.writeFileSync('signalhire_page.html', html);
        console.log("💾 HTML saved");
        
        // Check page title
        const title = await page.title();
        console.log(`📄 Page title: ${title}`);
        
        // Try to find company listings
        console.log("\n🔍 Looking for company data...");
        
        // Wait for potential company list elements
        try {
            await page.waitForSelector('[class*="company"], [class*="list"], table, .card', { timeout: 10000 });
            console.log("✅ Found potential company elements");
            
            // Extract company data
            const companies = await page.evaluate(() => {
                const results = [];
                
                // Try different selectors
                const selectors = [
                    'a[href*="/companies/"]',
                    '[class*="company"]',
                    'table tr',
                    '.card',
                    '[data-company]'
                ];
                
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`Found ${elements.length} elements with selector: ${selector}`);
                        
                        elements.forEach((el, index) => {
                            if (index < 50) { // Limit to first 50
                                const text = el.innerText || el.textContent;
                                const link = el.href || el.querySelector('a')?.href || '';
                                
                                if (text && text.trim()) {
                                    results.push({
                                        text: text.trim(),
                                        link: link
                                    });
                                }
                            }
                        });
                        
                        if (results.length > 0) break;
                    }
                }
                
                return results;
            });
            
            console.log(`\n📊 Found ${companies.length} potential companies`);
            
            if (companies.length > 0) {
                fs.writeFileSync('signalhire_companies_raw.json', JSON.stringify(companies, null, 2));
                console.log("💾 Raw data saved to signalhire_companies_raw.json");
                
                // Show sample
                console.log("\nSample data:");
                console.log(JSON.stringify(companies.slice(0, 5), null, 2));
            } else {
                console.log("⚠️  No company data found. Check screenshot and HTML for manual analysis.");
            }
            
        } catch (error) {
            console.log("⚠️  Timeout waiting for company elements");
            console.log("Check screenshot and HTML for manual analysis");
        }
        
        console.log("\n⏸️  Browser will stay open for 20 seconds...");
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        await browser.close();
        console.log("\n✅ Scraping complete!");
        
    } catch (error) {
        console.error("\n❌ Error:");
        console.error(error.message);
        
        if (browser) {
            await browser.close();
        }
    }
}

scrapeSignalHire();

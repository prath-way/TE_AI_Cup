import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const URL = "https://www.companyseekers.com/";

async function scrapeCompanySeekersAdvanced() {
    console.log("🚀 Starting Advanced Company Seekers Scraper with Stealth Mode...\n");
    
    let browser;
    try {
        console.log("📱 Launching browser with stealth mode...");
        browser = await puppeteer.launch({
            headless: false, // Use visible browser to appear more human-like
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--window-size=1920,1080'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        });
        
        const page = await browser.newPage();
        
        // Set realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set extra headers to appear more human
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });
        
        console.log("🌐 Navigating to Company Seekers...");
        await page.goto(URL, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });
        
        console.log("⏳ Waiting for Cloudflare challenge to complete...");
        // Wait longer to let Cloudflare challenge complete
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check if we're still on challenge page
        const pageTitle = await page.title();
        console.log(`📄 Current page title: ${pageTitle}`);
        
        if (pageTitle.includes("Just a moment")) {
            console.log("⚠️  Still on Cloudflare challenge page. Waiting longer...");
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
        
        // Take screenshot to see current state
        await page.screenshot({ path: 'companyseekers_stealth_screenshot.png', fullPage: true });
        console.log("📸 Screenshot saved: companyseekers_stealth_screenshot.png");
        
        // Get current page content
        const html = await page.content();
        fs.writeFileSync('companyseekers_stealth_page.html', html);
        console.log("💾 HTML saved: companyseekers_stealth_page.html");
        
        // Check final title
        const finalTitle = await page.title();
        console.log(`📄 Final page title: ${finalTitle}`);
        
        if (finalTitle.includes("Just a moment")) {
            console.log("\n❌ CLOUDFLARE CHALLENGE NOT BYPASSED");
            console.log("The stealth plugin was not enough to bypass Cloudflare protection.");
            console.log("\nPossible next steps:");
            console.log("1. Try manual data extraction");
            console.log("2. Use a paid scraping service");
            console.log("3. Contact the website for API access");
        } else {
            console.log("\n✅ SUCCESS! Cloudflare challenge bypassed!");
            console.log("Now attempting to extract company data...");
            
            // Try to find company data
            const bodyText = await page.evaluate(() => document.body.innerText);
            console.log("\nPage content preview:");
            console.log(bodyText.substring(0, 500));
            
            // Save for analysis
            fs.writeFileSync('companyseekers_success_content.txt', bodyText);
            console.log("\n💾 Content saved: companyseekers_success_content.txt");
        }
        
        console.log("\n⏸️  Browser will stay open for 30 seconds for manual inspection...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        await browser.close();
        
    } catch (error) {
        console.error("\n❌ Error during scraping:");
        console.error(error.message);
        
        if (browser) {
            await browser.close();
        }
    }
}

// Run the scraper
scrapeCompanySeekersAdvanced();

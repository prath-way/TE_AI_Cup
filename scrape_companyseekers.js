import puppeteer from "puppeteer";
import fs from "fs";

const URL = "https://www.companyseekers.com/";

async function scrapeCompanySeekers() {
    console.log("🚀 Starting Company Seekers Scraper...\n");
    
    let browser;
    try {
        console.log("📱 Launching browser...");
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set user agent to avoid blocking
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log("🌐 Navigating to Company Seekers...");
        await page.goto(URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        console.log("⏳ Waiting for content to load...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Save screenshot for analysis
        await page.screenshot({ path: 'companyseekers_screenshot.png', fullPage: true });
        console.log("📸 Screenshot saved: companyseekers_screenshot.png");
        
        // Save HTML for analysis
        const html = await page.content();
        fs.writeFileSync('companyseekers_page.html', html);
        console.log("💾 HTML saved: companyseekers_page.html");
        
        // Try to find company listings
        console.log("\n🔍 Analyzing page structure...");
        
        // Check for common selectors
        const possibleSelectors = [
            'table tr',
            '.company-list',
            '.exhibitor',
            '[class*="company"]',
            '[class*="exhibitor"]',
            'a[href*="company"]',
            'div[class*="card"]',
            'div[class*="item"]'
        ];
        
        let companies = [];
        
        for (const selector of possibleSelectors) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
                }
            } catch (e) {
                // Selector not found, continue
            }
        }
        
        // Get page title and main content
        const pageTitle = await page.title();
        console.log(`📄 Page title: ${pageTitle}`);
        
        // Extract all text content for analysis
        const bodyText = await page.evaluate(() => document.body.innerText);
        
        // Save analysis data
        const analysisData = {
            url: URL,
            title: pageTitle,
            timestamp: new Date().toISOString(),
            bodyTextPreview: bodyText.substring(0, 1000),
            note: "This is initial analysis. Manual inspection of HTML and screenshot needed to determine correct selectors."
        };
        
        fs.writeFileSync('companyseekers_analysis.json', JSON.stringify(analysisData, null, 2));
        console.log("📊 Analysis saved: companyseekers_analysis.json");
        
        console.log("\n⚠️  MANUAL INSPECTION REQUIRED:");
        console.log("1. Check companyseekers_screenshot.png to see the page layout");
        console.log("2. Check companyseekers_page.html to find the correct selectors");
        console.log("3. Look for company listings, hall numbers, booth numbers");
        
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
scrapeCompanySeekers();

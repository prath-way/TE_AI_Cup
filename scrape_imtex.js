import puppeteer from "puppeteer";
import fs from "fs";

const URL = "https://www.imtex.in/exhibitor_list.php";

async function scrapeIMTEXExhibitors() {
    console.log("🚀 Starting IMTEX Exhibitor Scraper...\n");
    
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
        
        console.log("🌐 Navigating to IMTEX exhibitor list...");
        await page.goto(URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        console.log("⏳ Waiting for content to load...");
        
        // Wait for the exhibitor list to load
        // Try multiple possible selectors
        try {
            await page.waitForSelector('.exhibitor-item, .exhibitor-card, .company-name, table, .exhibitor-list', {
                timeout: 10000
            });
        } catch (e) {
            console.log("⚠️  Standard selectors not found, trying to extract from page content...");
        }
        
        // Get page content
        const pageContent = await page.content();
        
        // Save HTML for analysis
        fs.writeFileSync('imtex_page.html', pageContent);
        console.log("📄 Saved page HTML to imtex_page.html for analysis\n");
        
        // Try to extract exhibitor data using various methods
        console.log("🔍 Attempting to extract exhibitor data...\n");
        
        // Method 1: Try to find table data
        const exhibitors = await page.evaluate(() => {
            const companies = [];
            
            // Try different selectors
            const selectors = [
                'table tr',
                '.exhibitor-item',
                '.exhibitor-card',
                '.company-item',
                '[class*="exhibitor"]',
                '[class*="company"]'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector: ${selector}`);
                    
                    elements.forEach((el, index) => {
                        const text = el.textContent?.trim();
                        if (text && text.length > 5 && text.length < 500) {
                            companies.push({
                                companyName: text,
                                selector: selector,
                                index: index
                            });
                        }
                    });
                    
                    if (companies.length > 0) break;
                }
            }
            
            // If no companies found, try to extract from all text content
            if (companies.length === 0) {
                const allText = document.body.innerText;
                const lines = allText.split('\n').filter(line => {
                    const trimmed = line.trim();
                    return trimmed.length > 5 && trimmed.length < 200;
                });
                
                return {
                    method: 'text_extraction',
                    totalLines: lines.length,
                    sampleLines: lines.slice(0, 50)
                };
            }
            
            return {
                method: 'selector_extraction',
                companies: companies
            };
        });
        
        console.log("📊 Extraction Results:");
        console.log(JSON.stringify(exhibitors, null, 2));
        
        // Save results
        fs.writeFileSync('imtex_raw_data.json', JSON.stringify(exhibitors, null, 2));
        console.log("\n✅ Raw data saved to imtex_raw_data.json");
        
        // Take a screenshot
        await page.screenshot({ path: 'imtex_screenshot.png', fullPage: true });
        console.log("📸 Screenshot saved to imtex_screenshot.png");
        
        await browser.close();
        
        console.log("\n" + "=".repeat(60));
        console.log("📋 SUMMARY");
        console.log("=".repeat(60));
        console.log(`Method: ${exhibitors.method}`);
        if (exhibitors.companies) {
            console.log(`Companies found: ${exhibitors.companies.length}`);
        } else if (exhibitors.sampleLines) {
            console.log(`Text lines found: ${exhibitors.totalLines}`);
        }
        console.log("\n💡 Next Steps:");
        console.log("1. Check imtex_page.html to see the page structure");
        console.log("2. Check imtex_screenshot.png to see what the page looks like");
        console.log("3. Check imtex_raw_data.json for extracted data");
        console.log("4. We may need to adjust selectors based on the actual HTML structure");
        
    } catch (error) {
        console.error("\n❌ Error during scraping:");
        console.error(error.message);
        
        if (browser) {
            await browser.close();
        }
    }
}

// Run the scraper
scrapeIMTEXExhibitors();

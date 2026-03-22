import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const URL = "https://www.chinaplasonline.com/eMarketplace/allexhibitors/eng/";

async function scrapeChinaplas() {
    console.log("🚀 Starting CHINAPLAS Scraper...\n");
    
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
        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 }); // Increased timeout
        
        console.log("⏳ Waiting for page to load thoroughly...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Auto-scroll to load lazy content
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if(totalHeight >= scrollHeight - window.innerHeight){
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
        
        console.log("\n🔍 Extracting exhibitor data...");
        
        // Extract exhibitors
        const exhibitors = await page.evaluate(() => {
            const results = [];
            // Try specific selectors based on previous analysis
            const items = document.querySelectorAll('.list-item, .exhibitor-item, div[class*="company"]'); 
            // Fallback: get all links with likely profile url
            // const links = document.querySelectorAll('a[href*="CompanyProfile"]');
            
            // Refined extraction logic
            const companyElements = document.querySelectorAll('div.exhibitor-list-item, div.item, .list-item'); // Guessing class names based on standard layouts if specific ones fail
            
            // If specific classes aren't found, try a more generic approach
            const allDivs = document.querySelectorAll('div');
            
            // Let's rely on the previous script's logic but improved
             const selectors = [
                'a[href*="CompanyProfile"]',
                '.exhibitor',
                '[class*="company"]',
                 'table tr'
            ];
            
            // ... (keep logic but ensure we get attributes)
            // Actually, let's rewrite the evaluate function to be more robust
            
            const companies = [];
            const seen = new Set();
            
            // Strategy 1: Look for links to CompanyProfile
            document.querySelectorAll('a[href*="CompanyProfile"]').forEach(a => {
                 const container = a.closest('div') || a.parentElement;
                 const name = a.textContent.trim();
                 const link = a.href;
                 if (name && !seen.has(link)) {
                     seen.add(link);
                     
                     // Try to find Hall/Booth in text nearby
                     const text = container.textContent;
                     let hall = '';
                     let booth = '';
                     
                     // Regex for Hall/Booth matching
                     const hallMatch = text.match(/Hall\s*[:\s-]?\s*(\d+(\.\d+)?[A-Z]?)/i);
                     if (hallMatch) hall = hallMatch[1];
                     
                     const boothMatch = text.match(/Booth\s*[:\s-]?\s*([A-Z0-9\.]+)/i);
                     if (boothMatch) booth = boothMatch[1];
                     
                     companies.push({
                         companyName: name,
                         companyLink: link,
                         hallNumber: hall,
                         boothNumber: booth
                     });
                 }
            });
            
            return companies;
        });
        
        console.log(`\n📊 Found ${exhibitors.length} exhibitors`);
        
        if (exhibitors.length > 0) {
            fs.writeFileSync('chinaplas_exhibitors_final.json', JSON.stringify(exhibitors, null, 2));
            console.log("💾 Data saved to chinaplas_exhibitors_final.json");
        } else {
            console.log("⚠️  No data extracted. Dumping HTML for review.");
            fs.writeFileSync('chinaplas_debug.html', await page.content());
        }
        
        await browser.close();
        console.log("\n✅ Scraping complete!");
        
    } catch (error) {
        console.error("\n❌ Error:");
        console.error(error.message);
        if (browser) await browser.close();
    }
}

scrapeChinaplas();


import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const OUTPUT_FILE = 'arabplast_data.json';
const URL = 'https://arabplast.info/exhibiters_2025.php';

(async () => {
    console.log("🚀 Starting ArabPlast Scraper...");
    const browser = await puppeteer.launch({
        headless: false, // Useful to see if infinite scroll is needed or pagination
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        console.log(`Navigating to: ${URL}`);
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log("⏳ Waiting for table to render...");
        await page.waitForSelector('.cart-table', { timeout: 10000 });

        // Check if we need to scroll to load more? 
        // The probe showed ~4500 lines of HTML, which is a lot.
        // Let's scroll to bottom just in case it triggers lazy loading
        console.log("📜 Scrolling to ensure all data loads...");
        await autoScroll(page);

        // Extract Data
        const companies = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.cart-table tbody tr'));
            
            return rows.map(row => {
                const cols = row.querySelectorAll('td');
                if (cols.length < 2) return null;

                const name = cols[0].innerText.trim();
                const country = cols[1].innerText.trim();

                if (!name) return null;

                return {
                    companyName: name,
                    country: country,
                    hall: '',
                    booth: '',
                    companyLink: '',
                    source: 'ArabPlast 2025'
                };
            }).filter(c => c !== null);
        });

        console.log(`✅ Extracted ${companies.length} companies.`);
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(companies, null, 2));
        console.log(`💾 Saved data to ${OUTPUT_FILE}`);

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight - window.innerHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

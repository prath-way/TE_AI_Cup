
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 Launching ArabPlast List Probe...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        const url = 'https://arabplast.info/exhibiters_2025.php';
        console.log(`Navigating to: ${url}`);
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log("⏳ Waiting for table/list...");
        await new Promise(r => setTimeout(r, 5000));

        // Attempt to find table rows
        const data = await page.evaluate(() => {
            // Hypothesis: It's likely a table or a grid of divs
            const rows = Array.from(document.querySelectorAll('tr, .exhibitor-item, .company-card')); 
            
            return rows.map(r => r.innerText.trim()).slice(0, 10);
        });

        console.log("📊 Sample Rows Found:", data);

        const html = await page.content();
        fs.writeFileSync('arabplast_list_probe.html', html);
        console.log("💾 Saved HTML to arabplast_list_probe.html");
        
        await page.screenshot({ path: 'arabplast_list.png' });

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

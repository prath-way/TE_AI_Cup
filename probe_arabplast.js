
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 Launching ArabPlast Probe...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        const url = 'https://arabplast.info/';
        console.log(`Navigating to: ${url}`);
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log("⏳ Waiting for content...");
        await new Promise(r => setTimeout(r, 5000));

        // Look for keywords like "Exhibitor List", "Exhibitors", "Participants"
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .filter(a => {
                    const text = a.innerText.toLowerCase();
                    return text.includes('exhibitor') || text.includes('list') || text.includes('participant');
                })
                .map(a => ({ text: a.innerText, href: a.href }));
        });

        console.log("🔗 Found potential Exhibitor Links:", links);

        const html = await page.content();
        fs.writeFileSync('arabplast_probe.html', html);
        console.log("💾 Saved HTML to arabplast_probe.html");
        
        await page.screenshot({ path: 'arabplast_probe.png' });
        console.log("📸 Saved screenshot.");

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

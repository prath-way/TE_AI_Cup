
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 Launching Plastimagen Hub Probe (Swapcard)...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        const url = 'https://plastimagen.app.swapcard.com/event/plastimagen-hub-2025';
        console.log(`Navigating to: ${url}`);
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("⏳ Waiting for content...");
        await new Promise(r => setTimeout(r, 5000));

        // Swapcard usually has a specific structure. Look for "Exhibitors" tab.
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .filter(a => {
                    const text = a.innerText.toLowerCase();
                    return text.includes('exhibitor') || text.includes('expositor') || text.includes('list');
                })
                .map(a => ({ text: a.innerText, href: a.href }));
        });

        console.log("🔗 Found Hub Links:", links);

        const html = await page.content();
        fs.writeFileSync('plastimagen_hub_probe.html', html);
        console.log("💾 Saved HTML to plastimagen_hub_probe.html");
        
        await page.screenshot({ path: 'plastimagen_hub_probe.png' });

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

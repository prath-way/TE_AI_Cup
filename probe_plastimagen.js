
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 Launching Plastimagen Probe...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        const url = 'https://plastimagen.com.mx/es';
        console.log(`Navigating to: ${url}`);
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log("⏳ Waiting for content...");
        await new Promise(r => setTimeout(r, 5000));

        // Attempt to find "Exhibitor" or "Expositor" links
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .filter(a => {
                    const text = a.innerText.toLowerCase();
                    return text.includes('exhibitor') || 
                           text.includes('expositor') || 
                           text.includes('directorio') || 
                           text.includes('list') ||
                           text.includes('catalogo');
                })
                .map(a => ({ text: a.innerText.trim(), href: a.href }));
        });

        console.log("🔗 Found potential Directory Links:", links);

        const html = await page.content();
        fs.writeFileSync('plastimagen_probe.html', html);
        console.log("💾 Saved HTML to plastimagen_probe.html");
        
        await page.screenshot({ path: 'plastimagen_probe.png' });
        console.log("📸 Saved screenshot.");

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

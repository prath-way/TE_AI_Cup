
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

(async () => {
    console.log("🚀 Launching ThomasNet Probe...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        // Go to a search page directly to see structure
        // Context: Previous scrapes were plastic related, so searching for "Plastics"
        const searchUrl = 'https://www.thomasnet.com/nsearch.html?cov=NA&heading=96100609&what=Plastics%3A+Injection+Molding'; 
        console.log(`Navigating to: ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        console.log("⏳ Waiting for content to load...");
        await new Promise(r => setTimeout(r, 5000));

        // Save HTML for analysis
        const html = await page.content();
        fs.writeFileSync('thomasnet_probe.html', html);
        console.log("💾 Saved HTML to thomasnet_probe.html");

        // Take a screenshot
        await page.screenshot({ path: 'thomasnet_probe.png' });
        console.log("📸 Saved screenshot to thomasnet_probe.png");

        // Try to identify company cards
        const companies = await page.evaluate(() => {
            // Hypothesis: Look for common classes in ThomasNet result cards
            // Inspecting potential candidates based on typical structure
            const cards = Array.from(document.querySelectorAll('[data-ta="profile-card"]')); // Hypothetical selector, will likely need adjustment
            
            return cards.map(card => {
                const nameEl = card.querySelector('.profile-card__title a'); // Hypothetical
                return {
                    name: nameEl ? nameEl.innerText.trim() : 'N/A',
                    link: nameEl ? nameEl.href : 'N/A'
                };
            }).slice(0, 5);
        });

        console.log("🔎 Potential Company Data Found (Hypothesis):", companies);

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

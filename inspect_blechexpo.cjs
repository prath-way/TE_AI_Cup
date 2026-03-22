const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.blechexpo-messe.de/en/list-of-exhibitors/', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 10000));

        const selectors = await page.evaluate(() => {
            const nameEl = Array.from(document.querySelectorAll('*')).find(e => 
                e.innerText && e.innerText.includes('August Alborn') && e.childElementCount === 0
            );
            if (!nameEl) return { error: 'Name element not found' };

            const card = nameEl.closest('.uncell, div[class*="item"], div[class*="profile"]');
            const hallStandEl = Array.from(document.querySelectorAll('*')).find(e => 
                e.innerText && e.innerText.includes('Hall') && e.innerText.includes('Stand') && e.childElementCount === 0
            );

            return {
                nameSelector: nameEl.className ? '.' + nameEl.className.split(' ').join('.') : null,
                cardSelector: card ? '.' + card.className.split(' ').join('.') : null,
                hallStandSelector: hallStandEl ? '.' + hallStandEl.className.split(' ').join('.') : null,
                nameText: nameEl.innerText,
                allClasses: nameEl.className,
                hallStandText: hallStandEl ? hallStandEl.innerText : null
            };
        });

        const fs = require('fs');
        fs.writeFileSync('blechexpo_selectors.json', JSON.stringify(selectors, null, 2));
        console.log('Selectors saved to blechexpo_selectors.json');
    } catch (e) {
        console.error('Error during inspection:', e);
    } finally {
        await browser.close();
    }
})();

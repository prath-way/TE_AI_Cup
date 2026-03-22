const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    try {
        await page.goto('https://www.blechexpo-messe.de/en/list-of-exhibitors/', { waitUntil: 'load' });
        await new Promise(r => setTimeout(r, 20000));

        const data = await page.evaluate(() => {
            const firstCard = document.querySelector('.nfcompany-short-info')?.parentElement;
            const paginationContainer = document.querySelector('.pagination, .page-numbers, [class*="pagination"]');
            
            // Find all links in the first card
            const cardLinks = firstCard ? Array.from(firstCard.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href, html: a.outerHTML })) : [];
            
            return {
                cardOuterHTML: firstCard ? firstCard.outerHTML : 'Not found',
                cardLinks: cardLinks,
                paginationHTML: paginationContainer ? paginationContainer.outerHTML : 'Not found',
                allLinksNearBottom: Array.from(document.querySelectorAll('a')).slice(-100).map(a => ({ text: a.innerText, href: a.href, className: a.className }))
            };
        });

        const fs = require('fs');
        fs.writeFileSync('blechexpo_structure.json', JSON.stringify(data, null, 2));
        console.log('Structure saved');
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();

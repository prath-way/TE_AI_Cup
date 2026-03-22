const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.blechexpo-messe.de/en/list-of-exhibitors/', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 10000));

        const details = await page.evaluate(() => {
            const nameEl = Array.from(document.querySelectorAll('.nfprofile-company')).find(e => e.innerText && e.innerText.includes('August Alborn'));
            const card = nameEl ? nameEl.closest('.uncont') : null; // Based on common Uncode patterns seen in dump
            const profileLink = card ? card.querySelector('a[href*="exhibitor"]') : null;
            const nextButton = document.querySelector('.pagination .next, a.next, .next-page'); // Generic guess to refine

            return {
                cardClass: card ? card.className : 'not-found',
                cardHTML: card ? card.outerHTML.substring(0, 1000) : 'not-found',
                profileLink: profileLink ? profileLink.href : 'not-found',
                paginationHTML: document.querySelector('ul.pagination, .pagination-container')?.outerHTML.substring(0, 1000)
            };
        });

        const fs = require('fs');
        fs.writeFileSync('blechexpo_details.json', JSON.stringify(details, null, 2));
        console.log('Details saved');
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();

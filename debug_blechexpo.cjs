const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto('https://www.blechexpo-messe.de/en/list-of-exhibitors/', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 10000));

        const info = await page.evaluate(() => {
            const divs = Array.from(document.querySelectorAll('div'));
            const companyNames = Array.from(document.querySelectorAll('.nfprofile-company'));
            
            const nextLinks = Array.from(document.querySelectorAll('a')).filter(a => a.innerText.includes('Next') || a.className.includes('next') || a.innerText.includes('→'));
            const pagination = document.querySelector('.pagination, .page-numbers, .uncont-pagination');

            return {
                companyNameCount: companyNames.length,
                allCompanyNames: companyNames.map(e => e.innerText).slice(0, 5),
                nextLinks: nextLinks.map(a => ({ className: a.className, text: a.innerText, href: a.href })),
                paginationHTML: pagination ? pagination.outerHTML : 'Not found',
                firstCardHTML: companyNames[0] ? companyNames[0].closest('div').parentElement.outerHTML.substring(0, 1000) : 'Not found'
            };
        });

        const fs = require('fs');
        fs.writeFileSync('blechexpo_debug.json', JSON.stringify(info, null, 2));
        console.log('Debug info saved');
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();

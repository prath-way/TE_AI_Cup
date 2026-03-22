const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    try {
        await page.goto('https://www.chinaplasonline.com/cps/exhibitor/list/', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 10000));
        
        console.log('Clicking C...');
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('.alphabet-btn'));
            const cBtn = btns.find(b => b.innerText.trim() === 'C');
            if (cBtn) cBtn.click();
        });
        
        await new Promise(r => setTimeout(r, 15000));
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 2000));
        
        await page.screenshot({ path: 'pagination_debug.png' });
        
        const pagerInfo = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            const matches = elements.filter(el => {
                const className = el.className;
                if (typeof className !== 'string') return false;
                return className.includes('pagination') || className.includes('pager');
            });
            return matches.map(p => ({
                tagName: p.tagName,
                className: p.className,
                innerText: p.innerText.substring(0, 100)
            }));
        });
        
        console.log('PAGINATION_INFO:', JSON.stringify(pagerInfo, null, 2));
        
        const totalCount = await page.evaluate(() => {
            return document.querySelector('.results-count p')?.innerText || 'Not found';
        });
        console.log('TOTAL_COUNT:', totalCount);
        
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
})();

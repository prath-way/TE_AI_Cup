const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 2000 });

    try {
        console.log('Navigating to Exhibitors List...');
        await page.goto('https://www.globalchemexpo.com/globalchem-expo-exhibitors-list.html', { waitUntil: 'load', timeout: 90000 });
        await new Promise(r => setTimeout(r, 10000)); // Wait for any dynamic content

        const data = await page.evaluate(() => {
            const res = {
                tables: document.querySelectorAll('table').length,
                rows: Array.from(document.querySelectorAll('tr')).slice(0, 20).map(tr => tr.innerText.replace(/\n\t/g, ' | ').trim()),
                cards: Array.from(document.querySelectorAll('div[class*="item"]')).slice(0, 5).map(d => d.innerText.substring(0, 200))
            };
            return res;
        });

        console.log('Inspection Results:', JSON.stringify(data, null, 2));
        await page.screenshot({ path: 'globalchem_list_v3.png' });
        fs.writeFileSync('globalchem_list_v3.html', await page.content());
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
})();

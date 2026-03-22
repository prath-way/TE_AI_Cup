const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function scrapeBlechexpo() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    
    // Enable request interception to see if we can find an API
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        request.continue();
    });

    const allExhibitors = [];
    const url = 'https://www.blechexpo-messe.de/en/list-of-exhibitors/';

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 15000)); // Wait for initials to load

    let currentNum = 1;

    while (true) {
        console.log(`Scraping page ${currentNum}...`);
        
        const exhibitors = await page.evaluate(() => {
            const results = [];
            const links = Array.from(document.querySelectorAll('a')).filter(a => a.querySelector('.nfprofile-company'));
            
            links.forEach(a => {
                const nameEl = a.querySelector('.nfprofile-company');
                const locEl = a.querySelector('.nfprofile-location');
                
                let hall = '';
                let booth = '';
                if (locEl) {
                    const text = locEl.innerText.trim();
                    const parts = text.split(' - ');
                    hall = parts[0] ? parts[0].replace('Hall', '').trim() : '';
                    booth = parts[1] ? parts[1].replace('Stand', '').trim() : '';
                }

                results.push({
                    name: nameEl ? nameEl.innerText.trim() : '',
                    url: a.href,
                    hall: hall,
                    booth: booth,
                    source: 'Blechexpo'
                });
            });
            return results;
        });

        console.log(`Found ${exhibitors.length} exhibitors on page ${currentNum}`);
        allExhibitors.push(...exhibitors);

        // Find next page
        const nextNum = currentNum + 1;
        const nextButtonExists = await page.evaluate((next) => {
            const buttons = Array.from(document.querySelectorAll('#paginationBtnOBS button'));
            const btn = buttons.find(b => b.innerText.trim() === next.toString());
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        }, nextNum);

        if (nextButtonExists) {
            currentNum++;
            console.log(`Clicked page ${currentNum}, waiting for update...`);
            await new Promise(r => setTimeout(r, 10000)); // Wait for content to change
            // We could wait for a specific element or the first name to change, 
            // but let's stick with a safe delay for now.
        } else {
            console.log('No more pages found.');
            break;
        }
    }

    console.log(`Total exhibitors collected: ${allExhibitors.length}`);
    fs.writeFileSync('blechexpo_data.json', JSON.stringify(allExhibitors, null, 2));
    console.log('Data saved to blechexpo_data.json');

    await browser.close();
}

scrapeBlechexpo().catch(console.error);

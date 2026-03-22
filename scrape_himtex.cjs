const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

async function scrapeHIMTEX() {
    console.log('🚀 Starting HIMTEX Scraper...');
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1000 });

        console.log('🔗 Navigating to HIMTEX Exhibitor List...');
        await page.goto('https://himtex.in/exhibitors-list/', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        // Wait for table to load
        await page.waitForSelector('tbody tr', { timeout: 10000 });
        
        // Give it a bit more time for any JS rendering
        await new Promise(r => setTimeout(r, 2000));

        const exhibitors = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tbody tr'));
            return rows.map(tr => {
                const cells = tr.querySelectorAll('td');
                if (cells.length >= 3) {
                    return {
                        name: cells[0].innerText.trim(),
                        city: cells[1].innerText.trim(),
                        stallNo: cells[2].innerText.trim(),
                        url: '', // Links not available on site
                        source: 'HIMTEX 2026'
                    };
                }
                return null;
            }).filter(x => x !== null && x.name !== '');
        });

        console.log(`📊 Scraped ${exhibitors.length} exhibitors.`);

        const outputPath = path.join(__dirname, 'himtex_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(exhibitors, null, 2));
        console.log(`✅ Data saved to ${outputPath}`);

    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Scraper closed.');
    }
}

scrapeHIMTEX();

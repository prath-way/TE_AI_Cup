const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

async function scrapeGlobalChem() {
    console.log('🚀 Starting Global Chem Expo Scraper...');
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });

    const totalPages = 16;
    const allExhibitors = [];

    try {
        for (let i = 1; i <= totalPages; i++) {
            const url = `https://www.globalchemexpo.com/list/?page_no=${i}`;
            console.log(`📄 Scraping Page ${i}/${totalPages}: ${url}`);
            
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            const exhibitors = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table.table-bordered tbody tr'));
                return rows.map(tr => {
                    const cells = tr.querySelectorAll('td');
                    if (cells.length >= 2) {
                        return {
                            stallNo: cells[0].innerText.trim(),
                            name: cells[1].innerText.trim(),
                            url: '', // Links not available on site
                            source: 'Global Chem Expo 2026'
                        };
                    }
                    return null;
                }).filter(x => x !== null);
            });

            console.log(`✅ Found ${exhibitors.length} exhibitors on page ${i}`);
            allExhibitors.push(...exhibitors);
            
            // Random delay to be polite
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        }

        const outputPath = path.join(__dirname, 'globalchem_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(allExhibitors, null, 2));
        console.log(`\n🎉 Success! Scraped ${allExhibitors.length} exhibitors.`);
        console.log(`💾 Data saved to: ${outputPath}`);

    } catch (error) {
        console.error('❌ Error during scraping:', error.message);
    } finally {
        await browser.close();
    }
}

scrapeGlobalChem();

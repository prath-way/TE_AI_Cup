
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

const BASE_URL = "https://plasteurasia.com/en/exhibitor-list";

async function scrapePlastEurasia() {
    console.log("🚀 Starting PlastEurasia Scraper...");
    
    let browser;
    let allExhibitors = [];
    
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        // We know there are about 126 pages, but let's loop dynamically
        let currentPage = 1;
        const maxPages = 150; // Safety limit
        
        while (currentPage <= maxPages) {
            const url = currentPage === 1 ? BASE_URL : `${BASE_URL}?page=${currentPage}`;
            console.log(`\n📄 Scraping Page ${currentPage}: ${url}`);
            
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                
                // Wait for the list to populate
                await page.waitForSelector('.brand-item', { timeout: 10000 }).catch(() => console.log("   ⚠️ No brand items found immediately..."));
                
                // Extract data
                const exhibitorsInfo = await page.evaluate(() => {
                    const items = document.querySelectorAll('.brand-item');
                    const extracted = [];
                    
                    items.forEach(item => {
                        const nameEl = item.querySelector('.brand-name');
                        const linkEl = item.querySelector('a.brand-link');
                        const locationItems = item.querySelectorAll('.location-item span');
                        
                        let companyName = nameEl ? nameEl.textContent.trim() : '';
                        let companyLink = linkEl ? linkEl.href : '';
                        
                        let hallNumber = '';
                        let boothNumber = '';
                        
                        locationItems.forEach(span => {
                            const text = span.textContent.trim();
                            if (text.startsWith('Hall:')) {
                                hallNumber = text.replace('Hall:', '').trim();
                            } else if (text.startsWith('Booth:')) {
                                boothNumber = text.replace('Booth:', '').trim();
                            }
                        });
                        
                        if (companyName) {
                            extracted.push({
                                companyName,
                                companyLink,
                                hallNumber,
                                boothNumber
                            });
                        }
                    });
                    
                    return extracted;
                });
                
                console.log(`   ✅ Found ${exhibitorsInfo.length} exhibitors on this page.`);
                
                if (exhibitorsInfo.length === 0) {
                    console.log("   ⚠️ No exhibitors found. Stopping.");
                    break;
                }
                
                allExhibitors = allExhibitors.concat(exhibitorsInfo);
                
                // Check if next page exists (optional optimization, but loop limit is fine)
                // If we found data, proceed. If page returned 200 but no data, likely end.
                
            } catch (err) {
                console.error(`   ❌ Error on page ${currentPage}: ${err.message}`);
                // If timeout or major error, maybe retry or skip? 
                // For now, if we fail to load a page properly, might imply end or ban.
                // Let's retry once then stop if fail? No, just stop for safety.
                // Actually, let's just break if it's a 404-like error (not timeout)
                // For simplicity, we assume robust connection.
            }
            
            currentPage++;
            // Be nice to the server
            // await new Promise(r => setTimeout(r, 500)); 
        }
        
    } catch (error) {
        console.error("\n❌ Fatal Error:", error.message);
    } finally {
        if (allExhibitors.length > 0) {
            console.log(`\n💾 Saving ${allExhibitors.length} exhibitors to plasteurasia_data.json`);
            fs.writeFileSync('plasteurasia_data.json', JSON.stringify(allExhibitors, null, 2));
        }
        
        if (browser) await browser.close();
        console.log("\n✅ Scraping complete!");
    }
}

scrapePlastEurasia();

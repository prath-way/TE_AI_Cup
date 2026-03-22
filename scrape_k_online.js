import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const BASE_URL_TEMPLATE = "https://www.k-online.com/vis/v1/en/search?ticket=g_u_e_s_t&_query=&f_type=profile&_rows=50";
const OUTPUT_FILE = "k_online_data.json";

async function scrape() {
    console.log("🚀 Starting K-Online Scraper (Pagination Mode)...");
    
    let browser;
    let allCompanies = [];
    let offset = 0;
    const LIMIT = 5000; // Safety limit
    
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        while (offset < LIMIT) {
            const url = `${BASE_URL_TEMPLATE}&_start=${offset}`;
            console.log(`🌐 Navigating to offset ${offset}...`);
            
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Wait for results
            try {
                // Wait for the tile title or no results message
                await page.waitForSelector('.teaser-tile__title, .no-results', { timeout: 10000 });
            } catch (e) {
                console.log("⚠️ Timeout waiting for selectors. Likely end of list or hydration delay.");
            }
            
            // Additional wait for hydration
            await new Promise(r => setTimeout(r, 2000));
            
            const companies = await page.evaluate(() => {
                const items = document.querySelectorAll('article');
                
                return Array.from(items).map(item => {
                    const nameEl = item.querySelector('.teaser-tile__title span');
                    const linkEl = item.querySelector('a.teaser-tile__location, .hall-map-link');
                    
                    let name = "Unknown";
                    if (nameEl) name = nameEl.innerText.trim();
                    
                    let hall = "";
                    let booth = "";
                    let link = "";
                    
                    if (linkEl) {
                        link = linkEl.href;
                        const text = linkEl.innerText.trim();
                        // Parse "Hall X / Booth Y"
                        const parts = text.split('/');
                        if (parts.length >= 2) {
                            hall = parts[0].replace(/Hall/i, '').trim();
                            booth = parts[1].replace(/Booth|Stand/i, '').trim();
                        } else {
                            const hallMatch = text.match(/Hall\s*([\w\.]+)/i);
                            const boothMatch = text.match(/Stand\s*([\w\.]+)|Booth\s*([\w\.]+)/i);
                            hall = hallMatch ? hallMatch[1] : "";
                            booth = boothMatch ? (boothMatch[1] || boothMatch[2]) : "";
                        }
                    }

                    return {
                        companyName: name,
                        companyLink: link,
                        hall: hall,
                        booth: booth
                    };
                });
            });
            
            console.log(`✅ Found ${companies.length} companies on this page.`);
            
            if (companies.length === 0) {
                console.log("🛑 No more companies found. Stopping.");
                break;
            }
            
            allCompanies = allCompanies.concat(companies);
            offset += companies.length;
            
            // Save intermediate
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allCompanies, null, 2));
            
            // Optional: Random delay
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
        }
        
        console.log(`🎉 Scrape Complete! Total: ${allCompanies.length}`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allCompanies, null, 2));
        
        await browser.close();
        
    } catch (error) {
        console.error("❌ Error:", error);
        if (browser) await browser.close();
    }
}

scrape();

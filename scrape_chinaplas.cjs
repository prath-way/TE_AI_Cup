const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.chinaplasonline.com/cps/exhibitor/list/';
const DATA_FILE = path.join(__dirname, 'chinaplas_data.json');

async function scrapeChinaplas() {
    console.log('🚀 Starting Chinaplas Scraper...');
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    let allExhibitors = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            const content = fs.readFileSync(DATA_FILE, 'utf8');
            if (content.trim()) {
                allExhibitors = JSON.parse(content);
                console.log(`📂 Loaded ${allExhibitors.length} existing records.`);
            }
        } catch (e) {
            console.error('Error reading data file:', e.message);
        }
    }

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1000 });

        console.log('🔗 Navigating to Chinaplas List...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 90000 });
        
        console.log('⏳ Waiting for alphabet buttons...');
        await page.waitForSelector('.alphabet-btn', { timeout: 30000 });
        await new Promise(r => setTimeout(r, 5000));

        const letters = ['*', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

        for (const letter of letters) {
            console.log(`\n🔠 Processing Letter: ${letter}`);
            
            // Try to click the letter button with retries
            let clicked = false;
            for (let retry = 0; retry < 3; retry++) {
                clicked = await page.evaluate((l) => {
                    const btns = Array.from(document.querySelectorAll('.alphabet-btn'));
                    const btn = btns.find(b => b.innerText.trim() === l);
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    return false;
                }, letter);
                
                if (clicked) break;
                console.log(`   (Retry ${retry + 1}) Waiting for ${letter}...`);
                await new Promise(r => setTimeout(r, 5000));
            }

            if (!clicked) {
                console.log(`⚠️  Letter ${letter} not found after retries. Skipping.`);
                continue;
            }

            // Wait for loader to disappear or data to change
            console.log('⏳ Waiting for letter data to load...');
            await new Promise(r => setTimeout(r, 12000));

            let hasNextPage = true;
            let pageNum = 1;

            while (hasNextPage) {
                console.log(`📄 Page ${pageNum} for letter ${letter}...`);
                
                const pageData = await page.evaluate(() => {
                    const cards = Array.from(document.querySelectorAll('.exhibitor-card'));
                    return cards.map(card => {
                        const name = card.querySelector('.exhibitor-name')?.innerText.trim();
                        const details = Array.from(card.querySelectorAll('.exhibitor-details-row'));
                        let hall = '', booth = '';
                        details.forEach(row => {
                            const label = row.querySelector('.label')?.innerText.trim();
                            const value = row.querySelector('.value')?.innerText.trim();
                            if (label && label.includes('Hall')) hall = value;
                            if (label && label.includes('Booth')) booth = value;
                        });
                        const detailsLink = card.querySelector('a.exhibitor-name')?.href;
                        return { name, hall, booth, detailsLink, source: 'Chinaplas 2026' };
                    }).filter(x => x.name);
                });

                if (pageData.length === 0) {
                    console.log('⚠️  No data found on this page.');
                }

                // Add to collection (avoid duplicates)
                let newItems = 0;
                for (const item of pageData) {
                    if (!allExhibitors.find(ex => ex.name === item.name && ex.hall === item.hall)) {
                        allExhibitors.push(item);
                        newItems++;
                    }
                }

                console.log(`✅ Scraped ${pageData.length} exhibitors (${newItems} new). Total: ${allExhibitors.length}`);
                
                // Save progress frequently
                fs.writeFileSync(DATA_FILE, JSON.stringify(allExhibitors, null, 2));

                // Check for next page
                const paginationRes = await page.evaluate(() => {
                    const pagination = document.querySelector('.pagination');
                    if (!pagination) return { clicked: false, reason: 'No .pagination' };
                    
                    // Look for common "Next" indicators
                    const nextLink = Array.from(pagination.querySelectorAll('a, button, li')).find(el => {
                        const text = el.innerText.trim();
                        const title = el.getAttribute('title') || '';
                        return text === '>' || text.toLowerCase().includes('next') || title.toLowerCase().includes('next');
                    });
                    
                    if (nextLink && !nextLink.classList.contains('disabled') && nextLink.offsetParent !== null) {
                        nextLink.click();
                        return { clicked: true, method: 'next-button' };
                    }
                    
                    // Fallback to clicking the next page number
                    const activePage = Array.from(pagination.querySelectorAll('a, button, li')).find(el => {
                        return el.classList.contains('active') || el.classList.contains('is-active') || el.classList.contains('cur');
                    });
                    
                    if (activePage) {
                        const nextPageNum = parseInt(activePage.innerText.trim()) + 1;
                        if (!isNaN(nextPageNum)) {
                            const nextPage = Array.from(pagination.querySelectorAll('a, button, li')).find(el => {
                                return el.innerText.trim() === String(nextPageNum);
                            });
                            if (nextPage) {
                                nextPage.click();
                                return { clicked: true, method: 'page-number' };
                            }
                        }
                    }
                    
                    return { clicked: false };
                });

                if (paginationRes.clicked) {
                    console.log(`➡️  Going to next page via ${paginationRes.method}...`);
                    hasNextPage = true;
                    pageNum++;
                    await new Promise(r => setTimeout(r, 8000));
                } else {
                    console.log(`⏹️  No more pages for letter ${letter}.`);
                    hasNextPage = false;
                }
            }
        }

        console.log('\n✨ Finished Phase 1 (List Scraping). Starting Phase 2 (Profile Extraction)...');

        const withoutWebsites = allExhibitors.filter(ex => !ex.url && ex.detailsLink);
        console.log(`🔗 Extracting websites for ${withoutWebsites.length} profiles...`);

        for (let i = 0; i < withoutWebsites.length; i++) {
            const ex = withoutWebsites[i];
            
            if (i % 5 === 0) {
                console.log(`⏳ Progress: ${i}/${withoutWebsites.length} profiles processed...`);
                fs.writeFileSync(DATA_FILE, JSON.stringify(allExhibitors, null, 2));
            }

            try {
                await page.goto(ex.detailsLink, { waitUntil: 'networkidle2', timeout: 40000 });
                await new Promise(r => setTimeout(r, 3000));
                
                const websiteData = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    const websiteLink = links.find(a => {
                        const text = a.innerText.toLowerCase();
                        const href = a.href.toLowerCase();
                        return (text.includes('website') || (href.includes('http') && !href.includes('chinaplasonline') && !href.includes('google') && !href.includes('facebook') && !href.includes('linkedin') && !href.includes('twitter') && !href.includes('baidu')));
                    });
                    return { website: websiteLink ? websiteLink.href : null };
                });

                ex.url = websiteData.website || ''; 
            } catch (err) {
                console.error(`❌ Failed to fetch profile for ${ex.name}:`, err.message);
            }
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(allExhibitors, null, 2));
        console.log(`✅ All done! Final count: ${allExhibitors.length}`);

    } catch (error) {
        console.error('❌ Critical error:', error.message);
    } finally {
        await browser.close();
    }
}

scrapeChinaplas();

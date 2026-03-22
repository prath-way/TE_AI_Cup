const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

(async () => {
    const minDelay = 2000;
    const maxDelay = 5000;
    const randomDelay = () => Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--window-size=1366,768']
        });
        const page = await browser.newPage();
        
        // Removed request interception to ensure full load
        
        console.log("Navigating to EMO Hannover...");
        await page.goto('https://visitors.emo-hannover.de/en/search/?category=ep', { waitUntil: 'networkidle2', timeout: 90000 });
        
        // Wait for initial load
        console.log("Waiting for app hydration...");
        await new Promise(r => setTimeout(r, 10000));

        // DEBUG: Dump HTML and Screenshot
        const debugHtml = await page.content();
        fs.writeFileSync('emo_debug.html', debugHtml);
        await page.screenshot({ path: 'emo_debug.png' });
        const title = await page.title();
        console.log(`Page Title: ${title}`);
        console.log(`HTML length: ${debugHtml.length}`);

        let allCompanies = [];
        let pageNum = 1;
        const totalPages = 219; 

        // Check if partial file exists to resume
        if (fs.existsSync('emo_data_partial.json')) {
            try {
                const saved = JSON.parse(fs.readFileSync('emo_data_partial.json'));
                if (Array.isArray(saved) && saved.length > 0) {
                    console.log(`Resuming from ${saved.length} items...`);
                    allCompanies = saved;
                    // Assuming 20 items per page
                    pageNum = Math.floor(saved.length / 20) + 1;
                    console.log(`Setting start page to ${pageNum}`);
                }
            } catch (e) {
                console.log("Error reading partial file, starting fresh.");
            }
        }

        while (pageNum <= totalPages) {
            
            // Fast-forward or Navigate if needed
            // If we are just starting (pageNum 1), we are already there.
            // If we are resuming (pageNum > 1), we need to get to that page.
            // We only do this "catch up" once, but since we are in a loop, 
            // we can check the current active page vs pageNum.
            
            // However, since we click "Next" at the end of the loop, 
            // we should only fast-forward if we haven't reached the target page yet.
            // But we are ALREADY on page 1.
            
            // Logic:
            // 1. Check current page number in DOM.
            // 2. If current < pageNum, click specific page or next until reached.
            
            const currentPage = await page.evaluate(() => {
                const active = document.querySelector('a[data-action="page"].as-active');
                return active ? parseInt(active.getAttribute('data-value')) : 1;
            });

            const shouldScrape = currentPage >= pageNum;

            if (currentPage < pageNum) {
                console.log(`Fast-forwarding: Current page ${currentPage}, Target page ${pageNum}...`);
                
                // Try to click directly if button exists
                const clicked = await page.evaluate((target) => {
                    const btn = document.querySelector(`a[data-action="page"][data-value="${target}"]`);
                    if (btn) {
                        btn.click();
                        return true;
                    }
                    return false;
                }, pageNum);
                
                if (clicked) {
                   console.log(`Clicked target page ${pageNum} directly.`);
                   await new Promise(r => setTimeout(r, 3000));
                   continue; // Re-check current page
                } else {
                   console.log(`Target page button not visible, will click 'Next' (to page ${currentPage + 1})`);
                }
            } else {
                console.log(`Scraping page ${currentPage} (Target: ${pageNum})...`);

                // Extract data from current page
                const companies = await page.evaluate(() => {
                        const items = document.querySelectorAll('[data-cy="searchResultEntry"]');
                        const results = [];
                        
                        items.forEach(item => {
                            try {
                                const linkEl = item.querySelector('a');
                                const link = linkEl ? linkEl.getAttribute('href') : '';
                                
                                const nameEl = item.querySelector('[data-cy="masterSnippetName"]');
                                const name = nameEl ? nameEl.textContent.trim() : 'N/A';

                                const locationEl = item.querySelector('.search-snippet-location');
                                const locationText = locationEl ? locationEl.textContent.trim() : '';
                                
                                let hall = "";
                                let booth = "";
                                
                                if (locationText) {
                                    const hallMatch = locationText.match(/Hall\s+(\d+)/i);
                                    const standMatch = locationText.match(/Stand\s+([A-Z0-9\s]+)/i);
                                    
                                    if (hallMatch) hall = hallMatch[1].trim();
                                    if (standMatch) booth = standMatch[1].trim();
                                }

                                results.push({
                                    name,
                                    url: 'https://visitors.emo-hannover.de' + link,
                                    hall,
                                    booth,
                                    source: 'EMO Hannover 2025'
                                });
                            } catch (err) { }
                        });
                        return results;
                    });
                    
                    console.log(`Found ${companies.length} companies on page ${currentPage}.`);
                    allCompanies = allCompanies.concat(companies);
                    
                    // Save batch
                    fs.writeFileSync('emo_data_partial.json', JSON.stringify(allCompanies, null, 2));
            }

            if (currentPage >= totalPages) break;

            // Go to nextTarget
            const nextTarget = currentPage + 1;
            const nextSuccess = await page.evaluate((target) => {
                const btn = document.querySelector(`a[data-action="page"][data-value="${target}"]`);
                if (btn) {
                    btn.click();
                    return true;
                }
                // Fallback: look for the right arrow button which often has the next value
                // but if we match by data-value it should just work.
                return false;
            }, nextTarget);

            if (!nextSuccess) {
                console.log(`Could not find button for page ${nextTarget}. Stopping.`);
                break;
            }

            // Wait for update
            try {
                await page.waitForFunction(
                    (p) => {
                         const active = document.querySelector('a[data-action="page"].as-active');
                         return active && parseInt(active.getAttribute('data-value')) == p;
                    }, 
                    { timeout: 20000 }, 
                    nextTarget
                );
            } catch (e) {
                console.log(`Warning: Active page indicator didn't reach ${nextTarget} in time.`);
            }
            
            await new Promise(r => setTimeout(r, 1500)); 

            // Update pageNum ONLY if we scraped
            if (shouldScrape) {
                pageNum++;
            }
        }

        fs.writeFileSync('emo_data.json', JSON.stringify(allCompanies, null, 2));
        console.log(`Done! Scraped ${allCompanies.length} companies.`);
        
        await browser.close();

    } catch (e) {
        console.error("Fatal Error:", e);
        if (browser) await browser.close();
    }
})();

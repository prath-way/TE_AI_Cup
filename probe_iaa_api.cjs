const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--window-size=1366,768']
        });
        const page = await browser.newPage();
        
        console.log("Setting up network interception...");
        
        page.on('response', async (response) => {
            const url = response.url();
            const type = response.request().resourceType();
            
            if (type === 'xhr' || type === 'fetch') {
                if (url.includes('api') || url.includes('search') || url.includes('json') || url.includes('organizations')) {
                    
                    try {
                        const json = await response.json();
                        const str = JSON.stringify(json);
                        if (str.includes('ZF Group') || str.includes('3ntr')) {
                            console.log(`[API?] ${response.request().method()} ${url}`);
                            console.log("^^^ FOUND CANDIDATE API! Saving request and response...");
                            
                            const request = response.request();
                            const requestDetails = {
                                url: url,
                                method: request.method(),
                                headers: request.headers(),
                                postData: request.postData()
                            };
                            
                            fs.writeFileSync('iaa_api_candidate.json', JSON.stringify(json, null, 2));
                            fs.writeFileSync('iaa_api_request.json', JSON.stringify(requestDetails, null, 2));
                        }
                    } catch (e) {
                        // ignore non-json
                    }
                }
            }
        });

        console.log("Navigating to IAA...");
        await page.goto('https://exhibitors.iaa-transportation.com/showfloor/organizations', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        console.log("Scrolling to trigger more loads...");
        await page.evaluate(async () => {
            // Try to find the scroll container
            const container = document.querySelector('.ScrollbarsCustom-Scroller');
            if (container) {
                container.scrollTop = 1000;
                await new Promise(r => setTimeout(r, 1000));
                container.scrollTop = 2000;
            } else {
                window.scrollBy(0, 1000);
            }
        });
        
        await new Promise(r => setTimeout(r, 5000));
        
        await browser.close();
        
    } catch (e) {
        console.error("Error:", e);
    }
})();

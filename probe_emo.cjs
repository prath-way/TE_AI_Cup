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
        
        // Capture API requests
        page.on('response', async (response) => {
            const url = response.url();
            const type = response.request().resourceType();
            
            if (type === 'xhr' || type === 'fetch') {
                // Look for common API patterns
                if (url.includes('api') || url.includes('search') || url.includes('json') || url.includes('exhibitors')) {
                    console.log(`[API?] ${response.request().method()} ${url}`);
                    try {
                        const json = await response.json();
                        const str = JSON.stringify(json);
                        // Check for keywords
                        if (str.includes('hall') || str.includes('stand') || str.includes('booth')) {
                            console.log("^^^ FOUND CANDIDATE API! Saving...");
                            fs.writeFileSync('emo_api_candidate.json', JSON.stringify(json, null, 2));
                            
                            const request = response.request();
                            const requestDetails = {
                                url: url,
                                method: request.method(),
                                headers: request.headers(),
                                postData: request.postData()
                            };
                            fs.writeFileSync('emo_api_request.json', JSON.stringify(requestDetails, null, 2));
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }
        });

        console.log("Navigating to EMO Hannover...");
        try {
            await page.goto('https://visitors.emo-hannover.de/en/search/?category=ep', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
        } catch (navError) {
            console.error("Navigation error (continuing):", navError.message);
        }

        console.log("Waiting for content (10s)...");
        await new Promise(r => setTimeout(r, 10000));

        // Dump HTML
        const html = await page.content();
        fs.writeFileSync('emo_dump.html', html);
        console.log("Saved HTML dump.");

        // Take screenshot
        await page.screenshot({ path: 'emo_screenshot.png' });
        console.log("Saved screenshot.");
        
        await browser.close();
        
    } catch (e) {
        console.error("Error:", e);
    }
})();

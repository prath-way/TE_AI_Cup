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
        
        const requests = [];

        page.on('response', async (response) => {
            const request = response.request();
            const type = request.resourceType();
            const url = response.url();
            
            if (type === 'xhr' || type === 'fetch') {
                console.log(`[${request.method()}] ${url} (${type})`);
                
                try {
                    const text = await response.text();
                    requests.push({
                        url: url,
                        method: request.method(),
                        type: type,
                        status: response.status(),
                        responseLength: text.length,
                        responseSnippet: text.substring(0, 500),
                        headers: request.headers(),
                        postData: request.postData()
                    });
                    
                    // Specific check for potential search API
                    if (url.includes('search') || url.includes('result') || text.includes('hitCount')) {
                        console.log("   -> Potential Search API found!");
                        fs.writeFileSync(`emo_potential_${Date.now()}.json`, text);
                    }
                } catch (e) {
                    console.log(`   -> Error reading response body for ${url}`);
                }
            }
        });

        console.log("Navigating...");
        try {
            await page.goto('https://visitors.emo-hannover.de/en/search/?category=ep', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
        } catch(e) { console.error("Nav error:", e.message); }

        console.log("Waiting for 15 seconds...");
        await new Promise(r => setTimeout(r, 15000));
        
        fs.writeFileSync('emo_all_requests.json', JSON.stringify(requests, null, 2));
        console.log("Saved all requests to emo_all_requests.json");

        await browser.close();
        
    } catch (e) {
        console.error("Error:", e);
    }
})();

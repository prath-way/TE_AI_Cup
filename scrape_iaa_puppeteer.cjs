const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const qs = require('querystring');

puppeteer.use(StealthPlugin());

(async () => {
    try {
        console.log("Reading request details...");
        const requestDetails = JSON.parse(fs.readFileSync('iaa_api_request.json', 'utf8'));
        
        let allEntities = [];
        let totalCount = null;
        let startRow = 0;
        const limit = 1000; // API seems capped at 1000
        
        console.log("Launching browser...");
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--window-size=1366,768']
        });
        const page = await browser.newPage();
        
        console.log("Navigating to target site...");
        await page.goto('https://exhibitors.iaa-transportation.com/showfloor/organizations', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // Loop until we have all
        while (true) {
            console.log(`fetching batch starting at ${startRow}...`);
            
            // Prepare payload for this batch
            const bodyParams = qs.parse(requestDetails.postData);
            bodyParams.numresultrows = limit;
            bodyParams.startresultrow = startRow;
            const newPostData = qs.stringify(bodyParams);
            
            const result = await page.evaluate(async (url, postData, headers) => {
                try {
                    const safeHeaders = {};
                    if (headers['beconnectiontoken']) safeHeaders['beconnectiontoken'] = headers['beconnectiontoken'];
                    if (headers['ec-client']) safeHeaders['ec-client'] = headers['ec-client'];
                    if (headers['ec-client-branding']) safeHeaders['ec-client-branding'] = headers['ec-client-branding'];
                    safeHeaders['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                    safeHeaders['accept'] = 'application/json';

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: safeHeaders,
                        body: postData
                    });
                    
                    if (!response.ok) return { error: `Status ${response.status}`, status: response.status };
                    const json = await response.json();
                    return { success: true, data: json };
                } catch (e) {
                    return { error: e.toString() };
                }
            }, requestDetails.url, newPostData, requestDetails.headers);
            
            if (result.success) {
                const data = result.data;
                if (!totalCount) totalCount = data.count;
                
                const entities = data.entities || [];
                console.log(`Fetched ${entities.length} items.`);
                
                if (entities.length > 0) {
                    allEntities = allEntities.concat(entities);
                }
                
                if (entities.length < limit || allEntities.length >= totalCount) {
                    console.log("All data fetched.");
                    break;
                }
                
                startRow += entities.length;
                await new Promise(r => setTimeout(r, 2000)); // Be nice
                
            } else {
                console.error("Fetch failed:", result.error);
                break;
            }
        }
        
        console.log(`Total entities collected: ${allEntities.length}`);
        
        fs.writeFileSync('iaa_data_full_raw.json', JSON.stringify(allEntities, null, 2));
        
        const simplified = allEntities.map(e => ({
            id: e.id,
            name: e.name,
            country: e.country,
            city: e.city,
            stand: e.stands && e.stands.length > 0 ? e.stands[0].displayName : (e.standNr || 'N/A'),
            hall: e.stands && e.stands.length > 0 ? e.stands[0].hallName : 'N/A',
            website: e.website || (e.socialMedia ? (e.socialMedia.find(s => s.type === 'website')?.url) : null),
            description: e.teaser
        }));
        
        fs.writeFileSync('iaa_data_final.json', JSON.stringify(simplified, null, 2));
        console.log("Saved iaa_data_final.json");
        
        await browser.close();

    } catch (e) {
        console.error("Error:", e);
    }
})();

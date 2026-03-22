import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    console.log("🚀 Launching Interplas Probe...");
    const browser = await puppeteer.launch({
        headless: false, // Visible for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Store potential API responses
    const apiResponses = [];

    // Intercept responses to find the exhibitor data
    page.on('response', async response => {
        const url = response.url();
        const type = response.request().resourceType();
        
        if (type === 'xhr' || type === 'fetch') {
            // Filter for likely API endpoints
            if (url.includes('api') || url.includes('json') || url.includes('expoplatform')) {
                console.log(`📡 API Response: ${url}`);
                try {
                    const status = response.status();
                    if (status >= 200 && status < 300) {
                        const buffer = await response.buffer();
                        const text = buffer.toString();
                        // Check if it looks like exhibitor data
                        if (text.includes('exhibitor') || text.includes('Exhibitor') || text.length > 10000) {
                            console.log(`✅ Found potential data in: ${url}`);
                            apiResponses.push({
                                url: url,
                                data: text.substring(0, 1000) + "..." // Truncate for log
                            });
                            // Save the full response if it looks really promising
                            if (text.includes('Polyram') || text.includes('Husky')) {
                                fs.writeFileSync('interplas_api_sample.json', text);
                                console.log(`💾 Saved API response to interplas_api_sample.json`);
                            }
                        }
                    }
                } catch (e) {
                    console.log(`⚠️ Could not read response body for ${url}: ${e.message}`);
                }
            }
        }
    });

    try {
        const url = 'https://interplasuk.com/newfront/marketplace/exhibitors';
        console.log(`Navigating to: ${url}`);
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log("⏳ Waiting for content...");
        // Wait for some common exhibitor list selectors or just time
        await new Promise(r => setTimeout(r, 10000));

        // Take screenie
        await page.screenshot({ path: 'interplas_probe.png' });
        console.log("📸 Screenshot saved.");

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

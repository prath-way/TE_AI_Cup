import puppeteer from 'puppeteer';
import fs from 'fs';

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
  process.exit(1);
});

(async () => {
    console.log("🚀 Launching Interplas Scraper (Discovery Mode)...");
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Log all API responses
    page.on('response', async response => {
        const url = response.url();
        const type = response.request().resourceType();
        
        if (type === 'fetch' || type === 'xhr') {
            console.log(`📡 API/XHR: ${url} [Status: ${response.status()}]`);
            if (url.includes('api/v1') || url.includes('categories') || url.includes('filters')) {
                 try {
                     const text = await response.text();
                     if (text.length < 5000) {
                         console.log("📝 Payload Preview:", text.substring(0, 200));
                     }
                     if (url.includes('categories') || url.includes('init') || url.includes('meta')) {
                         fs.writeFileSync('interplas_categories_response.json', text);
                         console.log("💾 Saved potential category data to interplas_categories_response.json");
                     }
                 } catch (e) {}
            }
        }
    });

    try {
        const pageUrl = 'https://interplasuk.com/newfront/marketplace/exhibitors';
        console.log(`Navigating to: ${pageUrl}`);
        
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait specifically for filters to load
        await new Promise(r => setTimeout(r, 8000));

    } catch (e) {
        console.error("❌ Error:", e.message);
    } finally {
        await browser.close();
    }
})();

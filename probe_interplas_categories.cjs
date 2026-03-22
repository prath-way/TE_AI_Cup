const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1366,768'
        ]
    });

    const page = await browser.newPage();
    
    // Capture API responses
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('/api/') || url.includes('categories') || url.includes('aggregations') || url.includes('filters')) {
            try {
                const contentType = response.headers()['content-type'];
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    console.log(`Captured API response from: ${url}`);
                    
                    // Simple heuristic to check for categories
                    if (JSON.stringify(data).includes('business_area') || JSON.stringify(data).includes('categories')) {
                        console.log("Potential category data found!");
                        fs.writeFileSync(`captured_api_${Date.now()}.json`, JSON.stringify(data, null, 2));
                    }
                }
            } catch (e) {
                // ignore
            }
        }
    });

    try {
        console.log("Navigating to Interplas Exhibitor List...");
        await page.goto('https://interplasuk.com/newfront/marketplace/exhibitors', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log("Waiting for filter accordion...");
        
        // Wait for the "Product Categories" header
        const selector = "h5[title='Product Categories']";
        await page.waitForSelector(selector, { timeout: 10000 });
        
        console.log("Clicking Product Categories...");
        await page.click(selector);
        
        // Wait for potential network requests or DOM updates
        await new Promise(r => setTimeout(r, 5000));
        
        // Check if checkboxes appeared in DOM
        console.log("Checking DOM for categories...");
        const categories = await page.evaluate(() => {
            const items = [];
            // Look for checkboxes or labels that might have appeared
            // Using a broad selector based on typical material UI or the dump structure
            // In the dump, the accordion content wrapper was empty. Now it should have children.
            
            // Try to find checkbox labels containing count, e.g. "3D Printing (12)"
            // Or look for any label element inside the accordion
            
            const expander = document.querySelector("h5[title='Product Categories']").closest('.MuiAccordion-root'); // Go up to accordion
            if (!expander) return ["Accordion root not found"];
            
            // The content is usually in MuiCollapse-container or similar
            const content = expander.querySelector('.MuiCollapse-root');
            if (content) {
                // Find all checkboxes
                const checkboxes = content.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    // Try to find label
                    // The label text is usually in a sibling or parent
                    let labelText = "Unknown";
                    // Navigate up to form control label
                    const labelElem = cb.closest('label');
                    if (labelElem) {
                        const typography = labelElem.querySelector('.MuiTypography-root');
                        if (typography) labelText = typography.innerText;
                        else labelText = labelElem.innerText;
                    }
                    
                    items.push({
                        id: cb.value,
                        name: labelText.trim()
                    });
                });
            }
            return items;
        });
        
        console.log("Extracted categories from DOM:", categories);
        fs.writeFileSync('interplas_categories_final.json', JSON.stringify(categories, null, 2));

    } catch (e) {
        console.error("Error:", e);
        await page.screenshot({ path: 'error_probe.jpg' });
    } finally {
        await browser.close();
    }
})();

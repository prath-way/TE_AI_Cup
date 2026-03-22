
import axios from 'axios';
import fs from 'fs';

const BASE_URL = "https://www.chinaplasonline.com";
// Potential API endpoints based on file analysis
const ENDPOINTS = [
    "/api/emp/Search", 
    "/api/emp/search",
    "/eMarketplace/api/emp/Search",
    "/CPS24/api/emp/Search",
    "/api/sponsorship/GetSponsorshipExhListAdFromEMP"
];

async function checkEndpoint(endpoint) {
    try {
        const url = `${BASE_URL}${endpoint}`;
        console.log(`Testing endpoint: ${url}`);
        const response = await axios.post(url, {
            "LangId": 1252,
            "PageSize": 1,
            "PageIndex": 1
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'Origin': BASE_URL,
                'Referer': `${BASE_URL}/eMarketplace/allexhibitors/eng/`
            },
            timeout: 10000
        });
        
        if (response.status === 200 && response.data && response.data.IsSuccessful) {
            console.log(`✅ Success! Valid endpoint: ${endpoint}`);
            return url;
        }
    } catch (error) {
        // console.log(`❌ Failed: ${endpoint} - ${error.message}`);
    }
    return null;
}


async function scrape() {
    console.log("🚀 Starting API Scraper...");
    
    // 1. Get Cookies
    const mainPageUrl = `${BASE_URL}/eMarketplace/allexhibitors/eng/`;
    console.log(`Getting session from: ${mainPageUrl}`);
    
    let cookies = '';
    try {
        const pageRes = await axios.get(mainPageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        });
        
        if (pageRes.headers['set-cookie']) {
            cookies = pageRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            console.log("✅ Got cookies:", cookies.substring(0, 50) + "...");
        }
    } catch (e) {
        console.warn("⚠️ Failed to get cookies, trying without...", e.message);
    }

    // 2. Try likely endpoints with cookies
    let validUrl = null;
    for (const ep of ENDPOINTS) {
        try {
            const url = `${BASE_URL}${ep}`;
            // console.log(`Testing: ${url}`);
            const res = await axios.post(url, {
                "LangId": 1252,
                "PageSize": 1,
                "PageIndex": 1
            }, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Content-Type': 'application/json',
                    'Origin': BASE_URL,
                    'Referer': mainPageUrl,
                    'Cookie': cookies,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 5000
            });
            
            if (res.status === 200 && res.data && res.data.IsSuccessful) {
                console.log(`✅ FOUND API: ${url}`);
                validUrl = url;
                break;
            }
        } catch (e) {
            console.log(`❌ ${ep} : ${e.message}`);
            if (e.response) console.log(`   Status: ${e.response.status}`);
        }
    }

    if (!validUrl) {
         console.error("❌ Could not determine API endpoint. Exiting.");
         return;
    }

    // 3. Scrape Loop
    console.log(`\nStarting Full Scraping from ${validUrl}`);
    
    const allCompanies = [];
    const pageSize = 50; 
    let total = 0;
    
    try {
        // Initial Fetch
        const initialRes = await axios.post(validUrl, {
            "LangId": 1252,
            "PageSize": pageSize,
            "PageIndex": 1
        }, {
             headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'Cookie': cookies,
                'Referer': mainPageUrl
            }
        });

        if (!initialRes.data?.data?.body?.result) {
            throw new Error("Invalid response structure");
        }

        total = initialRes.data.data.body.result.total;
        console.log(`Total Exhibitors: ${total}`);
        
        const totalPages = Math.ceil(total / pageSize);
        
        // Process first page
        const firstItems = initialRes.data.data.body.result.items || [];
        allCompanies.push(...processItems(firstItems));

        // Loop rest
        for (let i = 2; i <= totalPages; i++) {
            if (i % 5 === 0) console.log(`Fetching page ${i}/${totalPages}...`);
            try {
                const res = await axios.post(validUrl, {
                    "LangId": 1252,
                    "PageSize": pageSize,
                    "PageIndex": i
                }, {
                     headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Content-Type': 'application/json',
                        'Cookie': cookies,
                        'Referer': mainPageUrl
                    }
                });
                
                const items = res.data.data.body.result.items || [];
                allCompanies.push(...processItems(items));
                
            } catch (err) {
                console.error(`Error on page ${i}: ${err.message}`);
            }
            // Delay
            await new Promise(r => setTimeout(r, 200));
        }
        
        console.log(`\n✅ Scraped ${allCompanies.length} companies.`);
        fs.writeFileSync('chinaplas_exhibitors_final.json', JSON.stringify(allCompanies, null, 2));
        console.log("Saved to chinaplas_exhibitors_final.json");

    } catch (error) {
        console.error("Fatal Error:", error.message);
    }
}

function processItems(items) {
    return items.map(item => {
        const f = item.fields;
        return {
            companyName: f.companynameen,
            companyLink: `https://www.chinaplasonline.com/eMarketplace/ShowExhibitor/CompanyProfile/eng/${f.diycompid}`,
            hallNumber: f.hall,
            boothNumber: f.boothno
        };
    });
}

scrape();


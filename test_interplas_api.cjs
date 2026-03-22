const axios = require('axios');

const EVENT_ID = 276;
const TEST_CATEGORY_ID = 234; // 3D Printing

async function testApi() {
    const url = `https://api-rng.expoplatform.com/api/v1/search/exhibitors`;
    const params = {
        event_id: EVENT_ID,
        business_area: TEST_CATEGORY_ID,
        page: 1,
        limit: 10
    };
    
    try {
        console.log(`Fetching ${url} with params`, params);
        const response = await axios.get(url, {
            params,
            headers: {
                'Origin': 'https://interplasuk.com',
                'Referer': 'https://interplasuk.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        
        console.log("Status:", response.status);
        console.log("Data keys:", Object.keys(response.data));
        if (response.data.data) {
             console.log("Data.data keys:", Object.keys(response.data.data));
             // Check if we got a list
             if (Array.isArray(response.data.data)) {
                  console.log(`Got ${response.data.data.length} items`);
                  console.log("First item:", response.data.data[0]);
             } else if (response.data.data.data && Array.isArray(response.data.data.data)) {
                  // Laravel style pagination often puts data in data.data
                  console.log(`Got ${response.data.data.data.length} items (nested)`);
                  console.log("First item:", response.data.data.data[0]);
             }
        }
    } catch (error) {
        console.error("Error fetching API:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
    }
}

testApi();

const https = require('https');
const fs = require('fs');

function fetchUrl(url, filename) {
    console.log(`Fetching ${url}...`);
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                fs.writeFileSync(filename, data);
                console.log(`Saved ${filename} (${data.length} bytes)`);
                resolve(data);
            });
        }).on('error', (err) => {
            console.error(`Error fetching ${url}: ${err.message}`);
            reject(err);
        });
    });
}

async function run() {
    const baseUrl = 'https://www.chinaplasonline.com/eMarketplace/CompanyProfile/eng/?compid=';
    
    // Known ID
    await fetchUrl(baseUrl + '1026901', 'profile_1026901.html');
    
    // Next ID
    await fetchUrl(baseUrl + '1026902', 'profile_1026902.html');
    
    // Random ID in range
    await fetchUrl(baseUrl + '1026950', 'profile_1026950.html');
}

run();

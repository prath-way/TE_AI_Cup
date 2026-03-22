const axios = require('axios');
const fs = require('fs');
const qs = require('querystring');

(async () => {
    try {
        console.log("Reading request details...");
        const requestDetails = JSON.parse(fs.readFileSync('iaa_api_request.json', 'utf8'));
        
        const bodyParams = qs.parse(requestDetails.postData);
        bodyParams.numresultrows = 2000; 
        bodyParams.startresultrow = 0;
        
        console.log(`URL: ${requestDetails.url}`);
        console.log("Token:", requestDetails.headers['beconnectiontoken']);
        
        const config = {
            method: 'post',
            url: requestDetails.url,
            headers: {
                ...requestDetails.headers,
                'content-length': undefined,
                'accept-encoding': 'gzip, deflate, br' // Remove zstd if axios doesn't support it
            },
            data: qs.stringify(bodyParams)
        };

        console.log("Sending request...");
        const response = await axios(config);
        
        console.log(`Response Status: ${response.status}`);
        const data = response.data;
        console.log(`Response Data Count: ${data.count}`);
        
        if (data.entities && data.entities.length > 0) {
            console.log(`Success! Got ${data.entities.length} entities.`);
            fs.writeFileSync('iaa_data_full_raw.json', JSON.stringify(data.entities, null, 2));
            
            const simplified = data.entities.map(e => ({
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
            console.log("Processed data saved to iaa_data_final.json");
        } else {
            console.log("No entities found.");
            console.log("Full response:", JSON.stringify(data).substring(0, 500));
        }

    } catch (error) {
        console.error("CRITICAL ERROR:", error.message);
        if (error.response) {
            console.error("Response Status:", error.response.status);
            console.error("Response Data:", JSON.stringify(error.response.data).substring(0, 500));
        } else if (error.request) {
            console.error("No response received");
        }
    }
})();

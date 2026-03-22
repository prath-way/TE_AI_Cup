const axios = require('axios');

async function test() {
    try {
        const query = 'Maschinen';
        const res = await axios.get(`http://localhost:3000/api/search?query=${query}`);
        const results = res.data.results;
        const sources = new Set(results.map(r => r.source));
        console.log(`Search for "${query}" found ${results.length} results.`);
        console.log('Sources found:', Array.from(sources));
        
        const blechCount = results.filter(r => r.source === 'Blechexpo').length;
        console.log(`Blechexpo results: ${blechCount}`);

        const allRes = await axios.get('http://localhost:3000/api/companies');
        const allSources = new Set(allRes.data.companies.map(r => r.source));
        console.log('All available sources in companies:', Array.from(allSources));
        console.log('Total companies:', allRes.data.count);
    } catch (e) {
        console.error(e.message);
    }
}

test();

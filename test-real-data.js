// Test script for real data enrichment
// Run with: node test-real-data.js

import { fetchRealCompanyData } from './data-sources.js';
import { enrichCompanyData } from './enrichment-service.js';

// Test companies with known data
const testCompanies = [
    {
        companyName: 'Tata Motors',
        companyLink: 'https://www.tatamotors.com',
        source: 'IAA Transportation 2024',
        profile: 'Leading automotive manufacturer'
    },
    {
        companyName: 'Siemens',
        companyLink: 'https://www.siemens.de',
        source: 'EMO Hannover 2025',
        profile: 'Industrial automation and manufacturing solutions'
    },
    {
        companyName: 'Reliance Industries',
        companyLink: 'https://www.ril.com',
        source: 'Plastindia 2026',
        profile: 'Polymer and petrochemicals manufacturer'
    }
];

console.log('🧪 Testing Real Data Enrichment\n');
console.log('='.repeat(80));

async function runTests() {
    for (const company of testCompanies) {
        console.log(`\n📋 Testing: ${company.companyName}`);
        console.log(`🔗 Website: ${company.companyLink}`);
        console.log('-'.repeat(80));

        try {
            // Test 1: Fetch real data from sources
            console.log('\n1️⃣ Fetching from data sources...');
            const realData = await fetchRealCompanyData(company);

            console.log(`   Data Source: ${realData.dataSource}`);
            console.log(`   Confidence: ${realData.confidence}%`);
            console.log(`   Employees: ${realData.employees || 'Not found'}`);
            console.log(`   Revenue: ${realData.revenue || 'Not found'}`);
            console.log(`   Industry: ${realData.industry || 'Not found'}`);
            console.log(`   HQ Country: ${realData.hqCountry || 'Not found'}`);

            // Test 2: Full enrichment with fallback
            console.log('\n2️⃣ Full enrichment (with fallback)...');
            const enriched = await enrichCompanyData(company);

            console.log(`   ✅ Employees: ${enriched.employees} (${enriched.dataSource})`);
            console.log(`   ✅ Revenue: ${enriched.revenue}`);
            console.log(`   ✅ Operating Income: ${enriched.operatingIncome}`);
            console.log(`   ✅ EBITDA: ${enriched.ebitda}`);
            console.log(`   ✅ Industry: ${enriched.industry}`);
            console.log(`   ✅ HQ Country: ${enriched.hqCountry}`);
            console.log(`   ✅ Data Confidence: ${enriched.dataConfidence}%`);

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Testing complete!\n');
}

runTests().catch(console.error);

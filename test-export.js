// Test script to verify enriched exports
import fs from 'fs';

async function testExport() {
    try {
        // Fetch search results
        const searchResponse = await fetch('http://localhost:3000/api/search?query=plastic');
        const searchData = await searchResponse.json();

        console.log(`\n✅ Found ${searchData.count} results for "plastic"`);

        // Get first company to inspect
        const firstCompany = searchData.results[0];
        console.log(`\n📊 Sample Company Data:`)
        console.log(`Name: ${firstCompany.companyName}`);
        console.log(`Industry: ${firstCompany.industry}`);
        console.log(`HQ Country: ${firstCompany.hqCountry}`);
        console.log(`Employees: ${firstCompany.employees}`);
        console.log(`Revenue: ${firstCompany.revenue}`);
        console.log(`Operating Income: ${firstCompany.operatingIncome}`);
        console.log(`EBITDA: ${firstCompany.ebitda}`);
        console.log(`Description: ${firstCompany.businessDescription.substring(0, 80)}...`);

        // Test CSV export
        const companies = searchData.results.slice(0, 5); // Just 5 for testing
        const csvResponse = await fetch('http://localhost:3000/api/download/csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companies })
        });

        const csvContent = await csvResponse.text();
        const csvLines = csvContent.split('\n');

        console.log(`\n📄 CSV Export Test:`);
        console.log(`Header: ${csvLines[0]}`);
        console.log(`First Row: ${csvLines[1]}`);

        // Count columns
        const headers = csvLines[0].split(',');
        console.log(`\n✅ Total columns: ${headers.length}`);
        console.log(`Expected columns: 12 (Company Name, Company Link, Hall, Booth, Trade Show, Business Description, Industry, HQ Country, Employees, Revenue, Operating Income, EBITDA)`);

        if (headers.length === 12) {
            console.log(`\n✅ SUCCESS! All fields are present in CSV export!`);
        } else {
            console.log(`\n❌ ISSUE: Expected 12 columns but got ${headers.length}`);
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testExport();

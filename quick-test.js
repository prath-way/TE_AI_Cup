// Quick API test using curl
import { exec } from 'child_process';
import fs from 'fs';

const testCompany = {
    companies: [{
        companyName: "Sample Plastics Ltd",
        companyLink: "https://www.sampleplastics.com",
        source: "Plastindia 2026",
        profile: "Leading plastic manufacturer"
    }]
};

// Save test data
fs.writeFileSync('test-request.json', JSON.stringify(testCompany, null, 2));

console.log('📤 Sending enrichment request to server...\n');
console.log('Test Company: Sample Plastics Ltd');
console.log('Website: https://www.sampleplastics.com\n');

// Make API call
exec('curl -X POST http://localhost:3000/api/enrich-real-data -H "Content-Type: application/json" -d @test-request.json',
    (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error:', error.message);
            return;
        }

        console.log('📥 Response:\n');

        try {
            const response = JSON.parse(stdout);
            if (response.companies && response.companies.length > 0) {
                const company = response.companies[0];
                console.log('✅ Enrichment Results:');
                console.log('─'.repeat(60));
                console.log(`Company Name:       ${company.companyName}`);
                console.log(`Industry:           ${company.industry}`);
                console.log(`HQ Country:         ${company.hqCountry}`);
                console.log(`Employees:          ${company.employees}`);
                console.log(`Revenue:            ${company.revenue}`);
                console.log(`Operating Income:   ${company.operatingIncome}`);
                console.log(`EBITDA:             ${company.ebitda}`);
                console.log(`─`.repeat(60));
                console.log(`Data Source:        ${company.dataSource}`);
                console.log(`Data Confidence:    ${company.dataConfidence}%`);
                console.log('\n✨ Test complete!');
            }
        } catch (e) {
            console.log(stdout);
        }

        // Clean up
        fs.unlinkSync('test-request.json');
    }
);

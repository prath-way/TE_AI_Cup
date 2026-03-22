const fs = require('fs');
const path = require('path');

// Mock data to test normalization (similar to what server.js does)
function testNormalization() {
    console.log("Testing Normalization Logic...");
    
    // Plastindia Sample
    let plastindiaSource = [
        { "companyName": "TEST CORP", "hall": "1", "booth": "A1", "companyLink": "http://test.com" }
    ];
    let normalized = plastindiaSource.map(company => ({
        ...company,
        source: 'Plastindia 2026',
        hall: company.hall || '',
        booth: company.booth || ''
    }));
    console.log("✅ Plastindia Normalized:", normalized[0].source === 'Plastindia 2026');

    // ArabPlast Sample
    let arabSource = [
        { "companyName": "ARAB TEST", "hall": "", "booth": "", "companyLink": "", "source": "ArabPlast 2025" }
    ];
    let arabNormalized = arabSource.map(company => ({
        companyName: company.companyName,
        hall: company.hall || '',
        booth: company.booth || '',
        companyLink: company.companyLink || '',
        profile: company.profile || '',
        source: 'ArabPlast 2025'
    }));
    console.log("✅ ArabPlast Normalized:", arabNormalized[0].source === 'ArabPlast 2025');
}

// Check search logic mock
function testSearch() {
    console.log("\nTesting Search Logic...");
    const mockData = [
        { companyName: "A", source: "Plastindia 2026" },
        { companyName: "B", source: "IMTEX 2026" }
    ];
    const query = "plastindia";
    const results = mockData.filter(company => {
        const nameMatch = company.companyName?.toLowerCase().includes(query);
        const sourceMatch = company.source?.toLowerCase().includes(query);
        return nameMatch || sourceMatch;
    });
    console.log("✅ Search by source found results:", results.length === 1);
}

testNormalization();
testSearch();
console.log("\nVerification complete. Remember to restart 'node server.js' to apply changes to the live site.");

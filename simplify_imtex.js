import fs from "fs";

console.log("🔄 Creating simplified IMTEX data...\n");

// Read the full data
const companies = JSON.parse(fs.readFileSync("imtex_companies.json", "utf-8"));

// Create simplified version with only required fields
const simplifiedCompanies = companies.map(company => ({
    companyName: company.companyName,
    hallNo: company.hallNo,
    boothNo: company.stallNo,  // Using stallNo as boothNo
    companyLink: company.website
}));

// Save simplified data
fs.writeFileSync('imtex_companies_simple.json', JSON.stringify(simplifiedCompanies, null, 2));

console.log(`✅ Created simplified data with ${simplifiedCompanies.length} companies`);
console.log(`📄 Saved to imtex_companies_simple.json\n`);

// Show sample
console.log("Sample companies:");
console.log(JSON.stringify(simplifiedCompanies.slice(0, 5), null, 2));

import fs from "fs";

// This script will process the company data you scraped from the browser
// 
// INSTRUCTIONS:
// 1. Open the browser and go to: https://exhibitors.plastindia.org/ExhList/eDirectoryList
// 2. Open DevTools (F12) and go to Console tab
// 3. Paste the scraping code from HOW_TO_GET_ALL_DATA.md
// 4. Copy the output JSON array
// 5. Paste it into companies.json file (replacing the sample data)
// 6. Run: node fetch.js
// 7. Run: node excel.js

console.log("Ready to process your scraped data!");
console.log("");
console.log("Current status:");

try {
  const data = JSON.parse(fs.readFileSync("companies.json", "utf-8"));
  console.log(`✓ Found ${data.length} companies in companies.json`);
  
  if (data.length === 35) {
    console.log("");
    console.log("⚠️  This appears to be the SAMPLE data (35 companies)");
    console.log("");
    console.log("To get ALL companies:");
    console.log("1. Follow the instructions in HOW_TO_GET_ALL_DATA.md");
    console.log("2. Replace the content of companies.json with your scraped data");
    console.log("3. Run: node excel.js");
  } else {
    console.log("");
    console.log("✓ Ready to generate Excel file!");
    console.log("Run: node excel.js");
  }
} catch (error) {
  console.log("✗ Error reading companies.json");
  console.log(error.message);
}

// ============================================================
// COMPLETE DATA EXTRACTOR FOR PLASTINDIA EXHIBITORS
// ============================================================
// This script extracts ALL company information from the website
// Run this in your browser console (F12 -> Console tab)
// ============================================================

console.log("Starting complete data extraction...");

const companies = [];
let processedCount = 0;

// Find all company sections
document.querySelectorAll('h3').forEach((header) => {
  const companyName = header.textContent.trim();
  
  // Skip invalid entries
  if (!companyName || 
      companyName === 'Company Name' || 
      companyName.length < 2) {
    return;
  }
  
  // Get the parent container with all company info
  let parent = header.closest('div.col-md-12, div.exhibitor-item, section, article');
  if (!parent) parent = header.parentElement;
  
  // Initialize company data
  let hall = '';
  let booth = '';
  let companyLink = '';
  let profile = '';
  
  // Extract Hall and Booth from the specific link format
  const hallBoothLink = parent.querySelector('a[href*="plastindia.org"]');
  if (hallBoothLink) {
    const linkText = hallBoothLink.textContent;
    
    // Extract Hall (format: "HALL-Hall 15")
    const hallMatch = linkText.match(/HALL-(.+?)●/i) || linkText.match(/HALL-(.+?)BOOTH/i);
    if (hallMatch) {
      hall = hallMatch[1].trim();
    }
    
    // Extract Booth (format: "BOOTH-H15-C22")
    const boothMatch = linkText.match(/BOOTH-(\S+)/i);
    if (boothMatch) {
      booth = boothMatch[1].trim();
    }
  }
  
  // If not found, try alternative selectors
  if (!hall || !booth) {
    const allText = parent.textContent;
    if (!hall) {
      const hallAlt = allText.match(/Hall\s+(\d+[A-Z]?)/i);
      if (hallAlt) hall = 'Hall ' + hallAlt[1];
    }
    if (!booth) {
      const boothAlt = allText.match(/Booth[:\s-]+([A-Z0-9-]+)/i);
      if (boothAlt) booth = boothAlt[1];
    }
  }
  
  // Extract company website (external links only)
  const links = parent.querySelectorAll('a[href]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    // Get external links (not plastindia.org)
    if (href.startsWith('http') && 
        !href.includes('plastindia.org') && 
        !href.includes('floorplan')) {
      companyLink = href;
      break;
    }
  }
  
  // Extract company profile/description
  const profileElements = parent.querySelectorAll('p, div.profile, div.description');
  for (const elem of profileElements) {
    const text = elem.textContent.trim();
    // Get meaningful text (longer than 50 chars, not labels)
    if (text.length > 50 && 
        !text.includes('Product Category') &&
        !text.includes('Contact Name') &&
        !text.includes('Industry Segment')) {
      profile = text;
      break;
    }
  }
  
  // Add company to list
  companies.push({
    companyName: companyName,
    hall: hall || 'Not specified',
    booth: booth || 'Not specified',
    companyLink: companyLink || 'Not available',
    profile: profile || 'No profile available'
  });
  
  processedCount++;
  
  // Progress indicator
  if (processedCount % 100 === 0) {
    console.log(`Processed ${processedCount} companies...`);
  }
});

// Remove duplicates based on company name
const uniqueCompanies = [];
const seenNames = new Set();

companies.forEach(company => {
  const key = company.companyName.toLowerCase().trim();
  if (!seenNames.has(key)) {
    seenNames.add(key);
    uniqueCompanies.push(company);
  }
});

// Display results
console.log("\n" + "=".repeat(60));
console.log(`✓ EXTRACTION COMPLETE!`);
console.log(`✓ Total companies found: ${uniqueCompanies.length}`);
console.log(`✓ Companies with hall info: ${uniqueCompanies.filter(c => c.hall !== 'Not specified').length}`);
console.log(`✓ Companies with booth info: ${uniqueCompanies.filter(c => c.booth !== 'Not specified').length}`);
console.log(`✓ Companies with website: ${uniqueCompanies.filter(c => c.companyLink !== 'Not available').length}`);
console.log("=".repeat(60));

// Copy to clipboard (works in most browsers)
const jsonData = JSON.stringify(uniqueCompanies, null, 2);
copy(jsonData);

console.log("\n✓ Data copied to clipboard!");
console.log("\nNEXT STEPS:");
console.log("1. Create file: C:\\Users\\Asus\\OneDrive\\Desktop\\TE\\companies_full.json");
console.log("2. Paste the clipboard content (Ctrl+V)");
console.log("3. Save the file");
console.log("4. Run: node excel.js");
console.log("\nDone! You'll have all companies in Excel format.");

// Also log first few entries as sample
console.log("\nSample data (first 3 companies):");
console.log(JSON.stringify(uniqueCompanies.slice(0, 3), null, 2));

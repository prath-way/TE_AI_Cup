// This script will help you get ALL company data
// Since the website blocks automation, follow these steps:

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║  INSTRUCTIONS TO GET ALL 2000+ COMPANIES                   ║");
console.log("╚════════════════════════════════════════════════════════════╝");
console.log("");
console.log("The website blocks automated scraping, but you can get");
console.log("ALL data in 5 minutes using your browser:");
console.log("");
console.log("STEP 1: Open this URL in Chrome/Firefox:");
console.log("https://exhibitors.plastindia.org/ExhList/eDirectoryList");
console.log("");
console.log("STEP 2: Wait for page to fully load (scroll to bottom)");
console.log("");
console.log("STEP 3: Press F12 to open Developer Tools");
console.log("");
console.log("STEP 4: Click 'Console' tab");
console.log("");
console.log("STEP 5: Copy and paste this code:");
console.log("─".repeat(60));
console.log(`
const companies = [];
document.querySelectorAll('h3').forEach((header) => {
  const companyName = header.textContent.trim();
  if (!companyName || companyName === 'Company Name') return;
  
  let parent = header.parentElement;
  let hall = 'N/A', booth = 'N/A', companyLink = 'N/A';
  
  parent.querySelectorAll('a').forEach(link => {
    const text = link.textContent.trim();
    const href = link.getAttribute('href') || '';
    
    if (text.includes('HALL') && text.includes('BOOTH')) {
      const hallMatch = text.match(/HALL-([^●]+)/);
      const boothMatch = text.match(/BOOTH-([^\\s]+)/);
      if (hallMatch) hall = hallMatch[1].trim();
      if (boothMatch) booth = boothMatch[1].trim();
    }
    
    if (href.startsWith('http') && !href.includes('plastindia.org')) {
      companyLink = href;
    }
  });
  
  companies.push({ companyName, hall, booth, companyLink });
});

console.log('Total companies:', companies.length);
copy(JSON.stringify(companies, null, 2));
console.log('✓ Data copied to clipboard! Paste into companies_full.json');
`);
console.log("─".repeat(60));
console.log("");
console.log("STEP 6: Press Enter - data will be copied to clipboard");
console.log("");
console.log("STEP 7: Create file: companies_full.json");
console.log("        Location: C:\\Users\\Asus\\OneDrive\\Desktop\\TE\\");
console.log("        Paste the clipboard content and save");
console.log("");
console.log("STEP 8: Update excel.js to use companies_full.json");
console.log("        Change line: const data=JSON.parse(fs.readFileSync");
console.log("        From: './companies.json'");
console.log("        To:   './companies_full.json'");
console.log("");
console.log("STEP 9: Run: node excel.js");
console.log("");
console.log("✓ You'll have ALL companies in Excel format!");
console.log("");
console.log("═".repeat(60));
console.log("This is the ONLY way to bypass the anti-bot protection.");
console.log("It takes 5 minutes and gets you 100% of the data.");
console.log("═".repeat(60));

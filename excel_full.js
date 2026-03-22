import ExcelJS from "exceljs";
import fs from "fs";

console.log("Reading companies_full.json...");
const companies = JSON.parse(fs.readFileSync("companies_full.json", "utf-8"));

console.log(`Found ${companies.length} companies`);
console.log("Creating Excel workbook...");

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("Companies");

// Define columns
worksheet.columns = [
  { header: "Company Name", key: "companyName", width: 40 },
  { header: "Hall", key: "hall", width: 15 },
  { header: "Booth", key: "booth", width: 15 },
  { header: "Company Link", key: "companyLink", width: 50 },
  { header: "Profile", key: "profile", width: 80 }
];

// Style the header row
worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
worksheet.getRow(1).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF4472C4" }
};
worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

// Add data rows
console.log("Adding company data...");
companies.forEach((company, index) => {
  const row = worksheet.addRow(company);
  
  // Add alternating row colors for better readability
  if (index % 2 === 0) {
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF2F2F2" }
    };
  }
  
  // Make company links clickable
  if (company.companyLink) {
    const linkCell = row.getCell("companyLink");
    linkCell.value = {
      text: company.companyLink,
      hyperlink: company.companyLink
    };
    linkCell.font = { color: { argb: "FF0563C1" }, underline: true };
  }
});

// Auto-filter on all columns
worksheet.autoFilter = {
  from: "A1",
  to: `E${companies.length + 1}`
};

// Freeze the header row
worksheet.views = [
  { state: "frozen", xSplit: 0, ySplit: 1 }
];

console.log("Saving Excel file...");
await workbook.xlsx.writeFile("companies_full.xlsx");

console.log("\n✅ SUCCESS!");
console.log(`📊 Excel file created: companies_full.xlsx`);
console.log(`📈 Total companies: ${companies.length}`);
console.log(`📁 Location: ${process.cwd()}\\companies_full.xlsx`);
console.log("\n🎉 You can now open the Excel file!");

import ExcelJS from "exceljs";
import fs from "fs";

console.log("📊 Creating simplified Excel file for IMTEX exhibitors...\n");

const companies = JSON.parse(fs.readFileSync("imtex_companies_simple.json", "utf-8"));

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("IMTEX Exhibitors");

// Define columns - only 4 fields
worksheet.columns = [
    { header: "Company Name", key: "companyName", width: 50 },
    { header: "Hall No", key: "hallNo", width: 15 },
    { header: "Booth No", key: "boothNo", width: 15 },
    { header: "Company Link", key: "companyLink", width: 50 }
];

// Style header row
worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" }
};
worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

// Add data rows
companies.forEach((company, index) => {
    const row = worksheet.addRow(company);

    // Alternating row colors
    if (index % 2 === 0) {
        row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2F2F2" }
        };
    }

    // Make links clickable
    if (company.companyLink) {
        const linkCell = row.getCell("companyLink");
        const url = company.companyLink.startsWith('http') ? company.companyLink : `http://${company.companyLink}`;
        linkCell.value = {
            text: company.companyLink,
            hyperlink: url
        };
        linkCell.font = { color: { argb: "FF0563C1" }, underline: true };
    }
});

// Auto-filter
worksheet.autoFilter = {
    from: "A1",
    to: `D${companies.length + 1}`
};

// Freeze header row
worksheet.views = [
    { state: "frozen", xSplit: 0, ySplit: 1 }
];

// Save file
await workbook.xlsx.writeFile("imtex_exhibitors_simple.xlsx");

console.log("✅ SUCCESS!");
console.log(`📊 Excel file created: imtex_exhibitors_simple.xlsx`);
console.log(`📈 Total companies: ${companies.length}`);
console.log(`📁 Columns: Company Name, Hall No, Booth No, Company Link`);
console.log(`📁 Location: ${process.cwd()}\\imtex_exhibitors_simple.xlsx`);
console.log("\n🎉 You can now open the Excel file!");

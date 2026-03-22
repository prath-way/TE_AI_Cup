import ExcelJS from "exceljs";
import fs from "fs";

console.log("📊 Creating Excel file for IMTEX exhibitors...\n");

const companies = JSON.parse(fs.readFileSync("imtex_companies.json", "utf-8"));

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("IMTEX Exhibitors");

// Define columns
worksheet.columns = [
    { header: "Sl No", key: "slNo", width: 10 },
    { header: "Company Name", key: "companyName", width: 50 },
    { header: "Hall No", key: "hallNo", width: 12 },
    { header: "Stall No", key: "stallNo", width: 12 },
    { header: "Country", key: "country", width: 20 },
    { header: "Website", key: "website", width: 50 }
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
    if (company.website) {
        const linkCell = row.getCell("website");
        linkCell.value = {
            text: company.website,
            hyperlink: company.website.startsWith('http') ? company.website : `http://${company.website}`
        };
        linkCell.font = { color: { argb: "FF0563C1" }, underline: true };
    }
});

// Auto-filter
worksheet.autoFilter = {
    from: "A1",
    to: `F${companies.length + 1}`
};

// Freeze header row
worksheet.views = [
    { state: "frozen", xSplit: 0, ySplit: 1 }
];

// Save file
await workbook.xlsx.writeFile("imtex_exhibitors.xlsx");

console.log("✅ SUCCESS!");
console.log(`📊 Excel file created: imtex_exhibitors.xlsx`);
console.log(`📈 Total companies: ${companies.length}`);
console.log(`📁 Location: ${process.cwd()}\\imtex_exhibitors.xlsx`);
console.log("\n🎉 You can now open the Excel file!");

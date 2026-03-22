import Excel from "exceljs";
import fs from "fs";

// Read JSON file using fs instead of import assertion
const data=JSON.parse(fs.readFileSync("./companies.json","utf-8"));

const wb=new Excel.Workbook();
const ws=wb.addWorksheet("Companies");

// Update columns to include company link
ws.columns=[
 {header:"Company Name",key:"companyName",width:50},
 {header:"Hall",key:"hall",width:15},
 {header:"Booth",key:"booth",width:15},
 {header:"Company Link",key:"companyLink",width:40},
 {header:"Profile",key:"profile",width:80}
];

data.forEach(x=>ws.addRow(x));

// Style the header row
ws.getRow(1).font={bold:true};
ws.getRow(1).fill={
  type:'pattern',
  pattern:'solid',
  fgColor:{argb:'FFD3D3D3'}
};

await wb.xlsx.writeFile("companies.xlsx");

console.log(`Excel created with ${data.length} companies`);

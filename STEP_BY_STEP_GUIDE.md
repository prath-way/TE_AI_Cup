# 📋 Complete Step-by-Step Guide to Generate Excel File

## ✅ What You Have
- **companies_full.json** - Contains **1,830 companies** scraped from the website
- **excel.js** - Script to convert JSON to Excel format

## 🎯 Goal
Generate a formatted Excel file with all 1,830 companies including:
- Company Name
- Hall Number
- Booth Number
- Company Link/URL
- Company Profile

---

## 📝 Steps to Generate Excel File

### Step 1: Update the Excel Script
Run this command to update `excel.js` to use `companies_full.json`:

```bash
node -e "const fs=require('fs'); const script='import ExcelJS from \"exceljs\";\\nimport fs from \"fs\";\\n\\nconst companies=JSON.parse(fs.readFileSync(\"companies_full.json\",\"utf-8\"));\\nconst workbook=new ExcelJS.Workbook();\\nconst worksheet=workbook.addWorksheet(\"Companies\");\\nworksheet.columns=[{header:\"Company Name\",key:\"companyName\",width:40},{header:\"Hall\",key:\"hall\",width:15},{header:\"Booth\",key:\"booth\",width:15},{header:\"Company Link\",key:\"companyLink\",width:50},{header:\"Profile\",key:\"profile\",width:80}];\\nworksheet.getRow(1).font={bold:true};\\nworksheet.getRow(1).fill={type:\"pattern\",pattern:\"solid\",fgColor:{argb:\"FF4472C4\"}};\\nworksheet.getRow(1).font={bold:true,color:{argb:\"FFFFFFFF\"}};\\ncompanies.forEach(company=\u003e{worksheet.addRow(company)});\\nawait workbook.xlsx.writeFile(\"companies_full.xlsx\");\\nconsole.log(`Excel created with ${companies.length} companies`);'; fs.writeFileSync('excel_full.js', script);"
```

### Step 2: Generate the Excel File
Run this command:

```bash
node excel_full.js
```

### Step 3: Verify the Output
You should see:
```
Excel created with 1830 companies
```

### Step 4: Open the Excel File
The file `companies_full.xlsx` will be created in the same folder.

---

## 🚀 Quick One-Command Solution

If you want to do everything in one step, just run:

```bash
node excel_full.js
```

(The script is already created and ready to use!)

---

## 📊 What You'll Get

**File:** `companies_full.xlsx`

**Columns:**
1. **Company Name** - Name of the company
2. **Hall** - Hall number (e.g., "Hall 1F")
3. **Booth** - Booth number (e.g., "H5FC2")
4. **Company Link** - Website URL
5. **Profile** - Company description/profile

**Total Rows:** 1,830 companies + 1 header row = 1,831 rows

---

## ✅ Checklist

- [x] You have companies_full.json with 1,830 companies
- [ ] Run: `node excel_full.js`
- [ ] Verify: `companies_full.xlsx` is created
- [ ] Open and review the Excel file

---

## 🆘 Troubleshooting

### Error: "Cannot find module 'exceljs'"
Run: `npm install exceljs`

### Error: "Cannot find companies_full.json"
Make sure you're in the correct directory: `C:\Users\Asus\OneDrive\Desktop\TE`

### Excel file is empty
Check if companies_full.json has valid data by running:
```bash
node -e "console.log(require('./companies_full.json').length)"
```

---

## 🎉 Done!
Once you run the command, you'll have a beautifully formatted Excel file with all 1,830 companies ready to use!
